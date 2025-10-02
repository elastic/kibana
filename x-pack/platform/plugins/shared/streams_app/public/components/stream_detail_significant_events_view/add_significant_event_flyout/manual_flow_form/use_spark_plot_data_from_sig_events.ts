/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AbortableAsyncState } from '@kbn/react-hooks';
import type { SignificantEventsPreviewResponse, StreamQueryKql } from '@kbn/streams-schema';
import { useEuiTheme } from '@elastic/eui';
import type { TickFormatter } from '@elastic/charts';
import { useMemo } from 'react';
import { formatChangePoint } from '../../utils/change_point';
import { getAnnotationFromFormattedChangePoint } from '../../utils/get_annotation_from_formatted_change_point';

export function useSparkplotDataFromSigEvents({
  previewFetch,
  queryValues,
  xFormatter,
}: {
  previewFetch: AbortableAsyncState<Promise<SignificantEventsPreviewResponse>>;
  queryValues: Partial<StreamQueryKql> & { id: string };
  xFormatter: TickFormatter;
}) {
  const theme = useEuiTheme().euiTheme;

  return useMemo(() => {
    const changePoints = previewFetch.value?.change_points;
    const occurrences = previewFetch.value?.occurrences;

    const timeseries =
      occurrences?.map(({ date, count }) => {
        return {
          x: new Date(date).getTime(),
          y: count,
        };
      }) ?? [];

    const change =
      changePoints && occurrences
        ? formatChangePoint({
            change_points: changePoints,
            occurrences: timeseries,
          })
        : undefined;

    return {
      timeseries,
      annotations: change
        ? [
            getAnnotationFromFormattedChangePoint({
              query: {
                id: queryValues.id,
              },
              change,
              theme,
              xFormatter,
            }),
          ]
        : [],
    };
  }, [previewFetch, xFormatter, queryValues, theme]);
}
