/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, IUiSettingsClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { minimatch } from 'minimatch';
import { OBSERVABILITY_STREAMS_SIG_EVENTS_LINKED_CODE_INDICES } from '@kbn/management-settings-ids';

/**
 * Map of stream name (or glob pattern, e.g. `logs.checkout.*`) to the
 * Semantic Code Search index that holds the source code for that stream
 * (e.g. `code-acme_checkout-service`).
 */
export type LinkedCodeIndices = Record<string, string>;

/**
 * Parses the linked-code-indices mapping from the global uiSettings JSON value.
 * Returns an empty map (no links) on any parse/shape error so that resolution
 * degrades gracefully instead of failing query generation.
 */
export const parseLinkedCodeIndices = (
  raw: string | undefined,
  logger: Logger
): LinkedCodeIndices => {
  if (!raw) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      logger.warn('Linked code indices setting is not a JSON object; ignoring.');
      return {};
    }

    const result: LinkedCodeIndices = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string' && value.length > 0) {
        result[key] = value;
      }
    }
    return result;
  } catch (error) {
    logger.warn(
      `Failed to parse linked code indices setting, ignoring: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return {};
  }
};

/**
 * Resolves the SCS code index linked to a given stream from the provided mapping.
 *
 * Resolution order:
 * 1. Exact stream-name match.
 * 2. First glob pattern match (patterns are evaluated in declared order).
 *
 * Returns `undefined` when no mapping applies, in which case code grounding
 * is a no-op for the stream.
 */
export const resolveCodeIndexFromMap = (
  streamName: string,
  mapping: LinkedCodeIndices
): string | undefined => {
  const exact = mapping[streamName];
  if (exact) {
    return exact;
  }

  for (const [pattern, index] of Object.entries(mapping)) {
    if (pattern !== streamName && minimatch(streamName, pattern)) {
      return index;
    }
  }

  return undefined;
};

/**
 * Reads the global linked-code-indices setting and resolves the code index for
 * a stream. Returns `undefined` when unmapped or on any read error.
 */
export const resolveCodeIndexForStream = async ({
  streamName,
  globalUiSettingsClient,
  logger,
}: {
  streamName: string;
  globalUiSettingsClient: IUiSettingsClient;
  logger: Logger;
}): Promise<string | undefined> => {
  try {
    const raw = await globalUiSettingsClient.get<string>(
      OBSERVABILITY_STREAMS_SIG_EVENTS_LINKED_CODE_INDICES
    );
    const mapping = parseLinkedCodeIndices(raw, logger);
    return resolveCodeIndexFromMap(streamName, mapping);
  } catch (error) {
    logger.warn(
      `Failed to resolve linked code index for stream "${streamName}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return undefined;
  }
};

/**
 * Resolves the `owner/repo` repository identifier for a code index by reading
 * the `repository` keyword field that Semantic Code Search stamps onto every
 * indexed chunk. This is preferred over parsing the index name, which can be
 * customized at index time and is therefore not a reliable source.
 *
 * The repository identifier is what the SCS git-history workflows
 * (`code-history-*`) filter on. Returns `undefined` when the field is absent
 * (e.g. an index created by an older SCS version) or on any read error, in
 * which case the git-history grounding tools are simply not exposed.
 */
export const resolveRepositoryForCodeIndex = async ({
  esClient,
  codeIndex,
  logger,
}: {
  esClient: ElasticsearchClient;
  codeIndex: string;
  logger: Logger;
}): Promise<string | undefined> => {
  try {
    const response = await esClient.search<{ repository?: string }>({
      index: codeIndex,
      size: 1,
      _source: ['repository'],
      query: { exists: { field: 'repository' } },
      terminate_after: 1,
    });

    const repository = response.hits.hits[0]?._source?.repository;
    return typeof repository === 'string' && repository.length > 0 ? repository : undefined;
  } catch (error) {
    logger.warn(
      `Failed to resolve repository for code index "${codeIndex}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return undefined;
  }
};
