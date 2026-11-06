/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { TimeRange } from '@kbn/es-query';
import type { EpisodesFilterState } from '../../queries/episodes_query';
import type { HistogramEpisodeRow } from '../../utils/histogram_utils';
import { buildClassicAlertsQuery } from '../utils/query';
import {
  type ClassicAlertSource,
  mapClassicAlertToHistogramRow,
  CLASSIC_ALERT_HISTOGRAM_SOURCE_FIELDS,
} from '../utils/map_alert';
import { CLASSIC_ALERTS_HISTOGRAM_LIMIT } from '../constants';
import { type BaseRacOptions, findClassicAlerts, toTimeRangeParam } from './rac_find';

export interface FetchClassicAlertsHistogramOptions extends BaseRacOptions {
  timeRange?: TimeRange | null;
  filterState?: EpisodesFilterState;
  breakdownField?: string;
  abortSignal?: AbortSignal;
  services: { http: HttpStart };
}

/** Returns classic alert histogram rows (RBAC enforced by the RAC alerts API). */
export const fetchClassicAlertsHistogram = async ({
  ruleTypeIds,
  timeRange,
  filterState,
  breakdownField,
  abortSignal,
  services: { http },
}: FetchClassicAlertsHistogramOptions): Promise<HistogramEpisodeRow[]> => {
  const response = await findClassicAlerts(
    http,
    {
      rule_type_ids: ruleTypeIds,
      query: buildClassicAlertsQuery(filterState, toTimeRangeParam(timeRange)),
      size: CLASSIC_ALERTS_HISTOGRAM_LIMIT,
      track_total_hits: false,
      _source: [...CLASSIC_ALERT_HISTOGRAM_SOURCE_FIELDS],
    },
    abortSignal
  );

  return response.hits.hits.flatMap((hit) =>
    hit._source
      ? [
          mapClassicAlertToHistogramRow(
            hit._source as unknown as ClassicAlertSource,
            breakdownField
          ),
        ]
      : []
  );
};
