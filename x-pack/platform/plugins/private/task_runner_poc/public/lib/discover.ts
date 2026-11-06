/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import { RESULT_INDEX } from '../../common';

interface DiscoverEsqlParams extends SerializableRecord {
  query: { esql: string };
  timeRange: { from: string; to: string };
}

const RESULT_WINDOW_MS = 15 * 60 * 1000;

const discoverEsqlUrl = (
  share: SharePluginStart,
  esql: string,
  timeRange: DiscoverEsqlParams['timeRange']
): string | undefined =>
  share.url.locators
    .get<DiscoverEsqlParams>(DISCOVER_APP_LOCATOR)
    ?.getRedirectUrl({ query: { esql }, timeRange });

/** Discover with the job's query over the last 30 days. */
export const queryInDiscoverUrl = (share: SharePluginStart, query: string) =>
  discoverEsqlUrl(share, query, { from: 'now-30d', to: 'now' });

/** Discover with the task's result document in tr-results, around the time it was written. */
export const resultInDiscoverUrl = (
  share: SharePluginStart,
  taskId: string,
  finishedAt: string
) => {
  const finishedMs = Date.parse(finishedAt);
  return discoverEsqlUrl(share, `FROM ${RESULT_INDEX} | WHERE taskId == "${taskId}"`, {
    from: new Date(finishedMs - RESULT_WINDOW_MS).toISOString(),
    to: new Date(finishedMs + RESULT_WINDOW_MS).toISOString(),
  });
};
