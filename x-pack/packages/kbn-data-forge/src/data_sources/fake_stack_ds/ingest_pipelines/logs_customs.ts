/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  ADMIN_CONSOLE,
  HEARTBEAT,
  MESSAGE_PROCESSOR,
  MONGODB,
  NGINX_PROXY,
} from '../../fake_stack/common/constants';

export const logsCustom: IngestPutPipelineRequest = {
  id: 'logs@custom',
  processors: [
    {
      set: {
        field: 'event.ingested',
        value: '{{{_ingest.timestamp}}}',
      },
    },
    {
      json: {
        field: 'message',
        ignore_failure: true,
        add_to_root: true,
      },
    },
    {
      append: {
        field: 'labels.elastic.pipelines',
        value: ['logs@custom'],
      },
    },
    {
      reroute: {
        if: `ctx.log?.logger == '${NGINX_PROXY}'`,
        dataset: 'nginx',
      },
    },
    {
      reroute: {
        if: `ctx.log?.logger == '${MONGODB}'`,
        dataset: MONGODB,
      },
    },
    {
      reroute: {
        if: `ctx.log?.logger == '${ADMIN_CONSOLE}'`,
        dataset: 'admin.console',
      },
    },
    {
      reroute: {
        if: `ctx.log?.logger == '${HEARTBEAT}'`,
        dataset: HEARTBEAT,
      },
    },
    {
      reroute: {
        if: `ctx.log?.logger == '${MESSAGE_PROCESSOR}'`,
        dataset: MESSAGE_PROCESSOR,
      },
    },
  ],
  version: 1,
};
