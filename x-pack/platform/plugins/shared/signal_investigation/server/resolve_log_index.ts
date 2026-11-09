/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import { i18n } from '@kbn/i18n';
import { isEsqlQuery, type InvestigationSeed } from '@kbn/investigation-seed';
import type { LogSourcesService } from '@kbn/logs-data-access-plugin/common/types';
import type { LogsSharedPluginStart } from '@kbn/logs-shared-plugin/server';
import type { SignalAnalyzerResult } from '@kbn/signal-investigation-contract';
import { stripNonLogIndexParts } from '../common/log_volume_anchor';
import { extractReadOnlyEsqlIndexPattern } from './esql_index_source';

export type ResolvedLogIndex =
  | { kind: 'resolved'; index: string; timeField: string }
  | { kind: 'non_logs' }
  | { kind: 'unavailable' };

const DEFAULT_TIME_FIELD = '@timestamp';

const isSavedObjectNotFound = (error: unknown): boolean =>
  error instanceof Error && SavedObjectsErrorHelpers.isNotFoundError(error);

/** Shown when a saved data view or log view can no longer be loaded. */
export const unavailableDataViewResult = (): SignalAnalyzerResult => ({
  leads: [],
  entities: {},
  status: 'not_set_up',
  message: i18n.translate('xpack.signalInvestigation.logIndex.dataViewUnavailable', {
    defaultMessage: 'The selected data view is unavailable.',
  }),
});

/**
 * Resolves the log index and time field for a seed: the alert's log view, then a read-only
 * ES|QL index, then a saved data view, then an explicit index pattern, then the configured log sources.
 */
export const resolveLogIndex = async ({
  seed,
  dataViews,
  logViews,
  savedObjectsClient,
  esClient,
  request,
  logSourcesService,
}: {
  seed: InvestigationSeed;
  dataViews: DataViewsServerPluginStart;
  logViews?: LogsSharedPluginStart['logViews'];
  savedObjectsClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  request: KibanaRequest;
  logSourcesService: LogSourcesService;
}): Promise<ResolvedLogIndex> => {
  if (seed.origin.app === 'alerts' && seed.origin.logViewId && logViews) {
    try {
      const resolved = await logViews.getScopedClient(request).getResolvedLogView({
        type: 'log-view-reference',
        logViewId: seed.origin.logViewId,
      });
      if (resolved.indices.length > 0) {
        return {
          kind: 'resolved',
          index: resolved.indices,
          timeField: resolved.timestampField || DEFAULT_TIME_FIELD,
        };
      }
    } catch (error) {
      if (!isSavedObjectNotFound(error)) {
        throw error;
      }
    }
    return { kind: 'unavailable' };
  }

  if (seed.query && isEsqlQuery(seed.query)) {
    const esqlIndex = extractReadOnlyEsqlIndexPattern(seed.query.esql);
    if (esqlIndex) {
      return { kind: 'resolved', index: esqlIndex, timeField: DEFAULT_TIME_FIELD };
    }
  }

  if (seed.dataViewId) {
    try {
      const service = await dataViews.dataViewsServiceFactory(
        savedObjectsClient,
        esClient,
        request
      );
      const dataView = await service.get(seed.dataViewId);
      const rawIndex = dataView.getIndexPattern();
      if (rawIndex.length === 0) {
        return { kind: 'unavailable' };
      }
      const index = stripNonLogIndexParts(rawIndex);
      if (!index) {
        return { kind: 'non_logs' };
      }
      return {
        kind: 'resolved',
        index,
        timeField: dataView.timeFieldName ?? DEFAULT_TIME_FIELD,
      };
    } catch (error) {
      if (isSavedObjectNotFound(error)) {
        if (seed.indexPattern) {
          const fallbackIndex = stripNonLogIndexParts(seed.indexPattern);
          return fallbackIndex
            ? { kind: 'resolved', index: fallbackIndex, timeField: DEFAULT_TIME_FIELD }
            : { kind: 'non_logs' };
        }
        return { kind: 'unavailable' };
      }
      throw error;
    }
  }

  if (seed.indexPattern) {
    const filteredIndex = stripNonLogIndexParts(seed.indexPattern);
    if (!filteredIndex) {
      return { kind: 'non_logs' };
    }
    return { kind: 'resolved', index: filteredIndex, timeField: DEFAULT_TIME_FIELD };
  }

  return {
    kind: 'resolved',
    index: await logSourcesService.getFlattenedLogSources(),
    timeField: DEFAULT_TIME_FIELD,
  };
};
