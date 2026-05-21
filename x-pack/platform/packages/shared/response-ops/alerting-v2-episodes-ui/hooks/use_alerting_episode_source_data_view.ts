/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useAsync from 'react-use/lib/useAsync';
import { getEsqlDataView } from '@kbn/discover-utils';
import type { HttpStart } from '@kbn/core-http-browser';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';

export interface UseAlertingEpisodeSourceDataViewOptions {
  query?: string;
  services: {
    dataViews: DataViewsContract;
    http: HttpStart;
  };
}

/**
 * Creates an ad-hoc data view from the ES|QL query of the rule that produced
 * an alerting episode, so the episode source data can be rendered with the
 * correct field mappings.
 */
export const useAlertingEpisodeSourceDataView = ({
  query,
  services,
}: UseAlertingEpisodeSourceDataViewOptions) => {
  return useAsync(async () => {
    if (!query) return undefined;

    return await getEsqlDataView({ esql: query }, undefined, services);
  }, [services, query]);
};
