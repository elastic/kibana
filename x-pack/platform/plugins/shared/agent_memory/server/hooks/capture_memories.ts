/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HookLifecycle, HookExecutionMode } from '@kbn/agent-builder-common';
import type { HooksServiceSetup } from '@kbn/agent-builder-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { withActiveInferenceSpan } from '@kbn/inference-tracing';
import { authorizeMemoryRequest } from '../core/authorize_request';
import { AGENT_MEMORY_API_PRIVILEGES } from '../features';
import type { GetMemoryStorage } from '../types';

/** Timeout for the blocking beforeAgent capture hook. LLM extraction can take a few seconds. */
const CAPTURE_HOOK_TIMEOUT_MS = 60_000;

const CAPTURE_SPAN_NAME = 'agent_memory.before_agent.capture';

/**
 * The extraction schema — matches `periodic_extract_write.yaml` so Run 1 (workflow)
 * and Run 2 (hook) extract under the same policy and are directly comparable.
 */
const EXTRACTION_SCHEMA = {
  type: 'object' as const,
  properties: {
    memories: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          title: { type: 'string' as const },
          description: { type: 'string' as const },
          category: { type: 'string' as const, enum: ['profile', 'preferences', 'events', 'trajectories'] as const },
          type: { type: 'string' as const, enum: ['episodic', 'semantic', 'procedural'] as const },
          tags: { type: 'array' as const, items: { type: 'string' as const } },
        },
        required: ['title', 'description', 'category', 'type', 'tags'] as const,
      },
    },
  },
  required: ['memories'] as const,
};

/**
 * System prompt — matches the `instructions` in `periodic_extract_write.yaml` so
 * extraction policy is identical across workflow and hook arms.
 */
const EXTRACTION_SYSTEM =
  'Extract only durable, natural memories specific to the user, their projects, or their environment. ' +
  'Keep every record concise and self-contained. Split unrelated concepts into separate records without ' +
  'targeting a fixed description length. Preserve chronology, updates, contradictions, preferences, ' +
  'instructions, and project facts when they may matter later. Exclude secrets, credentials, transient ' +
  'request details, generic advice, benchmark mechanics, and unsupported inference. Returning an empty ' +
  'array is correct when no durable memory is present.';

/**
 * Renders the last N completed conversation rounds as a source segment for extraction.
 * Only user + assistant text is included (no tool calls, no internal steps).
 */
const buildSourceSegment = (
  rounds: Array<{ input?: { message?: string }; output?: { message?: string } }>,
  n: number
): string => {
  const window = rounds.slice(-n);
  return window
    .map((r, i) => {
      const parts: string[] = [];
      if (r.input?.message) parts.push(`USER: ${r.input.message}`);
      if (r.output?.message) parts.push(`ASSISTANT: ${r.output.message}`);
      return parts.length ? `[Turn ${i + 1}]\n${parts.join('\n')}` : null;
    })
    .filter(Boolean)
    .join('\n\n');
};

/**
 * Registers the `beforeAgent` hook that extracts and captures memories every N rounds.
 *
 * Fires only when `captureEveryNMessages > 0` and `previousRounds.length % N === 0`.
 * Uses the inference `output` API with the same schema + system prompt as the
 * `periodic_extract_write` workflow so the two capture arms are directly comparable.
 *
 * Fails open on any error — the agent round continues without capture.
 */
export const registerCaptureHook = ({
  hooksSetup,
  getStorage,
  getCurrentUserEsClient,
  getSecurity,
  getCoreSecurity,
  getSpaceId,
  getInference,
  captureEveryNMessages,
  logger,
}: {
  hooksSetup: HooksServiceSetup;
  getStorage: GetMemoryStorage;
  getCurrentUserEsClient: (request: KibanaRequest) => ElasticsearchClient;
  getSecurity: () => SecurityPluginStart;
  getCoreSecurity: () => SecurityServiceStart;
  getSpaceId: (request: KibanaRequest) => string;
  getInference: () => InferenceServerStart;
  captureEveryNMessages: number;
  logger: Logger;
}): void => {
  hooksSetup.register({
    id: 'agent-memory-capture',
    priority: 40,
    hooks: {
      [HookLifecycle.beforeAgent]: {
        mode: HookExecutionMode.blocking,
        timeout: CAPTURE_HOOK_TIMEOUT_MS,
        handler: async (context) => {
          try {
            return await withActiveInferenceSpan(CAPTURE_SPAN_NAME, {}, async (span) => {
              const { request, previousRounds, connectorId } = context;

              // Only fire on boundaries.
              if (
                captureEveryNMessages <= 0 ||
                previousRounds.length === 0 ||
                previousRounds.length % captureEveryNMessages !== 0
              ) {
                span?.setAttribute('agent_memory.capture.outcome', 'skipped_not_boundary');
                return {};
              }

              const security = getSecurity();
              const spaceId = getSpaceId(request);

              const authorization = await authorizeMemoryRequest({
                request,
                spaceId,
                privilege: AGENT_MEMORY_API_PRIVILEGES.write,
                security,
                coreSecurity: getCoreSecurity(),
              });

              if (authorization.status !== 'authorized') {
                span?.setAttribute(
                  'agent_memory.capture.outcome',
                  authorization.status === 'forbidden'
                    ? 'skipped_forbidden'
                    : 'skipped_no_identity'
                );
                return {};
              }

              const sourceSegment = buildSourceSegment(previousRounds, captureEveryNMessages);
              if (!sourceSegment.trim()) {
                span?.setAttribute('agent_memory.capture.outcome', 'skipped_empty_segment');
                return {};
              }

              // Extract via the inference output API.
              const inferenceClient = getInference().getClient({ request });
              const extractionResult = await inferenceClient.output({
                id: 'agent_memory_capture',
                connectorId,
                system: EXTRACTION_SYSTEM,
                input: sourceSegment,
                schema: EXTRACTION_SCHEMA,
              });

              const extracted = (extractionResult.output as { memories?: unknown[] })?.memories;
              if (!Array.isArray(extracted) || extracted.length === 0) {
                span?.setAttribute('agent_memory.capture.outcome', 'no_memories_extracted');
                span?.setAttribute('agent_memory.capture.memory_count', 0);
                return {};
              }

              // Write each extracted memory.
              const { writeMemory } = await import('../core/write_memory');
              const esClient = getCurrentUserEsClient(request);
              const storage = getStorage(esClient);
              let written = 0;

              for (const mem of extracted) {
                const m = mem as {
                  title: string;
                  description: string;
                  category?: string;
                  type?: string;
                  tags?: string[];
                };
                try {
                  await writeMemory({
                    storage,
                    esClient,
                    params: {
                      title: m.title,
                      description: m.description,
                      category: m.category as 'profile' | 'preferences' | 'events' | 'trajectories' | undefined,
                      type: m.type as 'episodic' | 'semantic' | 'procedural' | undefined,
                      tags: m.tags,
                      call_source: 'hook',
                      space_id: spaceId,
                      identity: authorization.identity,
                    },
                  });
                  written++;
                } catch (writeErr) {
                  logger.warn(
                    `Capture hook: failed to write memory "${m.title}": ${(writeErr as Error).message}`
                  );
                }
              }

              span?.setAttributes({
                'agent_memory.capture.outcome': 'captured',
                'agent_memory.capture.extracted_count': extracted.length,
                'agent_memory.capture.written_count': written,
                'agent_memory.capture.round_index': previousRounds.length,
              });
              return {};
            });
          } catch (err) {
            logger.warn(`Capture hook failed (fail open): ${(err as Error).message}`);
            return {};
          }
        },
      },
    },
  });
};
