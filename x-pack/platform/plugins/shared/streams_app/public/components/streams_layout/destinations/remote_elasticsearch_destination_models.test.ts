/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnitDestination } from './destination_models';
import { toDestinationViewModel } from './destination_models';
import {
  createRemoteElasticsearchUnitDestination,
  getRemoteIndexBySignal,
} from './remote_elasticsearch_destination_models';
import {
  EMPTY_REMOTE_ELASTICSEARCH_DESTINATION_FORM,
  REMOTE_ELASTICSEARCH_TYPE,
  type DestinationSignal,
} from './types';

const base = { id: 'central', name: 'Central', endpoint: 'https://es.example.com:443' };
const endpointEntry = { name: 'endpoint', value: base.endpoint };
const credentialEntry = { name: 'api_key', value: { credential: 'central-api-key' } };

describe('getRemoteIndexBySignal', () => {
  it('is empty in auto even when index fields still hold values', () => {
    expect(
      getRemoteIndexBySignal({
        auto: true,
        logsIndex: 'a',
        metricsIndex: 'b',
        tracesIndex: 'c',
      })
    ).toEqual({});
  });

  it('trims names and drops blank signals in fixed', () => {
    expect(
      getRemoteIndexBySignal({
        auto: false,
        logsIndex: '  my-logs ',
        metricsIndex: '   ',
        tracesIndex: 'my-traces',
      })
    ).toEqual({ logs: 'my-logs', traces: 'my-traces' });
  });
});

describe('createRemoteElasticsearchUnitDestination', () => {
  it('auto: endpoint and credential only, all signals', () => {
    const node = createRemoteElasticsearchUnitDestination({
      ...base,
      auto: true,
      logsIndex: '',
      metricsIndex: '',
      tracesIndex: '',
    });
    expect(node).toEqual({
      id: 'central',
      name: 'Central',
      type: REMOTE_ELASTICSEARCH_TYPE,
      supported_telemetry: ['logs', 'metrics', 'traces'],
      config: [endpointEntry, credentialEntry],
    });
  });

  it('fixed, same raw name on every filled signal: one unscoped index', () => {
    const node = createRemoteElasticsearchUnitDestination({
      ...base,
      auto: false,
      logsIndex: 'shared-idx',
      metricsIndex: 'shared-idx',
      tracesIndex: '',
    });
    expect(node.supported_telemetry).toEqual(['logs', 'metrics']);
    expect(node.config).toEqual([
      endpointEntry,
      { name: 'index', value: 'shared-idx' },
      credentialEntry,
    ]);
  });

  it('fixed, different names: one scoped index per filled signal', () => {
    const node = createRemoteElasticsearchUnitDestination({
      ...base,
      auto: false,
      logsIndex: 'a',
      metricsIndex: '',
      tracesIndex: 'b',
    });
    expect(node.supported_telemetry).toEqual(['logs', 'traces']);
    expect(node.config).toEqual([
      endpointEntry,
      { name: 'index', value: 'a', telemetry: ['logs'] },
      { name: 'index', value: 'b', telemetry: ['traces'] },
      credentialEntry,
    ]);
  });

  it('saves the trimmed endpoint', () => {
    const node = createRemoteElasticsearchUnitDestination({
      ...EMPTY_REMOTE_ELASTICSEARCH_DESTINATION_FORM,
      id: 'central',
      name: 'Central',
      endpoint: '  https://es.example.com:443  ',
    });
    expect(node.config?.[0]).toEqual(endpointEntry);
  });

  it('references the key by credential name and never holds its value', () => {
    const formWithKey = {
      ...EMPTY_REMOTE_ELASTICSEARCH_DESTINATION_FORM,
      endpoint: base.endpoint,
      apiKey: 'secret-value-123',
    };
    const node = createRemoteElasticsearchUnitDestination({
      id: 'central',
      name: 'Central',
      ...formWithKey,
    });
    expect(node.config?.filter(({ name }) => name === 'api_key')).toEqual([credentialEntry]);
    expect(JSON.stringify(node)).not.toContain('secret-value-123');
  });
});

