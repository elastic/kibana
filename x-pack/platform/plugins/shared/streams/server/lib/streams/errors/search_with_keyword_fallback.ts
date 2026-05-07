/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { type SearchMode, resolveSearchMode } from '../../../../common/queries';
import { parseError } from './parse_error';

/**
 * Executes a search using the resolved search mode, falling back to keyword
 * when the mode was auto-resolved (caller omitted `searchMode`) and the first
 * attempt fails. Explicit mode requests propagate errors to the caller.
 */
export async function searchWithKeywordFallback<T>(
  logger: Logger,
  opts: {
    searchMode: SearchMode | undefined;
    label: string;
    streamNames: string[];
  },
  execute: (mode: SearchMode) => Promise<T>
): Promise<T> {
  const effectiveMode = resolveSearchMode(opts.searchMode);

  try {
    return await execute(effectiveMode);
  } catch (error) {
    if (effectiveMode !== 'keyword' && !opts.searchMode) {
      const { message } = parseError(error);
      logger.warn(
        `${opts.label} search mode "${effectiveMode}" failed for streams [${opts.streamNames.join(
          ', '
        )}], falling back to keyword: ${message}`
      );
      return await execute('keyword');
    }
    throw error;
  }
}
