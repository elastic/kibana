/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import { INDEX_NAMES } from '../../../common/constants';
import { getHistogramIntervalFormatted } from '../helper';
import { MonitorChart, LocationDurationLine } from '../../../common/graphql/types';

export interface GetMonitorChartsParams {
  /** @member monitorId ID value for the selected monitor */
  monitorId: string;
  /** @member dateRangeStart timestamp bounds */
  dateRangeStart: string;
  /** @member dateRangeEnd timestamp bounds */
  dateRangeEnd: string;
  /** @member location optional location value for use in filtering*/
  location?: string | null;
}

const formatStatusBuckets = (time: any, buckets: any, docCount: any) => {
  let up = null;
  let down = null;

  buckets.forEach((bucket: any) => {
    if (bucket.key === 'up') {
      up = bucket.doc_count;
    } else if (bucket.key === 'down') {
      down = bucket.doc_count;
    }
  });

  return {
    x: time,
    up,
    down,
    total: docCount,
  };
};

/**
 * Fetches data used to populate monitor charts
 */
export const getMonitorCharts: UMElasticsearchQueryFn<
  GetMonitorChartsParams,
  MonitorChart
> = async ({ callES, dateRangeStart, dateRangeEnd, monitorId, location }) => {
  const params = {
    index: INDEX_NAMES.HEARTBEAT,
    body: {
      query: {
        bool: {
          filter: [
            { range: { '@timestamp': { gte: dateRangeStart, lte: dateRangeEnd } } },
            { term: { 'monitor.id': monitorId } },
            { term: { 'monitor.status': 'up' } },
            // if location is truthy, add it as a filter. otherwise add nothing
            ...(!!location ? [{ term: { 'observer.geo.name': location } }] : []),
          ],
        },
      },
      size: 0,
      aggs: {
        timeseries: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: getHistogramIntervalFormatted(dateRangeStart, dateRangeEnd),
            min_doc_count: 0,
          },
          aggs: {
            location: {
              terms: {
                field: 'observer.geo.name',
                missing: 'N/A',
              },
              aggs: {
                status: { terms: { field: 'monitor.status', size: 2, shard_size: 2 } },
                duration: { stats: { field: 'monitor.duration.us' } },
              },
            },
          },
        },
      },
    },
  };

  const result = await callES('search', params);

  const dateHistogramBuckets: any[] = result?.aggregations?.timeseries?.buckets ?? [];

  /**
   * The code below is responsible for formatting the aggregation data we fetched above in a way
   * that the chart components used by the client understands.
   * There are five required values. Two are lists of points that conform to a simple (x,y) structure.
   *
   * The third list is for an area chart expressing a range, and it requires an (x,y,y0) structure,
   * where y0 is the min value for the point and y is the max.
   *
   * Additionally, we supply the maximum value for duration and status, so the corresponding charts know
   * what the domain size should be.
   */
  const monitorChartsData: MonitorChart = {
    locationDurationLines: [],
    status: [],
    durationMaxValue: 0,
    statusMaxCount: 0,
  };

  /**
   * The following section of code enables us to provide buckets per location
   * that have a `null` value if there is no data at the given timestamp.
   *
   * We maintain two `Set`s. One is per bucket, the other is persisted for the
   * entire collection. At the end of a bucket's evaluation, if there was no object
   * parsed for a given location line that was already started, we insert an element
   * to the given line with a null value. Without this, our charts on the client will
   * display a continuous line for each of the points they are provided.
   */

  // a set of all the locations found for this result
  const resultLocations = new Set<string>();
  const linesByLocation: { [key: string]: LocationDurationLine } = {};
  dateHistogramBuckets.forEach(dateHistogramBucket => {
    const x = dateHistogramBucket.key;
    const docCount = dateHistogramBucket?.doc_count ?? 0;
    // a set of all the locations for the current bucket
    const bucketLocations = new Set<string>();

    dateHistogramBucket.location.buckets.forEach(
      (locationBucket: { key: string; duration: { avg: number } }) => {
        const locationName = locationBucket.key;
        // store the location name in each set
        bucketLocations.add(locationName);
        resultLocations.add(locationName);

        // create a new line for this location if it doesn't exist
        let currentLine: LocationDurationLine = linesByLocation?.[locationName] ?? undefined;
        if (!currentLine) {
          currentLine = { name: locationName, line: [] };
          linesByLocation[locationName] = currentLine;
          monitorChartsData.locationDurationLines.push(currentLine);
        }
        // add the entry for the current location's duration average
        currentLine.line.push({ x, y: locationBucket?.duration?.avg ?? null });
      }
    );

    // if there are more lines in the result than are represented in the current bucket,
    // we must add null entries
    if (dateHistogramBucket.location.buckets.length < resultLocations.size) {
      resultLocations.forEach(resultLocation => {
        // the current bucket has a value for this location, do nothing
        if (location && location !== resultLocation) return;
        // the current bucket had no value for this location, insert a null value
        if (!bucketLocations.has(resultLocation)) {
          const locationLine = monitorChartsData.locationDurationLines.find(
            ({ name }) => name === resultLocation
          );
          // in practice, there should always be a line present, but `find` can return `undefined`
          if (locationLine) {
            // this will create a gap in the line like we desire
            locationLine.line.push({ x, y: null });
          }
        }
      });
    }

    monitorChartsData.status.push(
      formatStatusBuckets(x, dateHistogramBucket?.status?.buckets ?? [], docCount)
    );
  });

  return monitorChartsData;
};
