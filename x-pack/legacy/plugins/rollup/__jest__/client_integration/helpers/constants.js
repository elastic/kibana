/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// This is the Rollup job we will be creating in our tests
// Components using the JobStatus component should still be able to render
// despite having a rollup job with an unknown status
export const JOB_TO_CREATE = {
  id: 'test-job',
  indexPattern: 'test-pattern-*',
  rollupIndex: 'rollup-index',
  interval: '24h',
};

export const JOBS = {
  jobs: [
    {
      config: {
        id: 'my-rollup-job',
        index_pattern: 'kibana_sample*',
        rollup_index: 'rollup-index',
        cron: '0 0 0 ? * 7',
        groups: {
          date_histogram: {
            interval: '24h',
            field: 'timestamp',
            delay: '1d',
            time_zone: 'UTC',
          },
        },
        metrics: [],
        timeout: '20s',
        page_size: 1000,
      },
      status: {
        job_state: 'stopped',
        upgraded_doc_id: true,
      },
      stats: {
        pages_processed: 0,
        documents_processed: 0,
        rollups_indexed: 0,
        trigger_count: 0,
        index_time_in_ms: 0,
        index_total: 0,
        index_failures: 0,
        search_time_in_ms: 0,
        search_total: 0,
        search_failures: 0,
      },
    },
    {
      config: {
        id: 'my-rollup-job',
        index_pattern: 'kibana_sample*',
        rollup_index: 'rollup-index',
        cron: '0 0 0 ? * 7',
        groups: {
          date_histogram: {
            interval: '24h',
            field: 'timestamp',
            delay: '1d',
            time_zone: 'UTC',
          },
        },
        metrics: [],
        timeout: '20s',
        page_size: 1000,
      },
      status: {
        job_state: 'not_a_known_state',
        upgraded_doc_id: true,
      },
      stats: {
        pages_processed: 0,
        documents_processed: 0,
        rollups_indexed: 0,
        trigger_count: 0,
        index_time_in_ms: 0,
        index_total: 0,
        index_failures: 0,
        search_time_in_ms: 0,
        search_total: 0,
        search_failures: 0,
      },
    },
  ],
};

export const JOB_TO_CLONE = {
  jobs: [
    {
      config: {
        id: 't2',
        index_pattern: 'k*',
        rollup_index: 't2',
        cron: '0 0 0 ? * 7',
        groups: {
          date_histogram: {
            calendar_interval: '1s',
            field: '@timestamp',
            delay: '1d',
            time_zone: 'UTC',
          },
          histogram: { interval: 5, fields: ['phpmemory'] },
          terms: {
            fields: ['geo.dest', 'machine.os.keyword', 'memory', 'message.keyword', 'referer'],
          },
        },
        metrics: [
          { field: 'bytes', metrics: ['avg', 'max'] },
          { field: 'timestamp', metrics: ['value_count', 'min'] },
        ],
        timeout: '20s',
        page_size: 1000,
      },
      status: { job_state: 'stopped' },
      stats: {
        pages_processed: 0,
        documents_processed: 0,
        rollups_indexed: 0,
        trigger_count: 0,
        index_time_in_ms: 0,
        index_total: 0,
        index_failures: 0,
        search_time_in_ms: 0,
        search_total: 0,
        search_failures: 0,
      },
    },
  ],
};

export const JOB_CLONE_INDEX_PATTERN_CHECK = {
  doesMatchIndices: true,
  doesMatchRollupIndices: false,
  dateFields: ['utc_time', 'timestamp', '@timestamp'],
  numericFields: ['memory', 'machine.ram', 'phpmemory', 'bytes'],
  keywordFields: [
    'referer',
    'tags.keyword',
    'geo.dest',
    'response.keyword',
    'agent.keyword',
    'extension.keyword',
    'machine.os.keyword',
    'host.keyword',
    'geo.srcdest',
    'request.keyword',
    'geo.src',
    'index.keyword',
    'url.keyword',
    'message.keyword',
  ],
};
