/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { schema } from '@kbn/config-schema';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { KibanaRequest, SavedObject } from '@kbn/core/server';
import {
  API_VERSIONS,
  EVALS_EVALUATOR_REVIEW_AGREEMENT_URL,
  EVALS_REVIEW_QUEUES_URL,
  EVALS_REVIEW_QUEUE_AGREEMENT_URL,
  EVALS_REVIEW_QUEUE_ITEM_URL,
  EVALS_REVIEW_QUEUE_NEXT_URL,
  EVALS_REVIEW_QUEUE_URL,
  INTERNAL_API_ACCESS,
  MAX_EVALUATOR_NAME_LENGTH,
  MAX_EVALUATOR_VERSION_LENGTH,
  MAX_REVIEW_QUEUE_SAMPLE_SIZE,
  MAX_REVIEW_RATIONALE_LENGTH,
  MAX_REVIEW_RUBRIC_LENGTH,
  REVIEW_FAIL_LABEL,
  REVIEW_PASS_LABEL,
  type BlindReviewItem,
  type EvaluatorReviewAgreement,
  type ReviewQueueWithCounts,
  type RevealedReviewItem,
} from '@kbn/evals-common';
import { EVALS_API_PRIVILEGES, MAX_ID_LENGTH, MAX_NAME_LENGTH } from '../../../common';
import {
  EVALS_REVIEW_QUEUE_SAVED_OBJECT_TYPE,
  type EvalsReviewQueueAttributes,
} from '../../saved_objects/review_queue';
import { ReviewItemAlreadyReviewedError } from '../../storage/reviews/review_item_already_reviewed_error';
import { ReviewItemNotFoundError } from '../../storage/reviews/review_item_not_found_error';
import type { ReviewItem } from '../../storage/reviews/review_client';
import type { RouteDependencies } from '../register_routes';
import { getEsErrorLogDetails } from '../utils/get_es_error_log_details';
import { computeItemsAgreement, computeQueueAgreement, majorVersionOf } from './queue_agreement';
import { sampleScores } from './sampler';

const MAX_LISTED_QUEUES = 100;

const QueueParamsSchema = schema.object({
  queueId: schema.string({ minLength: 1, maxLength: MAX_ID_LENGTH }),
});

const ItemParamsSchema = schema.object({
  queueId: schema.string({ minLength: 1, maxLength: MAX_ID_LENGTH }),
  itemId: schema.string({ minLength: 1, maxLength: MAX_ID_LENGTH + 16 }),
});

const CreateQueueBodySchema = schema.object({
  name: schema.string({ minLength: 1, maxLength: MAX_NAME_LENGTH }),
  source_filter: schema.object({
    source: schema.oneOf([schema.literal('experiment'), schema.literal('online')]),
    experiment_id: schema.maybe(schema.string({ minLength: 1, maxLength: MAX_ID_LENGTH })),
    monitor_id: schema.maybe(schema.string({ minLength: 1, maxLength: MAX_ID_LENGTH })),
  }),
  evaluator_name: schema.string({ minLength: 1, maxLength: MAX_EVALUATOR_NAME_LENGTH }),
  evaluator_version: schema.string({ minLength: 1, maxLength: MAX_EVALUATOR_VERSION_LENGTH }),
  sample_size: schema.number({ min: 1, max: MAX_REVIEW_QUEUE_SAMPLE_SIZE, validate: validateInt }),
  strategy: schema.oneOf([schema.literal('uniform'), schema.literal('stratified_by_label')]),
  rubric: schema.string({ maxLength: MAX_REVIEW_RUBRIC_LENGTH }),
});

const SubmitVerdictBodySchema = schema.object({
  label: schema.maybe(
    schema.oneOf([schema.literal(REVIEW_PASS_LABEL), schema.literal(REVIEW_FAIL_LABEL)])
  ),
  value: schema.maybe(schema.number({ min: -1_000_000, max: 1_000_000 })),
  rationale: schema.maybe(schema.string({ maxLength: MAX_REVIEW_RATIONALE_LENGTH })),
  skip: schema.maybe(schema.boolean()),
});

function validateInt(value: number): string | undefined {
  return Number.isInteger(value) ? undefined : 'must be an integer';
}

