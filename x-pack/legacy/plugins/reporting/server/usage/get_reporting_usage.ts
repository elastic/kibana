/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { ServerFacade, ExportTypesRegistry, ESCallCluster } from '../../types';
import {
  AggregationBuckets,
  AggregationResults,
  FeatureAvailabilityMap,
  JobTypes,
  KeyCountBucket,
  RangeAggregationResults,
  RangeStats,
} from './types';
import { decorateRangeStats } from './decorate_range_stats';
import { getExportTypesHandler } from './get_export_type_handler';

const JOB_TYPES_KEY = 'jobTypes';
const JOB_TYPES_FIELD = 'jobtype';
const LAYOUT_TYPES_KEY = 'layoutTypes';
const LAYOUT_TYPES_FIELD = 'meta.layout.keyword';
const OBJECT_TYPES_KEY = 'objectTypes';
const OBJECT_TYPES_FIELD = 'meta.objectType.keyword';
const STATUS_TYPES_KEY = 'statusTypes';
const STATUS_TYPES_FIELD = 'status';

const DEFAULT_TERMS_SIZE = 10;
const PRINTABLE_PDF_JOBTYPE = 'printable_pdf';

// indexes some key/count buckets by the "key" property
const getKeyCount = (buckets: KeyCountBucket[]): { [key: string]: number } =>
  buckets.reduce((accum, { key, doc_count: count }) => ({ ...accum, [key]: count }), {});

function getAggStats(aggs: AggregationResults) {
  const { buckets: jobBuckets } = aggs[JOB_TYPES_KEY] as AggregationBuckets;
  const jobTypes: JobTypes = jobBuckets.reduce(
    (accum: JobTypes, { key, doc_count: count }: { key: string; doc_count: number }) => {
      return {
        ...accum,
        [key]: {
          total: count,
        },
      };
    },
    {} as JobTypes
  );

  // merge pdf stats into pdf jobtype key
  const pdfJobs = jobTypes[PRINTABLE_PDF_JOBTYPE];
  if (pdfJobs) {
    const pdfAppBuckets = get(aggs[OBJECT_TYPES_KEY], '.pdf.buckets', []);
    const pdfLayoutBuckets = get(aggs[LAYOUT_TYPES_KEY], '.pdf.buckets', []);
    pdfJobs.app = getKeyCount(pdfAppBuckets) as {
      visualization: number;
      dashboard: number;
    };
    pdfJobs.layout = getKeyCount(pdfLayoutBuckets) as {
      print: number;
      preserve_layout: number;
    };
  }

  const all = aggs.doc_count as number;
  let statusTypes = {};
  const statusBuckets = get(aggs[STATUS_TYPES_KEY], 'buckets', []);
  if (statusBuckets) {
    statusTypes = getKeyCount(statusBuckets);
  }

  return { _all: all, status: statusTypes, ...jobTypes };
}

type RangeStatSets = Partial<
  RangeStats & {
    lastDay: RangeStats;
    last7Days: RangeStats;
  }
>;
async function handleResponse(
  server: ServerFacade,
  response: AggregationResults
): Promise<RangeStatSets> {
  const buckets = get(response, 'aggregations.ranges.buckets');
  if (!buckets) {
    return {};
  }
  const { lastDay, last7Days, all } = buckets as RangeAggregationResults;

  const lastDayUsage = lastDay ? getAggStats(lastDay) : ({} as RangeStats);
  const last7DaysUsage = last7Days ? getAggStats(last7Days) : ({} as RangeStats);
  const allUsage = all ? getAggStats(all) : ({} as RangeStats);

  return {
    last7Days: last7DaysUsage,
    lastDay: lastDayUsage,
    ...allUsage,
  };
}

export async function getReportingUsage(
  server: ServerFacade,
  callCluster: ESCallCluster,
  exportTypesRegistry: ExportTypesRegistry
) {
  const config = server.config();
  const reportingIndex = config.get('xpack.reporting.index');

  const params = {
    index: `${reportingIndex}-*`,
    filterPath: 'aggregations.*.buckets',
    body: {
      size: 0,
      aggs: {
        ranges: {
          filters: {
            filters: {
              all: { match_all: {} },
              lastDay: { range: { created_at: { gte: 'now-1d/d' } } },
              last7Days: { range: { created_at: { gte: 'now-7d/d' } } },
            },
          },
          aggs: {
            [JOB_TYPES_KEY]: { terms: { field: JOB_TYPES_FIELD, size: DEFAULT_TERMS_SIZE } },
            [STATUS_TYPES_KEY]: { terms: { field: STATUS_TYPES_FIELD, size: DEFAULT_TERMS_SIZE } },
            [OBJECT_TYPES_KEY]: {
              filter: { term: { jobtype: PRINTABLE_PDF_JOBTYPE } },
              aggs: { pdf: { terms: { field: OBJECT_TYPES_FIELD, size: DEFAULT_TERMS_SIZE } } },
            },
            [LAYOUT_TYPES_KEY]: {
              filter: { term: { jobtype: PRINTABLE_PDF_JOBTYPE } },
              aggs: { pdf: { terms: { field: LAYOUT_TYPES_FIELD, size: DEFAULT_TERMS_SIZE } } },
            },
          },
        },
      },
    },
  };

  return callCluster('search', params)
    .then((response: AggregationResults) => handleResponse(server, response))
    .then((usage: RangeStatSets) => {
      // Allow this to explicitly throw an exception if/when this config is deprecated,
      // because we shouldn't collect browserType in that case!
      const browserType = config.get('xpack.reporting.capture.browser.type');

      const xpackInfo = server.plugins.xpack_main.info;
      const exportTypesHandler = getExportTypesHandler(exportTypesRegistry);
      const availability = exportTypesHandler.getAvailability(xpackInfo) as FeatureAvailabilityMap;

      const { lastDay, last7Days, ...all } = usage;

      return {
        available: true,
        browser_type: browserType,
        enabled: true,
        lastDay: decorateRangeStats(lastDay, availability),
        last7Days: decorateRangeStats(last7Days, availability),
        ...decorateRangeStats(all, availability),
      };
    });
}
