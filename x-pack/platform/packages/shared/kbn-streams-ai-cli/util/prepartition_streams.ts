/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaClient } from '@kbn/kibana-api-cli';
import type { ElasticsearchClient } from '@kbn/core/server';
import { castArray } from 'lodash';
import { createStreamsRepositoryCliClient } from './create_repository_client';

export async function prepartitionStreams({
  kibanaClient,
  esClient,
  signal,
  filter,
}: {
  kibanaClient: KibanaClient;
  esClient: ElasticsearchClient;
  signal: AbortSignal;
  filter?: string | string[];
}) {
  const client = createStreamsRepositoryCliClient(kibanaClient);

  const filepaths = [
    'Android.log',
    'Apache.log',
    'BGL.log',
    'Hadoop.log',
    'HDFS.log',
    'HealthApp.log',
    'HPC.log',
    'Linux.log',
    'Mac.log',
    'OpenSSH.log',
    'OpenStack.log',
    'Proxifier.log',
    'Spark.log',
    'Thunderbird.log',
    'Windows.log',
    'Zookeeper.log',
  ].filter((log) => {
    return (
      filter === undefined ||
      filter.length === 0 ||
      castArray(filter)
        .map((val) => val.toLowerCase())
        .includes(log.split('.log')[0].toLowerCase())
    );
  });

  for (const filepath of filepaths) {
    await client.fetch('POST /api/streams/{name}/_fork 2023-10-31', {
      signal,
      params: {
        path: {
          name: 'logs',
        },
        body: {
          stream: {
            name: `logs.${filepath.split('.')[0].toLowerCase()}`,
          },
          if: {
            field: 'filepath',
            operator: 'eq',
            value: filepath,
          },
        },
      },
    });
  }
}
