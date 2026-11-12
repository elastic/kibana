/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { parseConfig } from '../config';
import type { KibanaCall, StageContext } from '../context';
import { runCleanup } from './cleanup';

describe('cleanup stage', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dreaming-eval-cleanup-'));
  });

  afterEach(() => {
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('deletes the agents and their conversations, the AI indices and whole traces, and keeps the runs', async () => {
    const config = parseConfig(
      `
data_dir: ${dataDir}
ai_indices:
  - id: eval-a
    datasets: [longmemeval_s]
    dreaming:
      facts: [{ type: preference }]
`,
      '/repo/eval.yaml',
      '/repo'
    );
    const datasetDir = path.join(dataDir, 'longmemeval_s');
    const runDir = path.join(dataDir, 'runs', 'run-1');
    fs.mkdirSync(datasetDir, { recursive: true });
    fs.mkdirSync(runDir, { recursive: true });
    fs.writeFileSync(path.join(datasetDir, 'import.json'), '{}');
    fs.writeFileSync(path.join(datasetDir, 'extracted.json'), '{}');

    const calls: string[] = [];
    let conversationPages = [[{ id: 'c1' }, { id: 'c2' }], []];
    const kibana = (async (method: string, url: string) => {
      calls.push(`${method} ${url}`);
      if (method === 'GET') {
        const [page = [], ...rest] = conversationPages;
        conversationPages = rest;
        return { status: 200, data: { results: page } };
      }
      return { status: 200, data: {} };
    }) as KibanaCall;
    const tracePages = [[{ key: { id: 't1' } }, { key: { id: 't2' } }], []];
    const search = jest.fn().mockImplementation(async () => ({
      aggregations: { traces: { buckets: tracePages.shift() ?? [] } },
    }));
    const deleteByQuery = jest.fn().mockResolvedValue({ deleted: 7 });
    const log = { success: jest.fn(), info: jest.fn(), warning: jest.fn() };

    await runCleanup({
      config,
      kibana,
      esClient: { search, deleteByQuery } as unknown as Client,
      log: log as unknown as ToolingLog,
      aiIndexIds: ['eval-a'],
      runId: 'run-1',
      forceDownload: false,
    } as StageContext);

    expect(calls).toEqual([
      'GET /api/agent_builder/conversations?agent_id=eval-a-answerer&per_page=1000',
      'DELETE /api/agent_builder/conversations/c1',
      'DELETE /api/agent_builder/conversations/c2',
      'GET /api/agent_builder/conversations?agent_id=eval-a-answerer&per_page=1000',
      'DELETE /api/agent_builder/agents/eval-a-answerer',
      'DELETE /api/context_engine/ai_index/eval-a?delete_knowledge_indicators=true&delete_automations=true',
    ]);
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'traces-agent_builder.otel-default',
        query: { term: { 'attributes.gen_ai.agent.id': 'longmemeval-assistant' } },
      }),
      { ignore: [404] }
    );
    expect(deleteByQuery).toHaveBeenCalledTimes(1);
    expect(deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({ query: { terms: { trace_id: ['t1', 't2'] } } })
    );
    expect(fs.existsSync(path.join(datasetDir, 'import.json'))).toBe(false);
    expect(fs.existsSync(path.join(datasetDir, 'extracted.json'))).toBe(true);
    expect(fs.existsSync(runDir)).toBe(true);
  });
});
