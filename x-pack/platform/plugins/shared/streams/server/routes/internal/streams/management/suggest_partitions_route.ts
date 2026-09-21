/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { partitionStream } from '@kbn/streams-ai';
import { MAX_STREAM_NAME_LENGTH, Streams } from '@kbn/streams-schema';
import type { Condition } from '@kbn/streamlang';
import { from, map } from 'rxjs';
import type { ServerSentEventBase } from '@kbn/sse-utils';
import type { Observable } from 'rxjs';
import { STREAMS_TIERED_ML_FEATURE } from '../../../../../common';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { SecurityError } from '../../../../lib/streams/errors/security_error';
import { StatusError } from '../../../../lib/streams/errors/status_error';
import { createServerRoute } from '../../../create_server_route';
import { getRequestAbortSignal } from '../../../utils/get_request_abort_signal';

// Bounded versions of the condition schema for HTTP input validation.
// conditionSchema from @kbn/streamlang uses bare z.string() and unbounded
// z.lazy recursion. This local schema caps strings, array lengths, and nesting.
const COND_STR_MAX = 256;
const COND_ARR_MAX = 50;
const COND_DEPTH = 5;

const boundedStringOrNumberOrBoolean = z.union([
  z.string().max(COND_STR_MAX),
  z.number(),
  z.boolean(),
]);

const boundedRangeCondition = z.object({
  gt: boundedStringOrNumberOrBoolean.optional(),
  gte: boundedStringOrNumberOrBoolean.optional(),
  lt: boundedStringOrNumberOrBoolean.optional(),
  lte: boundedStringOrNumberOrBoolean.optional(),
});

const boundedFilterCondition = z.union([
  z.object({
    field: z.string().nonempty().max(COND_STR_MAX),
    eq: boundedStringOrNumberOrBoolean.optional(),
    neq: boundedStringOrNumberOrBoolean.optional(),
    lt: boundedStringOrNumberOrBoolean.optional(),
    lte: boundedStringOrNumberOrBoolean.optional(),
    gt: boundedStringOrNumberOrBoolean.optional(),
    gte: boundedStringOrNumberOrBoolean.optional(),
    contains: boundedStringOrNumberOrBoolean.optional(),
    startsWith: boundedStringOrNumberOrBoolean.optional(),
    endsWith: boundedStringOrNumberOrBoolean.optional(),
    range: boundedRangeCondition.optional(),
    includes: boundedStringOrNumberOrBoolean.optional(),
  }),
  z.object({
    field: z.string().nonempty().max(COND_STR_MAX),
    exists: z.boolean().optional(),
  }),
]);

const boundedAlways = z.object({ always: z.object({}) });
const boundedNever = z.object({ never: z.object({}) });

function buildBoundedCondition(depth: number): z.ZodType<Condition> {
  if (depth === 0) {
    return z.union([boundedFilterCondition, boundedAlways, boundedNever]) as z.ZodType<Condition>;
  }
  const inner = buildBoundedCondition(depth - 1);
  return z.union([
    boundedFilterCondition,
    z.object({ and: z.array(inner).max(COND_ARR_MAX) }),
    z.object({ or: z.array(inner).max(COND_ARR_MAX) }),
    z.object({ not: inner }),
    boundedAlways,
    boundedNever,
  ]) as z.ZodType<Condition>;
}

const boundedConditionSchema = buildBoundedCondition(COND_DEPTH);

export interface SuggestPartitionsParams {
  path: {
    name: string;
  };
  body: {
    connector_id: string;
    start: number;
    end: number;
    user_prompt?: string;
    existing_partitions?: Array<{ name: string; condition: Condition }>;
  };
}

export const suggestPartitionsSchema = z.object({
  path: z.object({ name: z.string().max(MAX_STREAM_NAME_LENGTH) }),
  body: z.object({
    connector_id: z.string().max(256),
    start: z.number(),
    end: z.number(),
    user_prompt: z.string().max(2000).optional(),
    existing_partitions: z
      .array(
        z.object({
          name: z.string().max(MAX_STREAM_NAME_LENGTH),
          condition: boundedConditionSchema,
        })
      )
      .max(100)
      .optional(),
  }),
}) satisfies z.Schema<SuggestPartitionsParams>;

type SuggestPartitionsResponse = Observable<
  ServerSentEventBase<'suggested_partitions', Awaited<ReturnType<typeof partitionStream>>>
>;

export const suggestPartitionsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/_suggest_partitions',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: suggestPartitionsSchema,
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<SuggestPartitionsResponse> => {
    const isAvailableForTier = server.core.pricing.isFeatureAvailable(STREAMS_TIERED_ML_FEATURE.id);
    if (!isAvailableForTier) {
      throw new SecurityError('Cannot access API on the current pricing tier');
    }

    const scopedClients = await getScopedClients({ request });
    const { inferenceClient, scopedClusterClient, streamsClient } = scopedClients;

    const { connector_id: connectorId } = params.body;

    const stream = await streamsClient.getStream(params.path.name);
    if (!Streams.WiredStream.Definition.is(stream)) {
      throw new StatusError('Partitioning suggestions are only available for wired streams', 400);
    }

    const partitionsPromise = partitionStream({
      definition: stream,
      inferenceClient: inferenceClient.bindTo({ connectorId }),
      esClient: scopedClusterClient.asCurrentUser,
      logger,
      start: params.body.start,
      end: params.body.end,
      maxSteps: 4, // Longer reasoning seems to add unnecessary conditions (and latency), instead of improving accuracy, so we limit the steps.
      signal: getRequestAbortSignal(request),
      userPrompt: params.body.user_prompt,
      existingPartitions: params.body.existing_partitions,
      getFeatures: async (filters) => {
        const { getKnowledgeIndicatorClient } = scopedClients;
        if (!getKnowledgeIndicatorClient) {
          return [];
        }
        const kiClient = await getKnowledgeIndicatorClient();
        const { hits } = await kiClient.getFeatures(params.path.name, filters);
        return hits;
      },
    });

    // Turn our promise into an Observable ServerSideEvent. The only reason we're streaming the
    // response here is to avoid timeout issues prevalent with long-running requests to LLMs.
    return from(partitionsPromise).pipe(
      map((suggestions) => ({
        ...suggestions,
        type: 'suggested_partitions' as const,
      }))
    );
  },
});
