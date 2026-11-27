/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { schema } from '@kbn/config-schema';
import type { IRouter, KibanaRequest } from '@kbn/core/server';
import {
  AI_INDEX_API_VERSION,
  MAX_AI_INDEX_ID_LENGTH,
  MAX_KI_CONTENT_LENGTH,
  MAX_MEMORY_AI_INDEX_IDS,
  MAX_MEMORY_ID_LENGTH,
  MAX_MEMORY_USER_ID_LENGTH,
  MAX_SESSION_MEMORY_ATTRIBUTES,
  MAX_SESSION_MEMORY_ATTRIBUTE_KEY_LENGTH,
  MAX_SESSION_MEMORY_ATTRIBUTE_VALUE_LENGTH,
  MAX_SESSION_MEMORY_FORGET_IDS,
  SESSION_MEMORY_FORGET_PATH,
  SESSION_MEMORY_REMEMBER_PATH,
} from '../../common/constants';
import { validateAiIndexId, validateNonBlank } from '../../common/validation';
import type { SessionMemoryClient } from '../session_memory_client/client';
import { CONTEXT_ENGINE_DOCS_NOTE } from './constants';
import { MEMORY_WRITE_SECURITY, toMemoryWriteErrorResponse } from './memory_write';
import { errorResponseSchema } from './schemas/ai_indices_schema';

const rememberBodySchema = schema.object({
  id: schema.maybe(
    schema.string({
      minLength: 1,
      maxLength: MAX_MEMORY_ID_LENGTH,
      validate: validateNonBlank,
      meta: {
        description:
          'The id of an existing memory to revise. The revision replaces the memory in full and returns 404 if the memory does not exist, was forgotten, or belongs to another user or space. Omit this field to generate a new id.',
      },
    })
  ),
  session_id: schema.string({
    minLength: 1,
    maxLength: MAX_MEMORY_ID_LENGTH,
    validate: validateNonBlank,
    meta: { description: 'The session the memory comes from.' },
  }),
  user_id: schema.maybe(
    schema.string({
      minLength: 1,
      maxLength: MAX_MEMORY_USER_ID_LENGTH,
      validate: validateNonBlank,
      meta: {
        description:
          "The Kibana user profile UID that the memory belongs to. Omit this field to use the caller's user profile. Naming another user requires `contextEngine:manage_memory`.",
      },
    })
  ),
  ai_index_ids: schema.maybe(
    schema.arrayOf(
      schema.string({
        minLength: 1,
        maxLength: MAX_AI_INDEX_ID_LENGTH,
        validate: validateAiIndexId,
      }),
      {
        maxSize: MAX_MEMORY_AI_INDEX_IDS,
        meta: {
          description:
            'The AI indices that dreaming promotes the memory into. Each must exist in this space, and the caller requires the Elasticsearch `write` privilege on its backing index.',
        },
      }
    )
  ),
  content: schema.string({
    minLength: 1,
    maxLength: MAX_KI_CONTENT_LENGTH,
    validate: validateNonBlank,
    meta: {
      description: 'The memory text. Elasticsearch indexes this field for semantic search.',
    },
  }),
  attributes: schema.maybe(
    schema.recordOf(
      schema.string({
        minLength: 1,
        maxLength: MAX_SESSION_MEMORY_ATTRIBUTE_KEY_LENGTH,
        validate: validateNonBlank,
      }),
      schema.string({ maxLength: MAX_SESSION_MEMORY_ATTRIBUTE_VALUE_LENGTH }),
      {
        validate: (attributes) =>
          Object.keys(attributes).length > MAX_SESSION_MEMORY_ATTRIBUTES
            ? `must have at most ${MAX_SESSION_MEMORY_ATTRIBUTES} attributes`
            : undefined,
        meta: {
          description: `String hints about the memory for dreaming. Accepts up to ${MAX_SESSION_MEMORY_ATTRIBUTES} entries, with non-blank keys of 1 to ${MAX_SESSION_MEMORY_ATTRIBUTE_KEY_LENGTH} characters.`,
        },
      }
    )
  ),
});

