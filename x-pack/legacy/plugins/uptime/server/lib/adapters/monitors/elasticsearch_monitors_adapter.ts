/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { INDEX_NAMES } from '../../../../common/constants';
import {
  MonitorChart,
  MonitorPageTitle,
  Ping,
  LocationDurationLine,
} from '../../../../common/graphql/types';
import { getHistogramIntervalFormatted } from '../../helper';
import { DatabaseAdapter } from '../database';
import { UMMonitorsAdapter } from './adapter_types';
import { MonitorDetails, MonitorError, OverviewFilters } from '../../../../common/runtime_types';
import { combineRangeWithFilters } from './combine_range_with_filters';
import { generateFilterAggs } from './generate_filter_aggs';
import { extractFilterAggsResults } from './extract_filter_aggs_results';

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

export class ElasticsearchMonitorsAdapter implements UMMonitorsAdapter {
  constructor(private readonly database: DatabaseAdapter) {
    this.database = database;
  }

  /**
   * Fetches data used to populate monitor charts
   * @param request Kibana request
   * @param monitorId ID value for the selected monitor
   * @param dateRangeStart timestamp bounds
   * @param dateRangeEnd timestamp bounds
   */
  public async getMonitorChartsData(
    request: any,
    monitorId: string,
    dateRangeStart: string,
    dateRangeEnd: string,
    location?: string | null
  ): Promise<MonitorChart> {
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

    const result = await this.database.search(request, params);

    const dateHistogramBuckets = get<any[]>(result, 'aggregations.timeseries.buckets', []);
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
      const x = get(dateHistogramBucket, 'key');
      const docCount = get(dateHistogramBucket, 'doc_count', 0);
      // a set of all the locations for the current bucket
      const bucketLocations = new Set<string>();

      dateHistogramBucket.location.buckets.forEach(
        (locationBucket: { key: string; duration: { avg: number } }) => {
          const locationName = locationBucket.key;
          // store the location name in each set
          bucketLocations.add(locationName);
          resultLocations.add(locationName);

          // create a new line for this location if it doesn't exist
          let currentLine: LocationDurationLine = get(linesByLocation, locationName);
          if (!currentLine) {
            currentLine = { name: locationName, line: [] };
            linesByLocation[locationName] = currentLine;
            monitorChartsData.locationDurationLines.push(currentLine);
          }
          // add the entry for the current location's duration average
          currentLine.line.push({ x, y: get(locationBucket, 'duration.avg', null) });
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
        formatStatusBuckets(x, get(dateHistogramBucket, 'status.buckets', []), docCount)
      );
    });

    return monitorChartsData;
  }

  /**
   * Fetch options for the filter bar.
   * @param request Kibana request object
   * @param dateRangeStart timestamp bounds
   * @param dateRangeEnd timestamp bounds
   */
  public async getFilterBar(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    filters: Record<string, any>,
    filterOptions: Record<string, string[] | number[]>
  ): Promise<OverviewFilters> {
    const aggs = generateFilterAggs(
      [
        { aggName: 'locations', filterName: 'locations', field: 'observer.geo.name' },
        { aggName: 'ports', filterName: 'ports', field: 'url.port' },
        { aggName: 'schemes', filterName: 'schemes', field: 'monitor.type' },
        { aggName: 'tags', filterName: 'tags', field: 'tags' },
      ],
      filterOptions
    );
    const filtersObj = combineRangeWithFilters(dateRangeStart, dateRangeEnd, filters);
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        size: 0,
        query: {
          ...filtersObj,
        },
        aggs,
      },
    };
    const { aggregations } = await this.database.search(request, params);

    return extractFilterAggsResults(aggregations, ['tags', 'locations', 'ports', 'schemes']);
  }

  /**
   * Fetch data for the monitor page title.
   * @param request Kibana server request
   * @param monitorId the ID to query
   */
  public async getMonitorPageTitle(
    request: any,
    monitorId: string
  ): Promise<MonitorPageTitle | null> {
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        query: {
          bool: {
            filter: {
              term: {
                'monitor.id': monitorId,
              },
            },
          },
        },
        sort: [
          {
            '@timestamp': {
              order: 'desc',
            },
          },
        ],
        size: 1,
      },
    };

    const result = await this.database.search(request, params);
    const pageTitle: Ping | null = get(result, 'hits.hits[0]._source', null);
    if (pageTitle === null) {
      return null;
    }
    return {
      id: get(pageTitle, 'monitor.id', null) || monitorId,
      url: get(pageTitle, 'url.full', null),
      name: get(pageTitle, 'monitor.name', null),
    };
  }

  public async getMonitorDetails(request: any, monitorId: string): Promise<MonitorDetails> {
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        size: 1,
        _source: ['error', '@timestamp'],
        query: {
          bool: {
            must: [
              {
                exists: {
                  field: 'error',
                },
              },
            ],
            filter: [
              {
                term: {
                  'monitor.id': monitorId,
                },
              },
            ],
          },
        },
        sort: [
          {
            '@timestamp': {
              order: 'desc',
            },
          },
        ],
      },
    };

    const result = await this.database.search(request, params);

    const data = result.hits.hits[0]?._source;

    const monitorError: MonitorError | undefined = data?.error;
    const errorTimeStamp: string | undefined = data?.['@timestamp'];

    return {
      monitorId,
      error: monitorError,
      timestamp: errorTimeStamp,
    };
  }
}
