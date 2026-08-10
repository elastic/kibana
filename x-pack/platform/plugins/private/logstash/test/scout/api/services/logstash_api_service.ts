/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutLogger } from '@kbn/scout';
import type { Client } from '@elastic/elasticsearch';

export interface LogstashApiService {
  /**
   * Creates one or more minimal Logstash pipelines by ID via the ES Logstash Pipeline Management API.
   */
  createPipelines: (...ids: string[]) => Promise<void>;
  /**
   * Deletes one or more Logstash pipelines by ID using the ES Logstash Pipeline Management API.
   * Silently ignores 404s so it is safe to call in afterAll even when setup failed partway through.
   */
  deletePipelines: (...ids: string[]) => Promise<void>;
}

// ES accepts an empty settings object at runtime; the TS type is overly strict
type PipelineSettings = import('@elastic/elasticsearch').estypes.LogstashPipelineSettings;
const EMPTY_PIPELINE_SETTINGS = {} as unknown as PipelineSettings;

export const getLogstashApiService = ({
  log,
  esClient,
}: {
  log: ScoutLogger;
  esClient: Client;
}): LogstashApiService => {
  return {
    createPipelines: async (...ids: string[]) => {
      for (const id of ids) {
        log.debug(`[logstash] Creating pipeline '${id}'`);
        await esClient.logstash.putPipeline({
          id,
          pipeline: {
            description: `pipeline ${id}`,
            last_modified: new Date().toISOString(),
            pipeline: '# empty',
            pipeline_metadata: { type: 'logstash_pipeline', version: '1' },
            pipeline_settings: EMPTY_PIPELINE_SETTINGS,
            username: 'elastic',
          },
        });
      }
    },

    deletePipelines: async (...ids: string[]) => {
      for (const id of ids) {
        log.debug(`[logstash] Deleting pipeline '${id}'`);
        await esClient.logstash.deletePipeline({ id }).catch((err) => {
          if (err?.statusCode !== 404) {
            log.warning(`[logstash] Failed to delete pipeline '${id}': ${err?.message}`);
          }
        });
      }
    },
  };
};
