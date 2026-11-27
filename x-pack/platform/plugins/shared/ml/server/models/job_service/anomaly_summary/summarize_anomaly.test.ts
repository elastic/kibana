/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedModel } from '@kbn/agent-builder-server';
import type { MlClient } from '../../../lib/ml_client';
import { gatherAnomalyEvidence, summarizeAnomaly } from './summarize_anomaly';

const START = Date.parse('2026-10-28T08:00:00.000Z');
const END = Date.parse('2026-10-28T12:00:00.000Z');

const job = {
  description: 'Watches the slow responses',
  analysis_config: {
    bucket_span: '1h',
    influencers: ['host.name'],
    detectors: [{ detector_description: 'high mean(event.duration) partitionfield=event.action' }],
  },
};
const record = {
  record_score: 97.84,
  timestamp: START + 3600000,
  detector_index: 0,
  function_description: 'mean',
  field_name: 'event.duration',
  partition_field_name: 'event.action',
  partition_field_value: 'deleteUser',
  actual: [20000000000],
  typical: [80000000],
  influencers: [{ influencer_field_name: 'host.name', influencer_field_values: ['host-1'] }],
};

const createMlClient = () =>
  ({
    getJobs: jest.fn().mockResolvedValue({ jobs: [job] }),
    anomalySearch: jest.fn().mockResolvedValue({ hits: { hits: [{ _source: record }] } }),
  } as unknown as jest.Mocked<MlClient>);

describe('gatherAnomalyEvidence', () => {
  it('gives the job, its detectors and influencers, and the highest scoring anomalies', async () => {
    const mlClient = createMlClient();
    const evidence = await gatherAnomalyEvidence(mlClient, {
      jobId: 'my-job',
      start: START,
      end: END,
    });

    expect(mlClient.getJobs).toHaveBeenCalledWith({ job_id: 'my-job' });
    expect(mlClient.anomalySearch).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [{ record_score: { order: 'desc' } }],
        query: {
          bool: {
            filter: [
              { term: { job_id: 'my-job' } },
              { term: { result_type: 'record' } },
              { range: { timestamp: { gte: START, lt: END, format: 'epoch_millis' } } },
            ],
          },
        },
      }),
      ['my-job']
    );
    expect(evidence).toEqual({
      job: {
        id: 'my-job',
        description: 'Watches the slow responses',
        bucketSpan: '1h',
        influencers: ['host.name'],
        detectors: [
          { index: 0, description: 'high mean(event.duration) partitionfield=event.action' },
        ],
      },
      timeRange: { start: '2026-10-28T08:00:00.000Z', end: '2026-10-28T12:00:00.000Z' },
      anomalies: [
        {
          time: '2026-10-28T09:00:00.000Z',
          score: 97.8,
          detector: 'high mean(event.duration) partitionfield=event.action',
          measure: 'mean of event.duration',
          entity: { 'event.action': 'deleteUser' },
          actual: [20000000000],
          typical: [80000000],
          actualComparedWithTypical: '250x higher',
          influencers: { 'host.name': ['host-1'] },
        },
      ],
    });
  });
});

describe('summarizeAnomaly', () => {
  const createModel = (content: unknown) => {
    const invoke = jest.fn().mockResolvedValue({ content });
    return { model: { chatModel: { invoke } } as unknown as ScopedModel, invoke };
  };

  it('asks the model for a brief description using the evidence, and returns its text', async () => {
    const { model, invoke } = createModel(
      '  The mean duration of deleteUser was far above typical.  '
    );
    const signal = new AbortController().signal;

    const summary = await summarizeAnomaly(
      { mlClient: createMlClient(), model, signal },
      { jobId: 'my-job', start: START, end: END }
    );

    expect(summary).toBe('The mean duration of deleteUser was far above typical.');
    const [prompt, options] = invoke.mock.calls[0];
    expect(prompt[0][1]).toContain('Explain why this is an anomaly');
    expect(prompt[0][1]).toContain('job description');
    expect(prompt[1][1]).toContain('"Watches the slow responses"');
    expect(prompt[1][1]).toContain('host.name');
    expect(prompt[1][1]).toContain('97.8');
    expect(prompt[1][1]).toContain('250x higher');
    expect(options).toEqual({ signal });
  });

  it('joins the text parts of the content', async () => {
    const { model } = createModel([{ type: 'text', text: 'One. ' }, 'Two.']);
    const summary = await summarizeAnomaly(
      { mlClient: createMlClient(), model },
      { jobId: 'my-job', start: START, end: END }
    );
    expect(summary).toBe('One. Two.');
  });
});
