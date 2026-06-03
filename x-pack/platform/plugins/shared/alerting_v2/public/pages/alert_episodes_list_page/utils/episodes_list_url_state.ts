/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpisodesFilterState } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import type { TimeRange } from '@kbn/es-query';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import {
  DEFAULT_EPISODES_LIST_STATUS,
  EPISODES_LIST_APP_STATE_KEY,
  decodeEpisodesListRecord,
  encodeEpisodesListRecord,
} from '../../../../common/locators/episodes_list_url_state';

export {
  EPISODES_LIST_APP_STATE_KEY,
  EPISODES_LIST_STATUS_URL_ALL,
  DEFAULT_EPISODES_LIST_TIME_RANGE,
} from '../../../../common/locators/episodes_list_url_state';

/** Default list filters (Active episodes, no rule/tags/search/assignee). */
export const DEFAULT_EPISODES_LIST_FILTER: EpisodesFilterState = {
  status: DEFAULT_EPISODES_LIST_STATUS,
};

type AppStateRecord = Record<string, unknown> & {
  [EPISODES_LIST_APP_STATE_KEY]?: unknown;
};

export function readEpisodesListAppStateFromUrlStorage(storage: IKbnUrlStateStorage): {
  filterState: EpisodesFilterState;
  timeRange?: TimeRange;
  histogramBreakdownField?: string;
} {
  const raw = storage.get<AppStateRecord>('_a')?.[EPISODES_LIST_APP_STATE_KEY];
  const { timeRange, histogramBreakdownField, ...filter } = decodeEpisodesListRecord(raw);
  return {
    filterState: { ...DEFAULT_EPISODES_LIST_FILTER, ...filter },
    ...(timeRange ? { timeRange } : {}),
    ...(histogramBreakdownField ? { histogramBreakdownField } : {}),
  };
}

export async function writeEpisodesListAppStateToUrlStorage(
  storage: IKbnUrlStateStorage,
  filter: EpisodesFilterState,
  timeRange: TimeRange,
  histogramBreakdownField?: string
): Promise<void> {
  const serialized = encodeEpisodesListRecord({ ...filter, timeRange, histogramBreakdownField });
  const appState = storage.get<AppStateRecord>('_a') ?? {};
  const {
    [EPISODES_LIST_APP_STATE_KEY]: _ignoredEpisodesListState,
    ...appStateWithoutEpisodesList
  } = appState;

  const nextAppState: AppStateRecord =
    Object.keys(serialized).length === 0
      ? appStateWithoutEpisodesList
      : { ...appStateWithoutEpisodesList, [EPISODES_LIST_APP_STATE_KEY]: serialized };

  await storage.set('_a', nextAppState, { replace: false });
}
