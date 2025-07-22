/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AbortableAsyncState } from '@kbn/react-hooks';
import { SignificantEventsPreviewResponse, StreamQueryKql } from '@kbn/streams-schema';
import { useEuiTheme } from '@elastic/eui';
import { TickFormatter } from '@elastic/charts';
import { useMemo } from 'react';
import { formatChangePoint } from '../change_point';
import { getAnnotationFromFormattedChangePoint } from '../utils/get_annotation_from_formatted_change_point';

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

    const { id, kql, title } = queryValues;

    const change =
      changePoints && occurrences && id && kql && title
        ? formatChangePoint({
            change_points: changePoints,
            occurrences: timeseries,
            query: {
              id,
              kql,
              title,
            },
          })
        : undefined;

    return {
      timeseries,
      annotations: change
        ? [
            getAnnotationFromFormattedChangePoint({
              query: {
                id,
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
