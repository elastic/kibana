/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { InferenceClient } from '@kbn/inference-common';
import {
  SIGNIFICANT_EVENTS_CODE_INTELLIGENCE_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
} from '@kbn/significant-events-schema';
import type { LoggingCandidate, LoggingChunk } from './types';

/**
 * Stage 3: judge the deterministically-grepped candidate logging lines with a
 * single batched LLM call. Grep is exhaustive but imprecise (string-anchored
 * phrases match attribute keys, config, i18n as well as real logs) and cannot
 * infer a severity level for a bare `fmt.Errorf("...")`. The classifier does
 * both — keep/drop + level + the static message — in sequential batches of at
 * most 200 candidates. The task is a per-line judgment, so batching is
 * order-independent.
 *
 * Bounded, tool-less, temperature 0: the cheapest inference tier handles it.
 * The connector is the KI-extraction inference feature's mapped connector, so
 * it is swappable by remapping that feature (recommended: a fast, cheap model).
 */

const CLASSIFY_SYSTEM = `You classify source-code excerpts as production log statements emitted by a running service. Each candidate is given as: id, the source FILE PATH it came from, the LANGUAGE, then a small excerpt window (the matched line and +/-1 neighbour lines, joined by newlines).

For each id decide:
- keep: true ONLY if the excerpt emits a runtime log/diagnostic MESSAGE that a RUNNING SERVICE writes to its logs. This includes logger calls (logger.info/error/warn/...), application print/eprintln/println/Console.WriteLine to standard streams from service code, error-wrapping with a human message (fmt.Errorf("..."), .expect("..."), panic("...")), and structured/source-generated logging (e.g. [LoggerMessage(... Message="...")]).
- keep: false for metric or span attribute names/keys, config values, i18n/UI strings, code comments, test assertions, enum/const string values, and raw JSON payloads.
- keep: false for BUILD / TOOLING / CI output. If the FILE PATH is a build or automation file — Makefile or *.mk, shell scripts (*.sh, *.bash), Dockerfile, CI config (.github/, .gitlab-ci, .buildkite/, *.yml pipelines), or package-manager scripts — the excerpt is developer/CLI output, NOT a running-service log. Set keep=false even when it contains words like "Error:" or prints to stdout (e.g. a shell \`echo "Error: ..."\` in a Makefile recipe).
- keep: false for CLI USAGE / HELP text: strings describing how to invoke a command ("USAGE:", "Usage:", option/argument descriptions, --help output), even if prefixed with "Error:".
- keep: false for USAGE TEMPLATES with placeholder enumerations (e.g. "resource1 resource2 ..."): the literal text never appears verbatim in real logs, so it cannot match.
- level: if keep, exactly one of fatal|error|warn|info|debug. Infer from the message: failures/exceptions/panic => error (fatal if it aborts the process); could-not/deprecated/retry => warn; started/listening/received/connected/processing => info.
- message: if keep, the STATIC human-readable text of the log message with interpolation/format placeholders removed (e.g. fmt.Errorf("failed to charge card: %+v", err) => "failed to charge card"). Empty string when keep is false.

Return one result per id. Be strict: when unsure whether an excerpt is a real running-service log emission, set keep=false.`;

const classifySchema = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'The candidate id being classified.' },
          keep: { type: 'boolean', description: 'Whether this is a real production log emission.' },
          level: {
            type: 'string',
            description:
              'Severity when keep is true: fatal|error|warn|info|debug. Empty otherwise.',
          },
          message: {
            type: 'string',
            description: 'Static log message text when keep is true. Empty otherwise.',
          },
        },
        required: ['id', 'keep'],
      },
    },
  },
  required: ['results'],
} as const;

const VALID_LEVELS = new Set(['fatal', 'error', 'warn', 'warning', 'info', 'debug', 'trace']);
const CLASSIFY_BATCH_SIZE = 200;

export interface ClassifyLoggingSitesOptions {
  inferenceClient: InferenceClient;
  connectorId: string;
  candidates: LoggingCandidate[];
  logger: Logger;
  abortSignal?: AbortSignal;
}

