/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { schema } from '@kbn/config-schema';
import type { IRouter, KibanaRequest } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  AI_INDEX_API_VERSION,
  MAX_AI_INDEX_ID_LENGTH,
  MAX_SESSION_EVENTS_BODY_BYTES,
  MAX_SESSION_EVENTS_PER_REQUEST,
  MAX_SESSION_EVENT_AI_INDEX_IDS,
  MAX_SESSION_EVENT_ID_LENGTH,
  MAX_SESSION_EVENT_TEXT_LENGTH,
  MAX_SESSION_EVENT_TIMESTAMP_LENGTH,
  MAX_SESSION_EVENT_TOOL_CALLS,
  MAX_SESSION_EVENT_TOOL_NAME_LENGTH,
  MAX_SESSION_EVENT_USER_ID_LENGTH,
  SESSION_EVENTS_SAVE_PATH,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import { validateIsoDate } from '../../common/validation';
import { assertAiIndicesWritable } from '../ai_indices/assert_ai_indices_writable';
import { AiIndexNotFoundError, AiIndexNotWritableError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import { sessionEventsSaveAuditEvent } from '../audit/audit_events';
import type { SessionEventsService } from '../session_events/types';
import { resolveSpaceId } from '../utils/resolve_space_id';
import { errorResponseSchema } from './schemas/ai_indices_schema';
import { MEMORY_DISABLED_MESSAGE, withContextEngineFeatureFlag } from './with_feature_flag';

const WRITE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.writeContextEngine, apiPrivileges.manageMemory] },
};

const NO_PROFILE_MESSAGE =
  'The caller has no user profile, so its events cannot be attributed to a user. Set `user_id`, log in to Kibana once to create a profile, or use an API key whose owner has one.';

const forbidden = (message: string): Error =>
  Object.assign(new Error(message), { name: 'Forbidden' });

const idSchema = (description: string) =>
  schema.string({ minLength: 1, maxLength: MAX_SESSION_EVENT_ID_LENGTH, meta: { description } });

const textSchema = (description: string) =>
  schema.string({ maxLength: MAX_SESSION_EVENT_TEXT_LENGTH, meta: { description } });

const toolNameSchema = (description: string) =>
  schema.string({
    minLength: 1,
    maxLength: MAX_SESSION_EVENT_TOOL_NAME_LENGTH,
    meta: { description },
  });

const baseEventProps = {
  id: idSchema(
    'The event id, unique within the session. Readers drop resent duplicates by session and event id.'
  ),
  turn_id: idSchema('The turn the event belongs to. Events are grouped into turns by this id.'),
  event_at: schema.string({
    maxLength: MAX_SESSION_EVENT_TIMESTAMP_LENGTH,
    validate: validateIsoDate,
    meta: {
      description:
        'When the agent created the event, as an ISO 8601 date and time such as `2026-11-16T09:58:00.000Z`.',
    },
  }),
  seq: schema.maybe(
    schema.number({
      min: 0,
      max: Number.MAX_SAFE_INTEGER,
      validate: (value) => (Number.isInteger(value) ? undefined : 'must be an integer'),
      meta: { description: 'An optional order key for events within the session.' },
    })
  ),
};

const allowOtherFields = { unknowns: 'allow' } as const;

const toolCallSchema = schema.object(
  {
    id: idSchema('The tool call id that a later tool event refers to in `tool_call_id`.'),
    name: toolNameSchema('The name of the called tool.'),
  },
  allowOtherFields
);

const eventSchema = schema.discriminatedUnion('type', [
  schema.object(
    {
      ...baseEventProps,
      type: schema.literal('user'),
      content: textSchema('The user message. It is indexed for semantic search.'),
    },
    allowOtherFields
  ),
  schema.object(
    {
      ...baseEventProps,
      type: schema.literal('assistant'),
      content: schema.maybe(
        textSchema('The assistant message. It is indexed for semantic search.')
      ),
      tool_calls: schema.maybe(
        schema.arrayOf(toolCallSchema, {
          maxSize: MAX_SESSION_EVENT_TOOL_CALLS,
          meta: {
            description:
              'The tool calls the assistant made in this message. Any other field of a call, such as `args` as a string or an object, is stored as sent.',
          },
        })
      ),
    },
    allowOtherFields
  ),
  schema.object(
    {
      ...baseEventProps,
      type: schema.literal('reasoning'),
      content: schema.maybe(textSchema('The reasoning text. It is stored but not indexed.')),
    },
    allowOtherFields
  ),
  schema.object(
    {
      ...baseEventProps,
      type: schema.literal('tool'),
      tool_call_id: idSchema('The id of the tool call this event answers.'),
      tool_name: toolNameSchema('The name of the tool that ran.'),
      status: schema.maybe(
        schema.nullable(
          schema.oneOf([schema.literal('successful'), schema.literal('failed')], {
            meta: {
              description:
                'Whether the tool succeeded. Leave it out or send null when unknown; it is stored as `unknown`.',
            },
          })
        )
      ),
    },
    allowOtherFields
  ),
  schema.object({ ...baseEventProps, type: schema.literal('meta') }, allowOtherFields),
]);

const saveEventsBodySchema = schema.object({
  session_id: idSchema('The session the events belong to.'),
  user_id: schema.maybe(
    schema.string({
      minLength: 1,
      maxLength: MAX_SESSION_EVENT_USER_ID_LENGTH,
      meta: {
        description:
          "The user the events belong to. Defaults to the caller's user profile. Any user in the space can be named.",
      },
    })
  ),
  ai_index_ids: schema.maybe(
    schema.arrayOf(schema.string({ minLength: 1, maxLength: MAX_AI_INDEX_ID_LENGTH }), {
      maxSize: MAX_SESSION_EVENT_AI_INDEX_IDS,
      meta: {
        description:
          'The AI indices the agent could use in the session. Each must exist in this space, and the caller needs the Elasticsearch `write` privilege on its backing index.',
      },
    })
  ),
  events: schema.arrayOf(eventSchema, {
    minSize: 1,
    maxSize: MAX_SESSION_EVENTS_PER_REQUEST,
    meta: { description: 'The events to save.' },
  }),
});

