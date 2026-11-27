/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnitDestination } from '@kbn/streams-schema';
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
        docsIndex: 'd',
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
        docsIndex: ' my-docs ',
      })
    ).toEqual({ logs: 'my-logs', traces: 'my-traces', docs: 'my-docs' });
  });
});

describe('createRemoteElasticsearchUnitDestination', () => {
  it('auto: endpoint and credential only, all signals including docs', () => {
    const node = createRemoteElasticsearchUnitDestination({
      ...base,
      auto: true,
      logsIndex: '',
      metricsIndex: '',
      tracesIndex: '',
      docsIndex: '',
    });
    expect(node).toEqual({
      id: 'central',
      name: 'Central',
      type: REMOTE_ELASTICSEARCH_TYPE,
      supported_telemetry: ['logs', 'metrics', 'traces', 'docs'],
      config: [endpointEntry, credentialEntry],
    });
  });

  it('fixed, one signal: a telemetry-scoped index', () => {
    const node = createRemoteElasticsearchUnitDestination({
      ...base,
      auto: false,
      logsIndex: 'logs-billing.otel-default',
      metricsIndex: '',
      tracesIndex: '',
      docsIndex: '',
    });
    expect(node.supported_telemetry).toEqual(['logs']);
    expect(node.config).toEqual([
      endpointEntry,
      { name: 'index', value: 'logs-billing.otel-default', telemetry: ['logs'] },
      credentialEntry,
    ]);
  });

  it('fixed: one telemetry-scoped index per filled signal', () => {
    const node = createRemoteElasticsearchUnitDestination({
      ...base,
      auto: false,
      logsIndex: 'logs-billing.otel-default',
      metricsIndex: '',
      tracesIndex: 'traces-billing.otel-prod',
      docsIndex: '',
    });
    expect(node.supported_telemetry).toEqual(['logs', 'traces']);
    expect(node.config).toEqual([
      endpointEntry,
      { name: 'index', value: 'logs-billing.otel-default', telemetry: ['logs'] },
      { name: 'index', value: 'traces-billing.otel-prod', telemetry: ['traces'] },
      credentialEntry,
    ]);
  });

  it('fixed, OTel signals plus docs: docs gets its own scoped entry', () => {
    const node = createRemoteElasticsearchUnitDestination({
      ...base,
      auto: false,
      logsIndex: 'logs-billing.otel-default',
      metricsIndex: 'metrics-billing.otel-default',
      tracesIndex: 'traces-billing.otel-default',
      docsIndex: 'accounting-2026',
    });
    expect(node.supported_telemetry).toEqual(['logs', 'metrics', 'traces', 'docs']);
    expect(node.config).toEqual([
      endpointEntry,
      { name: 'index', value: 'logs-billing.otel-default', telemetry: ['logs'] },
      { name: 'index', value: 'metrics-billing.otel-default', telemetry: ['metrics'] },
      { name: 'index', value: 'traces-billing.otel-default', telemetry: ['traces'] },
      { name: 'index', value: 'accounting-2026', telemetry: ['docs'] },
      credentialEntry,
    ]);
  });

  it('fixed, docs only: one docs-scoped index', () => {
    const node = createRemoteElasticsearchUnitDestination({
      ...base,
      auto: false,
      logsIndex: '',
      metricsIndex: '',
      tracesIndex: '',
      docsIndex: ' accounting-2026 ',
    });
    expect(node.supported_telemetry).toEqual(['docs']);
    expect(node.config).toEqual([
      endpointEntry,
      { name: 'index', value: 'accounting-2026', telemetry: ['docs'] },
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

  it('saves a trimmed description and reads it back', () => {
    const node = createRemoteElasticsearchUnitDestination({
      ...base,
      description: '  Prod cluster ',
      auto: true,
      logsIndex: '',
      metricsIndex: '',
      tracesIndex: '',
      docsIndex: '',
    });
    expect(node.description).toBe('Prod cluster');
    expect(toDestinationViewModel(node)?.description).toBe('Prod cluster');
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
    ['auto', { auto: true, logsIndex: '', metricsIndex: '', tracesIndex: '', docsIndex: '' }, {}],
    [
      'one signal',
      { auto: false, logsIndex: 'logs-a.otel-b', metricsIndex: '', tracesIndex: '', docsIndex: '' },
      { logs: 'logs-a.otel-b' },
    ],
    [
      'two signals',
      {
        auto: false,
        logsIndex: 'logs-a.otel-b',
        metricsIndex: '',
        tracesIndex: 'traces-a.otel-b',
        docsIndex: '',
      },
      { logs: 'logs-a.otel-b', traces: 'traces-a.otel-b' },
    ],
    [
      'OTel signals plus docs',
      {
        auto: false,
        logsIndex: 'logs-a.otel-b',
        metricsIndex: 'metrics-a.otel-b',
        tracesIndex: 'traces-a.otel-b',
        docsIndex: 'accounting-2026',
      },
      {
        logs: 'logs-a.otel-b',
        metrics: 'metrics-a.otel-b',
        traces: 'traces-a.otel-b',
        docs: 'accounting-2026',
      },
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