/**
 * Classifies candidate logging lines and returns kept ones as {@link LoggingChunk}s.
 * Idiom-sourced candidates are kept even if the model is unavailable (they are
 * high-confidence log sites and the regex extractor can parse them); only
 * phrase-sourced candidates strictly depend on the classifier's judgement.
 */
export async function classifyLoggingSites({
  inferenceClient,
  connectorId,
  candidates,
  logger,
  abortSignal,
}: ClassifyLoggingSitesOptions): Promise<LoggingChunk[]> {
  if (candidates.length === 0) {
    return [];
  }

  const byId = new Map<number, LoggingCandidate>();
  candidates.forEach((candidate, index) => byId.set(index, candidate));

  const decisions = new Map<number, { keep: boolean; level?: string; message?: string }>();
  const batchCount = Math.ceil(candidates.length / CLASSIFY_BATCH_SIZE);
  for (let start = 0; start < candidates.length; start += CLASSIFY_BATCH_SIZE) {
    const batch = candidates.slice(start, start + CLASSIFY_BATCH_SIZE);
    const input =
      'Classify these excerpts (TAB-separated: id, file path, language, excerpt; newlines shown as \u23ce):\n' +
      batch
        .map((candidate, offset) => {
          const path = candidate.location?.replace(/:\d+$/, '') || 'unknown';
          const language = candidate.language || 'unknown';
          const excerpt = candidate.content.replace(/\n/g, ' \u23ce ');
          return `${start + offset}\t${path}\t${language}\t${excerpt}`;
        })
        .join('\n');

    try {
      const { output } = await inferenceClient.output({
        id: 'classify_logging_sites',
        connectorId,
        system: CLASSIFY_SYSTEM,
        input,
        schema: classifySchema,
        abortSignal,
        metadata: {
          connectorTelemetry: {
            pluginId: SIGNIFICANT_EVENTS_CODE_INTELLIGENCE_INFERENCE_FEATURE_ID,
            aggregateBy: SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
          },
        },
      });
      for (const result of output?.results ?? []) {
        if (typeof result?.id === 'number') {
          decisions.set(result.id, {
            keep: Boolean(result.keep),
            level: result.level,
            message: result.message,
          });
        }
      }
    } catch (error) {
      // Degrade only this batch: the missing-decision fallback below keeps its
      // idiom candidates and drops its phrase candidates.
      logger.warn(
        `classify_logging_sites: inference failed for batch ${
          Math.floor(start / CLASSIFY_BATCH_SIZE) + 1
        }/${batchCount}, falling back to idiom-only for this batch (${
          error instanceof Error ? error.message : String(error)
        })`
      );
    }
  }

  const chunks: LoggingChunk[] = [];
  let keptWithClassification = 0;
  for (const [id, candidate] of byId) {
    const decision = decisions.get(id);
    // If the model omitted an id, keep idiom candidates (safe default) and drop
    // unjudged phrase candidates.
    if (!decision) {
      if (candidate.via === 'idiom') {
        chunks.push({
          content: candidate.content,
          language: candidate.language,
          location: candidate.location,
        });
      }
      continue;
    }
    if (!decision.keep) {
      continue;
    }

    const chunk: LoggingChunk = {
      content: candidate.content,
      language: candidate.language,
      location: candidate.location,
    };
    // Option 2: when the classifier supplied a usable level + message, attach it
    // so a phrase-only line with no logger idiom still yields a signature. Idiom
    // lines can still be parsed by the regex extractor, but a valid classification
    // is preferred (it strips interpolation and normalises the level).
    const level = decision.level?.trim().toLowerCase();
    const message = decision.message?.trim();
    if (level && VALID_LEVELS.has(level) && message) {
      chunk.classified = { level, message };
      keptWithClassification += 1;
    }
    chunks.push(chunk);
  }

  logger.debug(
    `classify_logging_sites: ${candidates.length} candidate(s) -> ${chunks.length} kept ` +
      `(${keptWithClassification} with classifier level+message)`
  );
  return chunks;
}
