/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SignificantEventsPreviewResponse, StreamQueryKql } from '@kbn/streams-schema';
import moment from 'moment';
import { TimeRange, getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import { calculateAuto } from '@kbn/calculate-auto';
import { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../hooks/use_kibana';
import { formatChangePoint } from '../change_point';
import { getAnnotationFromFormattedChangePoint } from '../utils/get_annotation_from_formatted_change_point';

interface SignificantEventSuggestionPreview {
  suggestion: StreamQueryKql;
  timeseries?: Array<{
    x: number;
    y: number;
  }>;
  empty?: boolean;
  annotations?: Array<{
    color: string;
    icon: JSX.Element;
    id: string;
    label: string;
    x: number;
  }>;
}

export function useSignificantEventSuggestionPreviews({
  name,
  suggestions,
  timeRange,
}: {
  name: string;
  suggestions: StreamQueryKql[];
  timeRange: TimeRange;
}) {
  const {
    dependencies: {
      start: { streams },
    },
  } = useKibana();

  const theme = useEuiTheme().euiTheme;

  const previewFetch = useStreamsAppFetch(
    ({ signal }): Promise<SignificantEventsPreviewResponse[]> => {
      const { from, to } = getAbsoluteTimeRange(timeRange);

      const bucketSize = calculateAuto
        .near(50, moment.duration(moment(to).diff(from)))
        ?.asSeconds()!;

      return Promise.all(
        suggestions.map(({ id, kql, title }) =>
          streams.streamsRepositoryClient.fetch(
            `POST /api/streams/{name}/significant_events/_preview`,
            {
              signal,
              params: {
                path: {
                  name,
                },
                query: {
                  bucketSize: `${bucketSize}s`,
                  from,
                  to,
                },
                body: {
                  query: {
                    id,
                    kql,
                    title,
                  },
                },
              },
            }
          )
        )
      );
    },
    [timeRange, name, suggestions, streams.streamsRepositoryClient]
  );

  const sparkplots = useMemo(() => {
    return previewFetch.value?.map((result) => {
      const changePoints = result.change_points;
      const occurrences = result.occurrences;
      const { id, kql, title } = result;

      const timeseries =
        occurrences?.map(({ date, count }) => {
          return {
            x: new Date(date).getTime(),
            y: count,
          };
        }) ?? [];

      const hasAnyData = timeseries.find((coord) => coord.y > 0);

      const change =
        changePoints && occurrences
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
        id,
        timeseries,
        empty: !hasAnyData,
        annotations: change
          ? [
              getAnnotationFromFormattedChangePoint({
                query: {
                  id,
                },
                change,
                theme,
              }),
            ]
          : [],
      };
    });
  }, [previewFetch.value, theme]);

  const suggestionsWithSparkplots = useMemo((): SignificantEventSuggestionPreview[] => {
    const sparkplotsById = new Map(sparkplots?.map(({ id, ...sparkplot }) => [id, sparkplot]));

    return suggestions.map((suggestion) => {
      const sparkplot = sparkplotsById.get(suggestion.id);
      return {
        suggestion,
        ...sparkplot,
      };
    });
  }, [suggestions, sparkplots]);

  return suggestionsWithSparkplots;
}
