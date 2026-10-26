/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNonLocalIndexName } from '@kbn/es-query';
import type { Logger } from '@kbn/logging';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { ErrorCause } from '@elastic/elasticsearch/lib/api/types';
import { getErrorMessage } from '../../../common';

const REMOTE_RESOURCE_NOT_SUPPORTED_TYPE = 'remote_resource_not_supported_exception';
const VIEW_NAMES_KEY = 'es.esql.view.names';
const DATASET_NAMES_KEY = 'es.esql.dataset.names';
const BRACKET_LIST_RE = /(?:exclude them with|Matched) \[([^\]]+)\]/gi;
const MAX_REMOTE_RESOURCE_RETRIES = 2;

/**
 * Turns a matched remote resource (`cluster:view` or `view`) into ES|QL FROM
 * negations. Always includes `*:-name` so linked projects are covered without
 * baking in a specific alias; keeps `cluster:-name` when ES reported one.
 */
export function toRemoteResourceExclusions(qualifiedName: string): string[] {
  const trimmed = qualifiedName.trim();
  if (!trimmed) {
    return [];
  }

  const separator = isNonLocalIndexName(trimmed) ? trimmed.indexOf(':') : -1;
  const cluster = separator >= 0 ? trimmed.slice(0, separator) : undefined;
  let index = separator >= 0 ? trimmed.slice(separator + 1) : trimmed;
  if (index.startsWith('-')) {
    index = index.slice(1);
  }
  if (!index) {
    return [];
  }

  const anyRemote = `*:-${index}`;
  return cluster !== undefined ? [`${cluster}:-${index}`, anyRemote] : [`-${index}`, anyRemote];
}

/**
 * Extracts FROM-clause exclusions from `remote_resource_not_supported_exception`.
 * Uses ES metadata when present, otherwise the `exclude them with` / `Matched` lists.
 */
export function parseRemoteResourceExclusions(error: unknown): string[] {
  const body = getEsErrorBody(error);
  const message = [body?.reason, getErrorMessage(error)].filter(isNonEmptyString).join('\n');
  if (
    body?.type !== REMOTE_RESOURCE_NOT_SUPPORTED_TYPE &&
    !message.includes(REMOTE_RESOURCE_NOT_SUPPORTED_TYPE)
  ) {
    return [];
  }

  const names = [
    ...asStringArray(body?.[VIEW_NAMES_KEY]),
    ...asStringArray(body?.[DATASET_NAMES_KEY]),
    ...parseBracketLists(message),
  ];
  return [...new Set(names.flatMap(toRemoteResourceExclusions))];
}

export async function executeEsqlQueryRetryingRemoteResources({
  indexPatterns,
  logger,
  execute,
}: {
  indexPatterns: string[];
  logger: Logger;
  execute: (indexPatterns: string[]) => Promise<ESQLSearchResponse>;
}): Promise<ESQLSearchResponse> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_REMOTE_RESOURCE_RETRIES; attempt++) {
    try {
      return await execute(indexPatterns);
    } catch (error) {
      lastError = error;
      const exclusions = parseRemoteResourceExclusions(error).filter(
        (exclusion) => !indexPatterns.includes(exclusion)
      );
      if (exclusions.length === 0) {
        throw error;
      }
      indexPatterns.push(...exclusions);
      logger.warn(`Retrying ES|QL after excluding remote views/datasets: ${exclusions.join(', ')}`);
    }
  }
  throw lastError;
}

function parseBracketLists(text: string): string[] {
  return [...text.matchAll(BRACKET_LIST_RE)].flatMap((match) =>
    match[1]
      .split(',')
      .map((raw) => raw.trim())
      .filter(Boolean)
  );
}

function getEsErrorBody(error: unknown): ErrorCause | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }
  const candidate = error as {
    meta?: { body?: { error?: ErrorCause } };
    body?: { error?: ErrorCause };
  };
  return candidate.meta?.body?.error ?? candidate.body?.error;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return typeof value === 'string' ? [value] : [];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
