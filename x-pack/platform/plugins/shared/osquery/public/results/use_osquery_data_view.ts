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

  const { data, isLoading, isFetching, error } = useQuery<DataView | undefined, Error>(
    ['osqueryResultsDataView'],
    async () => {
      let dataView: DataView | undefined;

      try {
        const existingDataViews = await dataViews.find(OSQUERY_RESULTS_DATA_VIEW_TITLE, 1);
        if (existingDataViews.length) {
          dataView = existingDataViews[0];
        }
      } catch (err) {
        // Ignore not-found / permission errors and fall through to create
        if (err?.statusCode !== 403 && err?.statusCode !== 404) {
          throw err;
        }
      }

      if (!dataView && dataViews.getCanSaveSync()) {
        try {
          dataView = await dataViews.createAndSave({
            title: OSQUERY_RESULTS_DATA_VIEW_TITLE,
            timeFieldName: '@timestamp',
          });
        } catch (err) {
          // Ignore conflict (already exists) or permission errors; fall through to ad-hoc
          if (err?.statusCode !== 403 && err?.statusCode !== 409) {
            throw err;
          }
        }
      }

      if (!dataView) {
        // Ad-hoc (unsaved) data view — works regardless of permissions
        dataView = await dataViews.create({
          title: OSQUERY_RESULTS_DATA_VIEW_TITLE,
          timeFieldName: '@timestamp',
        });
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
    isLoading: isLoading && isFetching,
    error: error ?? null,
  };
};
