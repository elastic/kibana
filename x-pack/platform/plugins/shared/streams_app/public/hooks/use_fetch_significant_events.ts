/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateAuto } from '@kbn/calculate-auto';
import moment from 'moment';
import type { SignificantEventsResponse, StreamQuery } from '@kbn/streams-schema';
import { useKibana } from './use_kibana';
import { useStreamsAppFetch } from './use_streams_app_fetch';

export interface SignificantEventItem {
  title: string;
  query: StreamQuery;
  occurrences: Array<{ x: number; y: number }>;
  change_points: SignificantEventsResponse['change_points'];
}

export const useFetchSignificantEvents = ({
  name,
  start,
  end,
}: {
  name: string;
  start: number;
  end: number;
}) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
        data,
      },
    },
  } = useKibana();

  const result = useStreamsAppFetch(
    async ({ signal }): Promise<undefined | SignificantEventItem[]> => {
      const isoFrom = new Date(start).toISOString();
      const isoTo = new Date(end).toISOString();

      const { min, max } = data.query.timefilter.timefilter.calculateBounds({
        from: isoFrom,
        to: isoTo,
      });

      if (!min || !max) {
        return undefined;
      }

      const bucketSize = calculateAuto.near(50, moment.duration(max.diff(min)));
      if (!bucketSize) {
        return undefined;
      }

      const intervalString = `${bucketSize.asSeconds()}s`;

      const response = await streamsRepositoryClient
        .fetch('GET /api/streams/{name}/significant_events 2023-10-31', {
          params: {
            path: { name },
            query: {
              from: isoFrom,
              to: isoTo,
              bucketSize: intervalString,
            },
          },
          signal,
        })
        .then((res) => {
          return res.map((series) => {
            const { occurrences, change_points: changePoints, ...query } = series;
            return {
              title: query.title,
              query,
              change_points: changePoints,
              occurrences: occurrences.map((occurrence) => ({
                x: new Date(occurrence.date).getTime(),
                y: occurrence.count,
              })),
            };
          });
        });

      return response;
    },
    [name, start, end, streamsRepositoryClient, data.query.timefilter]
  );

  return result;
};
