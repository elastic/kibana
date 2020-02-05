/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { INDEX_NAMES, UNNAMED_LOCATION } from '../../../../common/constants';
import { MonitorChart, LocationDurationLine } from '../../../../common/graphql/types';
import { getHistogramIntervalFormatted } from '../../helper';
import { MonitorError, MonitorLocation } from '../../../../common/runtime_types';
import { UMMonitorsAdapter } from './adapter_types';
import { generateFilterAggs } from './generate_filter_aggs';
import { OverviewFilters } from '../../../../common/runtime_types';

export const combineRangeWithFilters = (
  dateRangeStart: string,
  dateRangeEnd: string,
  filters?: Record<string, any>
) => {
  const range = {
    range: {
      '@timestamp': {
        gte: dateRangeStart,
        lte: dateRangeEnd,
      },
    },
  };
  if (!filters) return range;
  const clientFiltersList = Array.isArray(filters?.bool?.filter ?? {})
    ? // i.e. {"bool":{"filter":{ ...some nested filter objects }}}
      filters.bool.filter
    : // i.e. {"bool":{"filter":[ ...some listed filter objects ]}}
      Object.keys(filters?.bool?.filter ?? {}).map(key => ({
        ...filters?.bool?.filter?.[key],
      }));
  filters.bool.filter = [...clientFiltersList, range];
  return filters;
};

type SupportedFields = 'locations' | 'ports' | 'schemes' | 'tags';

export const extractFilterAggsResults = (
  responseAggregations: Record<string, any>,
  keys: SupportedFields[]
): OverviewFilters => {
  const values: OverviewFilters = {
    locations: [],
    ports: [],
    schemes: [],
    tags: [],
  };
  keys.forEach(key => {
    const buckets = responseAggregations[key]?.term?.buckets ?? [];
    values[key] = buckets.map((item: { key: string | number }) => item.key);
  });
  return values;
};

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

export const elasticsearchMonitorsAdapter: UMMonitorsAdapter = {
  getMonitorChartsData: async ({ callES, dateRangeStart, dateRangeEnd, monitorId, location }) => {
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
  },

  getFilterBar: async ({ callES, dateRangeStart, dateRangeEnd, search, filterOptions }) => {
    const aggs = generateFilterAggs(
      [
        { aggName: 'locations', filterName: 'locations', field: 'observer.geo.name' },
        { aggName: 'ports', filterName: 'ports', field: 'url.port' },
        { aggName: 'schemes', filterName: 'schemes', field: 'monitor.type' },
        { aggName: 'tags', filterName: 'tags', field: 'tags' },
      ],
      filterOptions
    );
    const filters = combineRangeWithFilters(dateRangeStart, dateRangeEnd, search);
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        size: 0,
        query: {
          ...filters,
        },
        aggs,
      },
    };

    const { aggregations } = await callES('search', params);
    return extractFilterAggsResults(aggregations, ['tags', 'locations', 'ports', 'schemes']);
  },

  getMonitorDetails: async ({ callES, monitorId, dateStart, dateEnd }) => {
    const queryFilters: any = [
      {
        range: {
          '@timestamp': {
            gte: dateStart,
            lte: dateEnd,
          },
        },
      },
      {
        term: {
          'monitor.id': monitorId,
        },
      },
    ];

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
            filter: queryFilters,
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

    const result = await callES('search', params);

    const data = result.hits.hits[0]?._source;

    const monitorError: MonitorError | undefined = data?.error;
    const errorTimeStamp: string | undefined = data?.['@timestamp'];

    return {
      monitorId,
      error: monitorError,
      timestamp: errorTimeStamp,
    };
  },

  getMonitorLocations: async ({ callES, monitorId, dateStart, dateEnd }) => {
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              {
                match: {
                  'monitor.id': monitorId,
                },
              },
              {
                exists: {
                  field: 'summary',
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: dateStart,
                    lte: dateEnd,
                  },
                },
              },
            ],
          },
        },
        aggs: {
          location: {
            terms: {
              field: 'observer.geo.name',
              missing: '__location_missing__',
            },
            aggs: {
              most_recent: {
                top_hits: {
                  size: 1,
                  sort: {
                    '@timestamp': {
                      order: 'desc',
                    },
                  },
                  _source: ['monitor', 'summary', 'observer', '@timestamp'],
                },
              },
            },
          },
        },
      },
    };

    const result = await callES('search', params);
    const locations = result?.aggregations?.location?.buckets ?? [];

    const getGeo = (locGeo: { name: string; location?: string }) => {
      if (locGeo) {
        const { name, location } = locGeo;
        const latLon = location?.trim().split(',');
        return {
          name,
          location: latLon
            ? {
                lat: latLon[0],
                lon: latLon[1],
              }
            : undefined,
        };
      } else {
        return {
          name: UNNAMED_LOCATION,
        };
      }
    };

    const monLocs: MonitorLocation[] = [];
    locations.forEach((loc: any) => {
      const mostRecentLocation = loc.most_recent.hits.hits[0]._source;
      const location: MonitorLocation = {
        summary: mostRecentLocation?.summary,
        geo: getGeo(mostRecentLocation?.observer?.geo),
        timestamp: mostRecentLocation['@timestamp'],
      };
      monLocs.push(location);
    });

    return {
      monitorId,
      locations: monLocs,
    };
  },
};