const toBlindItem = (item: ReviewItem): BlindReviewItem => ({
  id: item.id,
  queue_id: item.queue_id,
  status: item.status,
  position: item.position,
  source: item.source,
  evaluator: item.evaluator,
});

const toRevealedItem = (item: ReviewItem): RevealedReviewItem => ({
  ...toBlindItem(item),
  score: item.score,
  ...(item.human ? { human: item.human } : {}),
});

const toQueue = (so: SavedObject<EvalsReviewQueueAttributes>) => ({
  id: so.id,
  ...so.attributes,
});

export const registerReviewQueueRoutes = ({
  router,
  logger,
  getSpaceId,
  getCurrentUsername,
  getCurrentProfileUid,
  getInternalReviewQueuesSoClient,
}: RouteDependencies) => {
  const resolveSpaceId = (request: KibanaRequest) =>
    getSpaceId ? getSpaceId(request) : Promise.resolve(DEFAULT_SPACE_ID);

  const reviewAuthz = { authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.review] } };

  const fail = (
    response: Parameters<Parameters<ReturnType<typeof router.versioned.get>['addVersion']>[1]>[2],
    error: unknown,
    action: string
  ) => {
    if (SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
      return response.notFound({ body: { message: 'Review queue not found' } });
    }
    if (error instanceof ReviewItemNotFoundError) {
      return response.notFound({ body: { message: error.message } });
    }
    if (error instanceof ReviewItemAlreadyReviewedError) {
      return response.conflict({ body: { message: error.message } });
    }
    const { message, meta } = getEsErrorLogDetails(error);
    logger.error(`Failed to ${action}: ${message}`, meta);
    return response.customError({ statusCode: 500, body: { message: `Failed to ${action}` } });
  };

  router.versioned
    .post({
      path: EVALS_REVIEW_QUEUES_URL,
      access: INTERNAL_API_ACCESS,
      security: reviewAuthz,
      summary: 'Create a human review queue sampled from judge scores',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: { request: { body: CreateQueueBodySchema } },
      },
      async (context, request, response) => {
        const { body } = request;
        let createdQueueId: string | undefined;
        try {
          const spaceId = await resolveSpaceId(request);
          const evalsContext = await context.evals;
          const soClient = await getInternalReviewQueuesSoClient();
          const queueId = uuidv4();

          const items = await sampleScores({
            evaluationScoreService: evalsContext.evaluationScoreService,
            onlineScoreService: evalsContext.onlineScoreService,
            queueId,
            spaceId,
            sourceFilter: body.source_filter,
            evaluator: { name: body.evaluator_name, version: body.evaluator_version },
            sampleSize: body.sample_size,
            strategy: body.strategy,
          });

          if (items.length === 0) {
            return response.badRequest({
              body: {
                message:
                  'No scores with a trace match this source and evaluator version, so there is nothing to review',
              },
            });
          }

          const createdBy = getCurrentUsername ? await getCurrentUsername(request) : undefined;
          const attributes: EvalsReviewQueueAttributes = {
            name: body.name,
            source_filter: body.source_filter,
            evaluator_name: body.evaluator_name,
            evaluator_version: body.evaluator_version,
            sample_size: body.sample_size,
            strategy: body.strategy,
            rubric: body.rubric,
            ...(createdBy ? { created_by: createdBy } : {}),
            created_at: new Date().toISOString(),
          };

          const created = await soClient.create(EVALS_REVIEW_QUEUE_SAVED_OBJECT_TYPE, attributes, {
            id: queueId,
            namespace: spaceId,
          });
          createdQueueId = created.id;

          await evalsContext.reviewService
            .getClient({ spaceId })
            .createPendingItems(queueId, items);

          const queue: ReviewQueueWithCounts = {
            ...toQueue(created),
            counts: { pending: items.length, reviewed: 0, skipped: 0 },
          };
          return response.ok({ body: queue });
        } catch (error) {
          if (createdQueueId) {
            // The queue holds no items, so it would list as an empty queue nobody can review.
            await (
              await getInternalReviewQueuesSoClient()
            )
              .delete(EVALS_REVIEW_QUEUE_SAVED_OBJECT_TYPE, createdQueueId, {
                namespace: await resolveSpaceId(request),
              })
              .catch(() => undefined);
          }
          return fail(response, error, 'create review queue');
        }
      }
    );

  router.versioned
    .get({
      path: EVALS_REVIEW_QUEUES_URL,
      access: INTERNAL_API_ACCESS,
      security: reviewAuthz,
      summary: 'List human review queues',
    })
    .addVersion({ version: API_VERSIONS.internal.v1, validate: false }, async (ctx, req, res) => {
      try {
        const spaceId = await resolveSpaceId(req);
        const evalsContext = await ctx.evals;
        const soClient = await getInternalReviewQueuesSoClient();
        const found = await soClient.find<EvalsReviewQueueAttributes>({
          type: EVALS_REVIEW_QUEUE_SAVED_OBJECT_TYPE,
          namespaces: [spaceId],
          perPage: MAX_LISTED_QUEUES,
          sortField: 'created_at',
          sortOrder: 'desc',
        });
        const reviews = evalsContext.reviewService.getClient({ spaceId });
        const queues: ReviewQueueWithCounts[] = await Promise.all(
          found.saved_objects.map(async (so) => ({
            ...toQueue(so),
            counts: await reviews.countByStatus(so.id),
          }))
        );
        return res.ok({ body: { queues } });
      } catch (error) {
        return fail(res, error, 'list review queues');
      }
    });

  router.versioned
    .get({
      path: EVALS_REVIEW_QUEUE_URL,
      access: INTERNAL_API_ACCESS,
      security: reviewAuthz,
      summary: 'Get a human review queue',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: { request: { params: QueueParamsSchema } },
      },
      async (ctx, req, res) => {
        try {
          const spaceId = await resolveSpaceId(req);
          const evalsContext = await ctx.evals;
          const so = await (
            await getInternalReviewQueuesSoClient()
          ).get<EvalsReviewQueueAttributes>(
            EVALS_REVIEW_QUEUE_SAVED_OBJECT_TYPE,
            req.params.queueId,
            {
              namespace: spaceId,
            }
          );
          const counts = await evalsContext.reviewService
            .getClient({ spaceId })
            .countByStatus(so.id);
          return res.ok({ body: { ...toQueue(so), counts } });
        } catch (error) {
          return fail(res, error, 'get review queue');
        }
      }
    );

  router.versioned
    .get({
      path: EVALS_REVIEW_QUEUE_NEXT_URL,
      access: INTERNAL_API_ACCESS,
      security: reviewAuthz,
      summary: 'Get the next pending item of a human review queue',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: { request: { params: QueueParamsSchema } },
      },
      async (ctx, req, res) => {
        try {
          const spaceId = await resolveSpaceId(req);
          const evalsContext = await ctx.evals;
          await (
            await getInternalReviewQueuesSoClient()
          ).get(EVALS_REVIEW_QUEUE_SAVED_OBJECT_TYPE, req.params.queueId, { namespace: spaceId });
          const item = await evalsContext.reviewService
            .getClient({ spaceId })
            .getNextPending(req.params.queueId);
          // The judge's score is left out until the reviewer submits, so it cannot anchor them.
          return res.ok({ body: { item: item ? toBlindItem(item) : null } });
        } catch (error) {
          return fail(res, error, 'get the next review item');
        }
      }
    );

  router.versioned
    .post({
      path: EVALS_REVIEW_QUEUE_ITEM_URL,
      access: INTERNAL_API_ACCESS,
      security: reviewAuthz,
      summary: 'Submit a human verdict for a review item',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: { request: { params: ItemParamsSchema, body: SubmitVerdictBodySchema } },
      },
      async (ctx, req, res) => {
        const { label, value, rationale, skip } = req.body;
        if (!skip && label === undefined && value === undefined) {
          return res.badRequest({
            body: { message: 'A verdict needs a label or a score, or the item must be skipped' },
          });
        }
        try {
          const spaceId = await resolveSpaceId(req);
          const evalsContext = await ctx.evals;
          await (
            await getInternalReviewQueuesSoClient()
          ).get(EVALS_REVIEW_QUEUE_SAVED_OBJECT_TYPE, req.params.queueId, { namespace: spaceId });
          const reviewerProfileUid = getCurrentProfileUid
            ? await getCurrentProfileUid(req)
            : undefined;
          const item = await evalsContext.reviewService.getClient({ spaceId }).submitVerdict(
            req.params.queueId,
            req.params.itemId,
            {
              ...(skip ? {} : { label, value }),
              ...(rationale ? { rationale } : {}),
              ...(reviewerProfileUid ? { reviewer_profile_uid: reviewerProfileUid } : {}),
            },
            skip ? 'skipped' : 'reviewed'
          );
          return res.ok({ body: { item: toRevealedItem(item) } });
        } catch (error) {
          return fail(res, error, 'submit the review verdict');
        }
      }
    );

  router.versioned
    .get({
      path: EVALS_REVIEW_QUEUE_AGREEMENT_URL,
      access: INTERNAL_API_ACCESS,
      security: reviewAuthz,
      summary: 'Get judge-versus-human agreement for a human review queue',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: { request: { params: QueueParamsSchema } },
      },
      async (ctx, req, res) => {
        try {
          const spaceId = await resolveSpaceId(req);
          const evalsContext = await ctx.evals;
          const so = await (
            await getInternalReviewQueuesSoClient()
          ).get<EvalsReviewQueueAttributes>(
            EVALS_REVIEW_QUEUE_SAVED_OBJECT_TYPE,
            req.params.queueId,
            {
              namespace: spaceId,
            }
          );
          const reviews = evalsContext.reviewService.getClient({ spaceId });
          const [items, counts] = await Promise.all([
            reviews.listItems(so.id, 'reviewed'),
            reviews.countByStatus(so.id),
          ]);
          return res.ok({
            body: computeQueueAgreement(items, {
              queue_id: so.id,
              evaluator: {
                name: so.attributes.evaluator_name,
                version: so.attributes.evaluator_version,
              },
              counts,
            }),
          });
        } catch (error) {
          return fail(res, error, 'compute review agreement');
        }
      }
    );

  router.versioned
    .get({
      path: EVALS_EVALUATOR_REVIEW_AGREEMENT_URL,
      access: INTERNAL_API_ACCESS,
      security: reviewAuthz,
      summary: 'Get judge-versus-human agreement for an evaluator, pooled within one major version',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: schema.object({
              name: schema.string({ minLength: 1, maxLength: MAX_EVALUATOR_NAME_LENGTH }),
            }),
            query: schema.object({
              version: schema.string({ minLength: 1, maxLength: MAX_EVALUATOR_VERSION_LENGTH }),
            }),
          },
        },
      },
      async (ctx, req, res) => {
        try {
          const major = majorVersionOf(req.query.version);
          if (major === undefined) {
            return res.badRequest({
              body: {
                message: `"${req.query.version}" does not start with a major version number`,
              },
            });
          }
          const spaceId = await resolveSpaceId(req);
          const evalsContext = await ctx.evals;
          const soClient = await getInternalReviewQueuesSoClient();
          const found = await soClient.find<EvalsReviewQueueAttributes>({
            type: EVALS_REVIEW_QUEUE_SAVED_OBJECT_TYPE,
            namespaces: [spaceId],
            perPage: MAX_LISTED_QUEUES,
            sortField: 'created_at',
            sortOrder: 'desc',
          });
          // Matched in code rather than in a saved-object filter, so a name is never spliced
          // into a KQL string.
          const matching = found.saved_objects.filter(
            (so) =>
              so.attributes.evaluator_name === req.params.name &&
              majorVersionOf(so.attributes.evaluator_version) === major
          );
          const reviews = evalsContext.reviewService.getClient({ spaceId });
          const items = (
            await Promise.all(matching.map((so) => reviews.listItems(so.id, 'reviewed')))
          ).flat();
          const body: EvaluatorReviewAgreement = {
            evaluator_name: req.params.name,
            version_major: major,
            queue_count: matching.length,
            ...computeItemsAgreement(items),
          };
          return res.ok({ body });
        } catch (error) {
          return fail(res, error, 'compute evaluator review agreement');
        }
      }
    );
};
