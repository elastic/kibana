/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ConnectionConfig } from '../seed_ki_sample_data/lib/connection_config';
import { kibanaRequest } from '../seed_ki_sample_data/lib/kibana';
import type { EvalConfig } from './config';

export type KibanaCall = <T>(
  method: string,
  path: string,
  body?: unknown,
  options?: { timeoutMs?: number; allowStatuses?: number[] }
) => Promise<{ status: number; data: T }>;

export interface StageContext {
  config: EvalConfig;
  log: ToolingLog;
  esClient: Client;
  kibana: KibanaCall;
  /** The run the run and evaluate stages write to and read from. */
  runId: string;
  /** AI indices to work on; all in the config unless `--ai-index` narrows them. */
  aiIndexIds: string[];
  forceDownload: boolean;
  judgeConnectorId?: string;
  /** What the load stage loads: a shared run folder, an AI index folder, or a `kis.json`. */
  loadFrom?: string;
}

/** Calls Kibana in the config's space, and throws on a status the caller does not expect. */
export const createKibanaCall =
  (connection: ConnectionConfig, space: string): KibanaCall =>
  async <T>(
    method: string,
    path: string,
    body?: unknown,
    { timeoutMs, allowStatuses = [] }: { timeoutMs?: number; allowStatuses?: number[] } = {}
  ) => {
    const spacePath = space === 'default' ? path : `/s/${space}${path}`;
    const { status, data } = await kibanaRequest(connection, method, spacePath, body, {
      timeoutMs,
    });
    if ((status < 200 || status >= 300) && !allowStatuses.includes(status)) {
      throw new Error(`${method} ${spacePath} failed (${status}): ${JSON.stringify(data)}`);
    }
    return { status, data: data as T };
  };
