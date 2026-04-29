/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import {
  ATTACHMENT_REF_ACTOR,
  type VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import { internalApiPath } from '../../../common/constants';
import {
  SML_HTTP_ATTACH_ITEMS_MAX,
  SML_HTTP_SEARCH_QUERY_MAX_LENGTH,
  type SmlAttachHttpResponse,
  type SmlAttachHttpResultItem,
  type SmlSearchHttpResponse,
} from '../../../common/http_api/sml';
import { AGENT_BUILDER_READ_SECURITY, AGENT_BUILDER_WRITE_SECURITY } from '../route_security';
import { resolveSmlAttachItems } from '../../services/sml/execute_sml_attach_items';
import { applyAttachmentRefsToRounds } from '../../services/conversation/client/migrate_attachments';
import { SML_CRAWLER_TASK_TYPE } from '../../services/sml/sml_task_definitions';
import { smlCrawlerStateIndexName } from '../../services/sml/sml_crawler_state_storage';
import { smlIndexName } from '../../services/sml/sml_storage';

/** Max page size for SML HTTP search (separate from default UI size). */
const SML_SEARCH_SIZE_MAX = 1000;

const CONTENT_PREVIEW_LENGTH = 200;

const MEMORY_INSTRUCTIONS = `\
## MEMORY CONTEXT

The following are memories from past conversations that may be relevant to the current question. \
Treat them as things you remember from previous interactions — refer to them as memories \
("I remember that..." / "In a previous conversation...") rather than as freshly retrieved data \
("I found that..." / "According to the search results...").

You can use \`sml_search\` to search for additional relevant memories, and \`sml_read\` with a \
chunk_id to retrieve the full content of any memory where has_more is true.`;

const buildMemoryPrompt = (
  items: Array<{ id: string; type: string; origin_id: string; title: string; score: number; content?: string }>
): string => {
  const lines: string[] = ['<kibana_sml_memory>', MEMORY_INSTRUCTIONS, '---'];

  for (const item of items) {
    const content = item.content?.trim() ?? '';
    const hasMore = content.length > CONTENT_PREVIEW_LENGTH;
    const preview = hasMore ? content.slice(0, CONTENT_PREVIEW_LENGTH) + ' …' : content;

    lines.push(
      `### ${item.title}\n` +
        `chunk_id: ${item.id} | type: ${item.type} | origin_id: ${item.origin_id} | ` +
        `score: ${item.score.toFixed(3)} | has_more: ${hasMore}`
    );
    if (preview) {
      lines.push(preview);
    }
    lines.push('---');
  }

  lines.push('</kibana_sml_memory>');
  return lines.join('\n');
};

const mergeAttachmentsById = (
  latestAttachments: VersionedAttachment[],
  stateManagerAttachments: VersionedAttachment[]
) => {
  const mergedAttachments = new Map<string, VersionedAttachment>();

  for (const attachment of stateManagerAttachments) {
    mergedAttachments.set(attachment.id, attachment);
  }

  for (const attachment of latestAttachments) {
    mergedAttachments.set(attachment.id, attachment);
  }

  return Array.from(mergedAttachments.values());
};

export function registerInternalSmlRoutes({
  router,
  getInternalServices,
  logger,
  coreSetup,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.post(
    {
      path: `${internalApiPath}/sml/_search`,
      validate: {
        body: schema.object({
          query: schema.string({ minLength: 1, maxLength: SML_HTTP_SEARCH_QUERY_MAX_LENGTH }),
          size: schema.maybe(schema.number({ min: 1, max: SML_SEARCH_SIZE_MAX })),
          skip_content: schema.maybe(schema.boolean()),
          type: schema.maybe(schema.string()),
          min_score: schema.maybe(schema.number({ min: 0, max: 1 })),
          include_prompt: schema.maybe(schema.boolean()),
        }),
      },
      options: { access: 'internal' },
      security: AGENT_BUILDER_READ_SECURITY,
    },
    wrapHandler(
      async (ctx, request, response) => {
        const { sml } = getInternalServices();
        const {
          query,
          size,
          skip_content: skipContent,
          type: typeFilter,
          min_score: minScore,
          include_prompt: includePrompt,
        } = request.body;
        const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
        const spaceId = (await ctx.agentBuilder).spaces.getSpaceId();

        const { results: rawResults, total } = await sml.search({
          query,
          size,
          spaceId,
          esClient,
          request,
          skipContent,
          type: typeFilter,
        });

        const results =
          minScore != null ? rawResults.filter((r) => r.score >= minScore) : rawResults;

        const mappedResults = results.map(
          ({ id, type, origin_id, title, score, content, created_at, attachable }) => {
            const fullContent = content ?? '';
            const hasMore = fullContent.length > CONTENT_PREVIEW_LENGTH;
            return {
              chunk_id: id,
              id,
              type,
              item_id: origin_id,
              origin_id,
              title,
              score,
              has_more: hasMore,
              created_at,
              attachable,
              ...(skipContent ? {} : { content }),
            };
          }
        );

        const body: SmlSearchHttpResponse = {
          total: minScore != null ? mappedResults.length : total,
          results: mappedResults,
          ...(includePrompt ? { prompt: buildMemoryPrompt(results) } : {}),
        };

        return response.ok({ body });
      },
      {
        featureFlag: AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
      }
    )
  );

  router.post(
    {
      path: `${internalApiPath}/sml/_attach`,
      validate: {
        body: schema.object({
          conversation_id: schema.string(),
          chunk_ids: schema.arrayOf(schema.string(), {
            minSize: 1,
            maxSize: SML_HTTP_ATTACH_ITEMS_MAX,
          }),
        }),
      },
      options: { access: 'internal' },
      security: AGENT_BUILDER_WRITE_SECURITY,
    },
    wrapHandler(
      async (ctx, request, response) => {
        const {
          sml,
          conversations: conversationsService,
          attachments: attachmentsService,
        } = getInternalServices();
        const { conversation_id: conversationId, chunk_ids: chunkIds } = request.body;
        const [coreStart] = await coreSetup.getStartServices();
        const spaceId = (await ctx.agentBuilder).spaces.getSpaceId();
        const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
        const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
        const conversationClient = await conversationsService.getScopedClient({ request });

        const conversationForAttach = await conversationClient.get(conversationId);
        if (conversationForAttach.rounds.length === 0) {
          return response.badRequest({
            body: {
              message: `Conversation '${conversationId}' has no rounds — cannot attach SML items without an existing round`,
            },
          });
        }

        const resolvedItems = await resolveSmlAttachItems({
          chunkIds,
          sml,
          esClient,
          request,
          spaceId,
          savedObjectsClient,
          logger,
        });

        const stateManager = createAttachmentStateManager(conversationForAttach.attachments ?? [], {
          getTypeDefinition: attachmentsService.getTypeDefinition,
        });

        // Format the results for the HTTP API
        const resultItems = await Promise.all(
          resolvedItems.map(async (r): Promise<SmlAttachHttpResultItem> => {
            if (!r.success) {
              return {
                success: false,
                chunk_id: r.chunk_id,
                attachment_type: r.attachment_type,
                message: r.message,
              };
            }

            try {
              const added = await stateManager.add(r.attachment, ATTACHMENT_REF_ACTOR.system, {
                request,
                spaceId,
                savedObjectsClient,
              });

              return {
                success: true,
                chunk_id: r.chunk_id,
                conversation_attachment_id: added.id,
                attachment_type: r.attachment.type,
                message: `Attachment '${added.id}' of type '${r.attachment.type}' created from SML item '${r.chunk_id}'`,
              };
            } catch (e) {
              return {
                success: false,
                chunk_id: r.chunk_id,
                attachment_type: r.attachment.type,
                message: e instanceof Error ? e.message : String(e),
              };
            }
          })
        );

        // Update the conversation with the new attachments
        if (resultItems.some((r) => r.success)) {
          const latestConversation = await conversationClient.get(conversationId);
          const newRefs = stateManager.getAccessedRefs();

          const lastRoundIndex = latestConversation.rounds.length - 1;
          const updatedRounds = applyAttachmentRefsToRounds(
            latestConversation.rounds,
            new Map([[lastRoundIndex, newRefs]])
          );
          // Merge attachments to prevent duplication or overwriting older attachments
          const mergedAttachments = mergeAttachmentsById(
            latestConversation.attachments ?? [],
            stateManager.getAll()
          );

          await conversationClient.update({
            id: conversationId,
            attachments: mergedAttachments,
            rounds: updatedRounds,
          });
        }

        const body: SmlAttachHttpResponse = { results: resultItems };

        return response.ok({ body });
      },
      {
        featureFlag: AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
      }
    )
  );

  router.get(
    {
      path: `${internalApiPath}/sml/crawlers`,
      validate: {},
      options: { access: 'internal' },
      security: AGENT_BUILDER_READ_SECURITY,
    },
    wrapHandler(async (ctx, request, response) => {
      const { sml } = getInternalServices();
      const crawlers = sml.listTypeDefinitions().map((def) => ({
        type_id: def.id,
        fetch_frequency: def.fetchFrequency?.() ?? '10m',
      }));
      return response.ok({ body: { crawlers } });
    })
  );

  router.post(
    {
      path: `${internalApiPath}/sml/crawlers/{type_id}/_activate`,
      validate: {
        params: schema.object({
          type_id: schema.string(),
        }),
      },
      options: { access: 'internal' },
      security: AGENT_BUILDER_WRITE_SECURITY,
    },
    wrapHandler(async (ctx, request, response) => {
      const { sml } = getInternalServices();
      const typeId = request.params.type_id;

      const definition = sml.getTypeDefinition(typeId);
      if (!definition) {
        return response.notFound({
          body: {
            message: `SML type '${typeId}' not found. Available types: [${sml
              .listTypeDefinitions()
              .map((t) => t.id)
              .join(', ')}]`,
          },
        });
      }

      const [, startDeps] = await coreSetup.getStartServices();
      const taskManager = startDeps.taskManager;
      const taskId = `${SML_CRAWLER_TASK_TYPE}:${typeId}`;
      const interval = definition.fetchFrequency?.() ?? '10m';

      await taskManager.removeIfExists(taskId);

      await taskManager.schedule(
        {
          id: taskId,
          taskType: SML_CRAWLER_TASK_TYPE,
          params: { attachmentType: typeId },
          schedule: { interval },
          scope: ['agentBuilder'],
          state: {},
        },
        { request }
      );

      logger.info(
        `SML crawler for type '${typeId}' activated with admin API key (interval: ${interval})`
      );

      return response.ok({
        body: { activated: true, type_id: typeId },
      });
    })
  );

  router.post(
    {
      path: `${internalApiPath}/sml/crawlers/{type_id}/_run`,
      validate: {
        params: schema.object({
          type_id: schema.string(),
        }),
      },
      options: { access: 'internal' },
      security: AGENT_BUILDER_WRITE_SECURITY,
    },
    wrapHandler(async (ctx, request, response) => {
      const { sml } = getInternalServices();
      const typeId = request.params.type_id;

      if (!sml.getTypeDefinition(typeId)) {
        return response.notFound({
          body: { message: `SML type '${typeId}' not found` },
        });
      }

      const [, startDeps] = await coreSetup.getStartServices();
      const taskId = `${SML_CRAWLER_TASK_TYPE}:${typeId}`;

      try {
        await startDeps.taskManager.runSoon(taskId);
      } catch (e) {
        if ((e as Error).message?.includes('currently running')) {
          return response.ok({
            body: { success: true, type_id: typeId, message: 'Crawler is already running' },
          });
        }
        throw e;
      }

      logger.info(`SML crawler for type '${typeId}' triggered manually`);

      return response.ok({ body: { success: true, type_id: typeId } });
    })
  );

  router.post(
    {
      path: `${internalApiPath}/sml/crawlers/{type_id}/_schedule`,
      validate: {
        params: schema.object({
          type_id: schema.string(),
        }),
        body: schema.object({
          interval: schema.string({ minLength: 2 }),
        }),
      },
      options: { access: 'internal' },
      security: AGENT_BUILDER_WRITE_SECURITY,
    },
    wrapHandler(async (ctx, request, response) => {
      const { sml } = getInternalServices();
      const typeId = request.params.type_id;

      if (!sml.getTypeDefinition(typeId)) {
        return response.notFound({
          body: { message: `SML type '${typeId}' not found` },
        });
      }

      const [, startDeps] = await coreSetup.getStartServices();
      const taskId = `${SML_CRAWLER_TASK_TYPE}:${typeId}`;
      const { interval } = request.body;

      await startDeps.taskManager.bulkUpdateSchedules([taskId], { interval });

      logger.info(
        `SML crawler for type '${typeId}' schedule updated to interval '${interval}'`
      );

      return response.ok({ body: { updated: true, type_id: typeId, interval } });
    })
  );

  router.post(
    {
      path: `${internalApiPath}/sml/crawlers/{type_id}/_clean`,
      validate: {
        params: schema.object({
          type_id: schema.string(),
        }),
      },
      options: { access: 'internal' },
      security: AGENT_BUILDER_WRITE_SECURITY,
    },
    wrapHandler(async (ctx, request, response) => {
      const { sml } = getInternalServices();
      const typeId = request.params.type_id;

      if (!sml.getTypeDefinition(typeId)) {
        return response.notFound({
          body: { message: `SML type '${typeId}' not found` },
        });
      }

      const [coreStart] = await coreSetup.getStartServices();
      const esClient = coreStart.elasticsearch.client.asInternalUser;
      const typeFilter = { term: { type_id: typeId } };

      const [stateResult, dataResult] = await Promise.all([
        esClient.deleteByQuery({
          index: smlCrawlerStateIndexName,
          query: typeFilter,
          ignore_unavailable: true,
          refresh: true,
        }),
        esClient.deleteByQuery({
          index: smlIndexName,
          query: { term: { type: typeId } },
          ignore_unavailable: true,
          refresh: true,
        }),
      ]);

      const stateDeleted = stateResult.deleted ?? 0;
      const dataDeleted = dataResult.deleted ?? 0;

      logger.info(
        `SML crawler clean for type '${typeId}': deleted ${stateDeleted} state doc(s), ${dataDeleted} data chunk(s)`
      );

      return response.ok({
        body: {
          cleaned: true,
          type_id: typeId,
          state_deleted: stateDeleted,
          data_deleted: dataDeleted,
        },
      });
    })
  );
}
