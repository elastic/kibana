/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';

export const logsNginx: IngestPutPipelineRequest = {
  id: 'logs-nginx@default-pipeline',
  processors: [
    {
      append: {
        field: 'labels.elastic.pipelines',
        value: ['logs-nginx@default-pipeline'],
      },
    },
    {
      reroute: {
        if: "ctx.log?.level == 'INFO'",
        dataset: 'nginx.access',
      },
    },
    {
      reroute: {
        if: "ctx.log?.level == 'ERROR'",
        dataset: 'nginx.errors',
      },
    },
  ],
  version: 1,
};
