/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_BASE_PATH } from '../../common/constants';
import type { RouteOptions } from '.';

export const registerSearchRoute = ({ router }: RouteOptions) => {
  router.get(
    {
      path: `${API_BASE_PATH}/search`,
      security: {
        authz: {
          enabled: false,
          reason: 'This route is only available to authenticated users',
        },
      },
      validate: false,
      options: {
        access: 'internal',
      },
    },
    async (_context, _request, response) => {
      return response.ok({
        body: {
          queries: [
            {
              taskId: 'XEp23txzlwkFlmpFTHnw',
              queryType: 'ES|QL',
              source: 'Dashboard',
              startTime: Date.now() - 5 * 3600000,
              indices: 250,
              remoteSearch: 'Local',
              query:
                "FROM kibana_sample_data_logs\n| WHERE @timestamp >= NOW() - 365d\n| STATS unique_users = COUNT_DISTINCT(user.id),\n  total_bytes = SUM(bytes) BY src.ip, dest.ip,\n  DATE_TRUNC('day', @timestamp)\n| SORT total_bytes DESC\n| LIMIT 1000",
            },
            {
              taskId: 'Rk7YmwBnVz3pQ9xLcNh2',
              queryType: 'DSL',
              source: 'Dashboard',
              startTime: Date.now() - 2 * 3600000,
              indices: 12,
              remoteSearch: 'Local',
              query:
                '{"query":{"bool":{"must":[{"range":{"@timestamp":{"gte":"now-7d"}}}],"filter":[{"term":{"status":"active"}}]}}}',
            },
            {
              taskId: 'Wm4KpxBnVz3pQ9xLcNh3',
              queryType: 'ES|QL',
              source: 'Rules',
              startTime: Date.now() - 10 * 3600000,
              indices: 1024,
              remoteSearch: 'Remote',
              query:
                'FROM metrics-*\n| WHERE host.name == "prod-server-01"\n| STATS avg_cpu = AVG(system.cpu.total.pct) BY host.name\n| SORT avg_cpu DESC',
            },
            {
              taskId: 'Yt9BqxBnVz3pQ9xLcNh4',
              queryType: 'Other',
              source: 'Watcher',
              startTime: Date.now() - 1 * 3600000,
              indices: 5,
              remoteSearch: 'Local',
              query: '{"query":{"match_all":{}}}',
            },
            {
              taskId: 'Zp2NsxBnVz3pQ9xLcNh5',
              queryType: 'DSL',
              source: 'Discover',
              startTime: Date.now() - 8 * 3600000,
              indices: 48,
              remoteSearch: 'Local',
              query:
                '{"aggs":{"daily_bytes":{"date_histogram":{"field":"@timestamp","calendar_interval":"day"},"aggs":{"total_bytes":{"sum":{"field":"bytes"}}}}}}',
            },
          ],
        },
      });
    }
  );
};