const rememberResponseSchema = () =>
  schema.object({
    id: schema.string({
      meta: { description: 'The id of the memory. Pass it as `id` to revise the memory.' },
    }),
  });

const forgetBodySchema = schema.object({
  user_id: schema.maybe(
    schema.string({
      minLength: 1,
      maxLength: MAX_MEMORY_USER_ID_LENGTH,
      validate: validateNonBlank,
      meta: {
        description:
          "The Kibana user profile UID that the memories belong to. Omit this field to use the caller's user profile. Naming another user requires `contextEngine:manage_memory`.",
      },
    })
  ),
  ids: schema.arrayOf(
    schema.string({
      minLength: 1,
      maxLength: MAX_MEMORY_ID_LENGTH,
      validate: validateNonBlank,
    }),
    {
      minSize: 1,
      maxSize: MAX_SESSION_MEMORY_FORGET_IDS,
      meta: { description: 'The ids of the memories to forget. The route collapses duplicates.' },
    }
  ),
});

const forgetResponseSchema = () =>
  schema.object(
    {
      results: schema.arrayOf(
        schema.object({
          id: schema.string({ meta: { description: 'The memory id.' } }),
          outcome: schema.oneOf(
            [
              schema.literal('forgotten'),
              schema.literal('already_forgotten'),
              schema.literal('not_found'),
              schema.literal('failed'),
            ],
            {
              meta: {
                description:
                  'What happened to the memory: `forgotten` if a tombstone was written, `already_forgotten` if it was already tombstoned, `not_found` if it does not exist or belongs to another user or space, or `failed` if Elasticsearch rejected the tombstone.',
              },
            }
          ),
          error: schema.maybe(
            schema.string({
              meta: {
                description: 'Why the tombstone failed when `outcome` is `failed`.',
              },
            })
          ),
        }),
        {
          maxSize: MAX_SESSION_MEMORY_FORGET_IDS,
          meta: { description: 'One result per unique id, in request order.' },
        }
      ),
    },
    { meta: { description: 'The outcome for every requested memory.' } }
  );