const saveEventsResponseSchema = () =>
  schema.object({
    results: schema.arrayOf(
      schema.object({
        id: schema.string({ meta: { description: 'The event id.' } }),
        status: schema.oneOf([schema.literal('created'), schema.literal('failed')], {
          meta: { description: 'Whether the event was stored.' },
        }),
        error: schema.maybe(
          schema.string({ meta: { description: 'Why the event failed. Resend it to retry.' } })
        ),
      }),
      {
        maxSize: MAX_SESSION_EVENTS_PER_REQUEST,
        meta: { description: 'One result per event, in request order.' },
      }
    ),
  });

export const registerSessionEventsRoutes = ({
  router,
  getSpaces,
  getSessionEventsService,
  getAiIndexService,
  isMemoryEnabled,
}: {
  router: IRouter;
  getSpaces: () => Promise<SpacesPluginStart | undefined>;
  getSessionEventsService: () => Promise<SessionEventsService>;
  getAiIndexService: () => AiIndexService;
  isMemoryEnabled: (request: KibanaRequest) => Promise<boolean>;
}) => {
  router.versioned
    .post({
      path: SESSION_EVENTS_SAVE_PATH,
      security: WRITE_SECURITY,
      access: 'public',
      summary: 'Save session events',
      description: [
        'Saves the events of an agent session, one document per event, so the session can be searched later. User and assistant messages are indexed for semantic search.',
        `Takes 1 to ${MAX_SESSION_EVENTS_PER_REQUEST} events and a body of up to 10 MB. A request that fails validation is rejected as a whole. Any field an event carries beyond the documented ones, such as a tool event's \`result\` or a tool call's \`args\`, is stored as sent, whatever its JSON type.`,
        'Each event gets its own result, in request order. A `failed` event, for example when its content could not be embedded, does not fail the request; resend it to retry. A resent event is stored again, and readers drop duplicates by session and event id.',
        "The route needs the `contextEngine:manageMemory` privilege on top of `contextEngine:write`. It lets the caller save events for any user in the space by naming them in `user_id`. Without `user_id` the events belong to the caller's user profile, and a caller without one gets a 403. Each AI index in `ai_index_ids` must exist in this space, and the caller needs the Elasticsearch `write` privilege on its backing index. Otherwise the request is rejected and nothing is saved.",
        'Each request writes one `memory_save_event` audit event.',
        'Returns a 404 response when Context Engine is turned off in this space (`contextEngine:enabled`), when memory is turned off, or when an AI index in `ai_index_ids` does not exist.',
      ].join('\n\n'),
      options: {
        tags: ['oas-tag:context engine'],
        availability: { stability: 'experimental', since: '9.7.0' },
        body: { maxBytes: MAX_SESSION_EVENTS_BODY_BYTES },
      },
    })
    .addVersion(
      {
        version: AI_INDEX_API_VERSION,
        validate: {
          request: { body: saveEventsBodySchema },
          response: {
            200: {
              body: saveEventsResponseSchema,
              description: 'The result for every event.',
            },
            403: {
              body: errorResponseSchema,
              description:
                '`user_id` is missing and the caller has no user profile, or the caller cannot write to one of the AI indices.',
            },
            404: {
              body: errorResponseSchema,
              description: 'Context Engine or memory is turned off, or an AI index does not exist.',
            },
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/session_events_save.yaml'),
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        if (!(await isMemoryEnabled(request))) {
          return response.notFound({ body: { message: MEMORY_DISABLED_MESSAGE } });
        }

        const {
          session_id: sessionId,
          user_id: requestedUserId,
          ai_index_ids: aiIndexIds = [],
          events,
        } = request.body;
        const space = resolveSpaceId(await getSpaces(), request);
        const { security, elasticsearch, userProfile } = await ctx.core;
        const esClient = elasticsearch.client.asCurrentUser;
        const profileUid = (await userProfile.getCurrentProfileId()) ?? undefined;
        const userId = requestedUserId ?? profileUid;

        const audit = (outcome: { saved?: number; failed?: number; error?: Error }) =>
          security.audit.logger.log(
            sessionEventsSaveAuditEvent({ sessionId, targetUserId: userId, ...outcome })
          );
        const reject = (error: Error, status: 'forbidden' | 'notFound') => {
          audit({ error });
          return response[status]({ body: { message: error.message } });
        };

        if (userId === undefined) {
          return reject(forbidden(NO_PROFILE_MESSAGE), 'forbidden');
        }

        try {
          await assertAiIndicesWritable({
            aiIndexService: getAiIndexService(),
            esClient,
            spaceId: space,
            aiIndexIds,
          });
        } catch (error) {
          if (error instanceof AiIndexNotFoundError) {
            return reject(error, 'notFound');
          }
          if (error instanceof AiIndexNotWritableError) {
            return reject(error, 'forbidden');
          }
          throw error;
        }

        const service = await getSessionEventsService();
        let body: Awaited<ReturnType<SessionEventsService['saveEvents']>>;
        try {
          body = await service.saveEvents({ space, userId }, { sessionId, aiIndexIds, events });
        } catch (error) {
          audit({ error });
          throw error;
        }

        const failed = body.results.filter(({ status }) => status === 'failed').length;
        audit({ saved: body.results.length - failed, failed });
        return response.ok({ body });
      })
    );
};