const remoteNode = (
  config: NonNullable<UnitDestination['config']>,
  supportedTelemetry: DestinationSignal[] = ['logs', 'metrics', 'traces']
): UnitDestination => ({
  id: 'central',
  name: 'Central',
  type: REMOTE_ELASTICSEARCH_TYPE,
  supported_telemetry: supportedTelemetry,
  config: [endpointEntry, ...config],
});

describe('remote Elasticsearch view model', () => {
  it.each([
    ['credential reference', { credential: 'central-api-key' }],
    ['plaintext testing shape', 'secret-value-123'],
  ])('never exposes the key (%s)', (_, apiKey) => {
    const viewModel = toDestinationViewModel(
      remoteNode([
        { name: 'index', value: 'shared-idx' },
        { name: 'api_key', value: apiKey },
      ])
    );
    expect(viewModel).toEqual({
      id: 'central',
      name: 'Central',
      type: REMOTE_ELASTICSEARCH_TYPE,
      signals: ['logs', 'metrics', 'traces'],
      endpoint: base.endpoint,
      mode: 'static',
      indexBySignal: { logs: 'shared-idx', metrics: 'shared-idx', traces: 'shared-idx' },
    });
    const serialized = JSON.stringify(viewModel);
    expect(serialized).not.toContain('central-api-key');
    expect(serialized).not.toContain('secret-value-123');
  });

  it('scoped index wins over unscoped for a signal', () => {
    expect(
      toDestinationViewModel(
        remoteNode([
          { name: 'index', value: 'shared-idx' },
          { name: 'index', value: 'logs-only', telemetry: ['logs'] },
          credentialEntry,
        ])
      )
    ).toMatchObject({
      mode: 'static',
      indexBySignal: { logs: 'logs-only', metrics: 'shared-idx', traces: 'shared-idx' },
    });
  });

  it('reads scoped indices only for the signals they cover', () => {
    expect(
      toDestinationViewModel(
        remoteNode(
          [
            { name: 'index', value: 'a', telemetry: ['logs'] },
            { name: 'index', value: 'b', telemetry: ['traces'] },
            credentialEntry,
          ],
          ['logs', 'traces']
        )
      )
    ).toMatchObject({
      signals: ['logs', 'traces'],
      mode: 'static',
      indexBySignal: { logs: 'a', traces: 'b' },
    });
  });

  it('mode is auto when no signal has an index', () => {
    expect(toDestinationViewModel(remoteNode([credentialEntry]))).toEqual({
      id: 'central',
      name: 'Central',
      type: REMOTE_ELASTICSEARCH_TYPE,
      signals: ['logs', 'metrics', 'traces'],
      endpoint: base.endpoint,
      mode: 'auto',
      indexBySignal: {},
    });
  });

  it.each([
    ['auto', { auto: true, logsIndex: '', metricsIndex: '', tracesIndex: '' }, {}],
    [
      'one name',
      { auto: false, logsIndex: 'shared-idx', metricsIndex: 'shared-idx', tracesIndex: '' },
      { logs: 'shared-idx', metrics: 'shared-idx' },
    ],
    [
      'different names',
      { auto: false, logsIndex: 'logs-a-b', metricsIndex: '', tracesIndex: 'traces-a-b' },
      { logs: 'logs-a-b', traces: 'traces-a-b' },
    ],
  ])('reads back what the builder saved (%s)', (_, form, indexBySignal) => {
    const viewModel = toDestinationViewModel(
      createRemoteElasticsearchUnitDestination({ ...base, ...form })
    );
    if (viewModel?.type !== REMOTE_ELASTICSEARCH_TYPE) {
      throw new Error('Expected a remote Elasticsearch destination');
    }
    expect(viewModel.endpoint).toBe(base.endpoint);
    expect(viewModel.indexBySignal).toEqual(indexBySignal);
  });
});
