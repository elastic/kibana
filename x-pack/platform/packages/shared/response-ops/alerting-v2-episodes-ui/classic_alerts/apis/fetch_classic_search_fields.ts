/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common';
import type { EpisodeSearchField } from '../../types/episode_data_source';
import type { BaseRacOptions } from './rac_find';

interface BrowserFieldsResponse {
  fields?: EpisodeSearchField[];
}

export interface FetchClassicSearchFieldsOptions extends BaseRacOptions {
  services: { http: HttpStart };
  abortSignal?: AbortSignal;
}

/**
 * Fetches the searchable alert fields for the given classic rule types. Pass a
 * narrower `ruleTypeIds` to scope the fields to specific rules rather than every
 * rule type the table covers.
 */
export const fetchClassicSearchFields = async ({
  ruleTypeIds,
  services,
  abortSignal,
}: FetchClassicSearchFieldsOptions): Promise<EpisodeSearchField[]> => {
  const response = await services.http.get<BrowserFieldsResponse>(
    `${BASE_RAC_ALERTS_API_PATH}/browser_fields`,
    { query: { ruleTypeIds }, signal: abortSignal }
  );

  return response.fields ?? [];
};
