/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { DataView } from '@kbn/data-plugin/common';
import { useKibana } from '../common/lib/kibana';

const OSQUERY_RESULTS_DATA_VIEW_TITLE = 'logs-osquery_manager.result*';

export interface UseOsqueryDataViewResult {
  dataView: DataView | undefined;
  isLoading: boolean;
  error: Error | null;
}

interface UseOsqueryDataViewOptions {
  skip?: boolean;
}

export const useOsqueryDataView = (
  options: UseOsqueryDataViewOptions = {}
): UseOsqueryDataViewResult => {
  const { skip = false } = options;
  const dataViews = useKibana().services.data.dataViews;

  const { data, isLoading, error } = useQuery<DataView | undefined, Error>(
    ['osqueryResultsDataView'],
    async () => {
      let dataView: DataView | undefined;

      try {
        const existingDataViews = await dataViews.find(OSQUERY_RESULTS_DATA_VIEW_TITLE, 1);
        if (existingDataViews.length) {
          dataView = existingDataViews[0];
        }
      } catch {
        // Fallback to creating an ad-hoc DataView
      }

      if (!dataView && dataViews.getCanSaveSync()) {
        try {
          dataView = await dataViews.createAndSave({
            title: OSQUERY_RESULTS_DATA_VIEW_TITLE,
            timeFieldName: '@timestamp',
          });
        } catch {
          // Fallback to creating an ad-hoc DataView
        }
      }

      if (!dataView) {
        try {
          dataView = await dataViews.create({
            title: OSQUERY_RESULTS_DATA_VIEW_TITLE,
            timeFieldName: '@timestamp',
          });
        } catch {
          // DataView creation failed
        }
      }

      return dataView;
    },
    {
      enabled: !skip,
      retry: 1,
      staleTime: Infinity,
    }
  );

  return {
    dataView: data,
    isLoading,
    error: error ?? null,
  };
};
