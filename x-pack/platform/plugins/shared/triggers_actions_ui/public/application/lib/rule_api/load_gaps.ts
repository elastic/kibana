/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { AsApiContract } from '@kbn/actions-plugin/common';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

export interface Gap {
  _id: string;
  range: {
    gte: string;
    lte: string;
  };
  filled_intervals: Array<{ gte: string; lte: string }>;
  in_progress_intervals: Array<{ gte: string; lte: string }>;
  unfilled_intervals: Array<{ gte: string; lte: string }>;
  status: string;
  total_gap_duration_ms: number;
  filled_duration_ms: number;
  in_progress_duration_ms: number;
  unfilled_duration_ms: number;
  '@timestamp': string;
}

export interface IGapResult {
  total: number;
  page: number;
  perPage: number;
  data: Gap[];
}

export interface LoadGapsProps {
  id: string;
}

export const loadGaps = async ({ id, http }: LoadGapsProps & { http: HttpSetup }) => {
  const end = new Date();
  const start = new Date(end).getTime() - 86400000; // Default to 24 hours ago

  const result = await http.post<AsApiContract<IGapResult>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/gaps/_find`,
    {
      body: JSON.stringify({
        rule_id: id,
        page: 1,
        per_page: 10,
        sort_field: '@timestamp',
        sort_order: 'desc',
        start: new Date(start).toISOString(),
        end: end.toISOString(),
        statuses: [],
      }),
    }
  );

  return result;
};
