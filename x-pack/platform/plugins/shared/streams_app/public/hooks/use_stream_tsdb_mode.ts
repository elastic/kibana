/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortableAsync } from '@kbn/react-hooks';
import { useKibana } from './use_kibana';

/**
 * Hook to check if a stream is in TSDB (Time Series DataBase) mode.
 * When in TSDB mode, ES|QL queries should use `TS` instead of `FROM`.
 *
 * @param streamName - The name of the stream to check
 * @returns Object containing isTSDBMode boolean and loading state
 */
export function useStreamTSDBMode(streamName: string) {
  const { dependencies } = useKibana();
  const { data } = dependencies.start;

  const { value: isTSDBMode, loading } = useAbortableAsync(
    async ({ signal }) => {
      try {
        const dataView = await data.dataViews.create(
          {
            title: streamName,
            timeFieldName: '@timestamp',
          },
          undefined,
          false
        );
        return dataView.isTSDBMode();
      } catch (err) {
        // Silently handle errors for new streams that don't have indices yet
        return false;
      }
    },
    [data.dataViews, streamName]
  );

  return {
    isTSDBMode: isTSDBMode ?? false,
    loading,
  };
}
