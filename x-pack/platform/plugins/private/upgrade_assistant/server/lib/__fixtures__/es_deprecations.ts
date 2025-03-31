/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getMockEsDeprecations = () => {
  return {
    cluster_settings: [],
    node_settings: [],
    ml_settings: [],
    index_settings: {},
    data_streams: {},
    ilm_policies: {},
    templates: {},
  };
};

export const getMockMlSettingsDeprecations = () => {
  return {
    ml_settings: [
      {
        level: 'warning',
        message: 'Datafeed [deprecation-datafeed] uses deprecated query options',
        url: 'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-7.0.html#breaking_70_search_changes',
        details:
          '[Deprecated field [use_dis_max] used, replaced by [Set [tie_breaker] to 1 instead]]',
        // @ts-ignore
        resolve_during_rolling_upgrade: false,
      },
      {
        level: 'critical',
        message:
          'model snapshot [1] for job [deprecation_check_job] needs to be deleted or upgraded',
        url: '',
        details: 'details',
        // @ts-ignore
        _meta: { snapshot_id: '1', job_id: 'deprecation_check_job' },
        // @ts-ignore
        resolve_during_rolling_upgrade: false,
      },
    ],
  };
};

export const getMockDataStreamDeprecations = () => {
  return {
    data_streams: {
      'my-v7-data-stream': [
        {
          level: 'critical',
          message: 'Old data stream with a compatibility version < 8.0',
          url: 'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-9.0.html',
          details:
            'This data stream has backing indices that were created before Elasticsearch 8.0.0',
          resolve_during_rolling_upgrade: false,
          _meta: {
            backing_indices: {
              count: 52,
              need_upgrading: {
                count: 37,
                searchable_snapshot: {
                  count: 23,
                  fully_mounted: {
                    count: 7,
                  },
                  partially_mounted: {
                    count: 16,
                  },
                },
              },
            },
          },
        },
      ],
    },
  };
};