/** Registers the public `_remember` and `_forget` session memory routes. */
export const registerSessionMemoryRoutes = ({
  router,
  getSessionMemoryClient,
}: {
  router: IRouter;
  getSessionMemoryClient: (request: KibanaRequest) => Promise<SessionMemoryClient>;
}) => {
  router.versioned
    .post({
      path: SESSION_MEMORY_REMEMBER_PATH,
      security: MEMORY_WRITE_SECURITY,
      access: 'public',
      summary: 'Remember a session memory',
      description: [
        'Writes one memory to the session memory store. Pass `id` to revise an existing memory. The revision replaces the memory in full.',
        'Returns 202 with the memory id and writes the memory in the background, because semantic indexing runs inside the write. The memory becomes searchable after the background write completes and Elasticsearch refreshes, so revising a memory immediately after creating it can return 404 until the write is visible.',
        "Requires the `contextEngine:write` privilege. Without `user_id`, the route writes the memory for the caller's user profile, and a caller without a user profile gets a 403. Naming another user in `user_id` also requires `contextEngine:manage_memory`.",
        'Each AI index in `ai_index_ids` must exist in this space, and the caller requires the Elasticsearch `write` privilege on its backing index. Otherwise, the route rejects the request and writes nothing.',
        'After authorization, validation, and feature-flag checks pass, the route writes one `memory_remember` audit event per request, when the background write finishes or when it rejects the request. The route does not report a failed background write in the response. Instead, it logs the error to the Kibana logs and writes a failure audit event.',
        'Returns 429 with a `Retry-After` header when this Kibana instance is at its in-flight background write limit.',
        'Returns a 404 response when Context Engine is turned off in this space (`contextEngine:enabled`), when memory is turned off (`contextEngine:memoryEnabled`), when an AI index in `ai_index_ids` does not exist, or when `id` does not match an active memory of the target user in this space.',
        CONTEXT_ENGINE_DOCS_NOTE,
      ].join('\n\n'),
      options: {
        tags: ['oas-tag:context engine'],
        availability: { stability: 'experimental', since: '9.7.0' },
      },
    })
    .addVersion(
      {
        version: AI_INDEX_API_VERSION,
        validate: {
          request: { body: rememberBodySchema },
          response: {
            202: {
              body: rememberResponseSchema,
              description:
                'The route accepted the memory and is writing it in the background. It becomes searchable after the write completes.',
            },
            403: {
              body: errorResponseSchema,
              description:
                '`user_id` is missing and the caller has no user profile, `user_id` names another user and the caller lacks `contextEngine:manage_memory`, or the caller cannot write to one of the AI indices.',
            },
            404: {
              body: errorResponseSchema,
              description:
                'Context Engine or memory is turned off, an AI index does not exist, or `id` does not match an active memory of the target user in this space.',
            },
            429: {
              body: errorResponseSchema,
              description:
                'Too many background memory writes are already in progress on this Kibana instance. Retry after the `Retry-After` interval.',
            },
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/session_memory_remember.yaml'),
        },
      },
      async (_ctx, request, response) => {
        const {
          id,
          session_id: sessionId,
          user_id: userId,
          ai_index_ids: aiIndexIds,
          content,
          attributes,
        } = request.body;
        try {
          const client = await getSessionMemoryClient(request);
          const body = await client.remember({
            id,
            sessionId,
            userId,
            aiIndexIds,
            content,
            attributes,
          });
          return response.accepted({ body });
        } catch (error) {
          return toMemoryWriteErrorResponse(error, response);
        }
      }
    );

  router.versioned
    .post({
      path: SESSION_MEMORY_FORGET_PATH,
      security: MEMORY_WRITE_SECURITY,
      access: 'public',
      summary: 'Forget session memories',
      description: [
        'Forgets session memories by ID for the target user. The route reports a memory of another user or another space as `not_found`, so it does not reveal whether the memory exists.',
        "Requires the `contextEngine:write` privilege. Without `user_id`, the route forgets the caller's own memories, and a caller without a user profile gets a 403. Naming another user in `user_id` also requires `contextEngine:manage_memory`.",
        'Forgetting writes a tombstone so reads stop returning the memory after the next Elasticsearch refresh, while Elasticsearch keeps its revisions until retention removes them. A read immediately after forgetting can still return the memory, and forgetting a memory right after writing it can return `not_found` until that write is visible. If Elasticsearch rejects a tombstone, the route returns `failed` with `error` and the caller can retry that ID.',
        'After authorization, validation, and feature-flag checks pass, the route writes one `memory_forget` audit event per unique memory ID. Forgetting still works when memory is turned off.',
        'Returns a 404 response when Context Engine is turned off in this space (`contextEngine:enabled`).',
        CONTEXT_ENGINE_DOCS_NOTE,
      ].join('\n\n'),
      options: {
        tags: ['oas-tag:context engine'],
        availability: { stability: 'experimental', since: '9.7.0' },
      },
    })
    .addVersion(
      {
        version: AI_INDEX_API_VERSION,
        validate: {
          request: { body: forgetBodySchema },
          response: {
            200: {
              body: forgetResponseSchema,
              description: 'The outcome for every requested memory.',
            },
            403: {
              body: errorResponseSchema,
              description:
                '`user_id` is missing and the caller has no user profile, or `user_id` names another user and the caller lacks `contextEngine:manage_memory`.',
            },
            404: {
              body: errorResponseSchema,
              description: 'Context Engine is turned off in this space.',
            },
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/session_memory_forget.yaml'),
        },
      },
      async (_ctx, request, response) => {
        const { user_id: userId, ids } = request.body;
        try {
          const client = await getSessionMemoryClient(request);
          const results = await client.forget({ userId, ids });
          return response.ok({ body: { results } });
        } catch (error) {
          return toMemoryWriteErrorResponse(error, response);
        }
      }
    );
};
