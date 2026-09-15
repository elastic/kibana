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
  fields?: Array<{
    name: string;
    type: string;
    esTypes?: string[];
    searchable?: boolean;
    aggregatable?: boolean;
  }>;
}

export interface FetchClassicSearchFieldsOptions extends BaseRacOptions {
  services: { http: HttpStart };
}

/**
 * Fetches field descriptors for the classic (v1) alert indices that match the
 * given rule type ids, reshaped to the minimal `EpisodeSearchField` format
 * consumed by the episodes KQL search bar autocomplete.
 */
export const fetchClassicSearchFields = async ({
  ruleTypeIds,
  services,
}: FetchClassicSearchFieldsOptions): Promise<EpisodeSearchField[]> => {
  const response = await services.http.get<BrowserFieldsResponse>(
    `${BASE_RAC_ALERTS_API_PATH}/browser_fields`,
    { query: { ruleTypeIds } }
  );

  return (response.fields ?? []).map((f) => ({
    name: f.name,
    type: f.type,
    esTypes: f.esTypes ?? ['keyword'],
    searchable: f.searchable ?? true,
    aggregatable: f.aggregatable ?? true,
  }));
};
