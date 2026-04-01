/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector } from '@kbn/inference-common';
import { resolveConnectorList, resolveConnectorById } from './resolve_inference_endpoints';

type ResolveArgs = Parameters<typeof resolveConnectorList>[0];
type Plugins = ResolveArgs['plugins'];

function connector(id: string): InferenceConnector {
  return { connectorId: id } as InferenceConnector;
}

function mockContext(modelSettingsEnabled: boolean): ResolveArgs['context'] {
  return {
    core: Promise.resolve({
      uiSettings: { client: { get: jest.fn().mockResolvedValue(modelSettingsEnabled) } },
    }),
  } as unknown as ResolveArgs['context'];
}

function mockLogger(): ResolveArgs['logger'] {
  return { debug: jest.fn(), warn: jest.fn() } as unknown as ResolveArgs['logger'];
}

function mockInferenceStart(connectors: InferenceConnector[]) {
  return {
    start: jest.fn().mockResolvedValue({
      getConnectorList: jest.fn().mockResolvedValue(connectors),
      getConnectorById: jest.fn().mockImplementation((id: string) => {
        const found = connectors.find((c) => c.connectorId === id);
        if (!found) throw new Error(`connector ${id} not found`);
        return found;
      }),
    }),
  };
}

function siepPlugins(
  endpoints: InferenceConnector[],
  soEntryFound: boolean,
  { warnings = [], fallback = [] as InferenceConnector[] } = {}
): Plugins {
  return {
    searchInferenceEndpoints: {
      start: jest.fn().mockResolvedValue({
        endpoints: {
          getForFeature: jest.fn().mockResolvedValue({ endpoints, warnings, soEntryFound }),
        },
      }),
    },
    inference: mockInferenceStart(fallback),
  } as unknown as Plugins;
}

function siepPluginsRejecting(error: Error): Plugins {
  return {
    searchInferenceEndpoints: {
      start: jest.fn().mockResolvedValue({
        endpoints: { getForFeature: jest.fn().mockRejectedValue(error) },
      }),
    },
    inference: mockInferenceStart([]),
  } as unknown as Plugins;
}

function inferenceOnlyPlugins(connectors: InferenceConnector[]): Plugins {
  return { inference: mockInferenceStart(connectors) } as unknown as Plugins;
}

async function assertBoom(promise: Promise<unknown>, statusCode: number): Promise<void> {
  await expect(promise).rejects.toMatchObject({ isBoom: true, output: { statusCode } });
}

const request = {} as ResolveArgs['request'];

function callList(overrides: Partial<ResolveArgs> = {}) {
  return resolveConnectorList({
    context: mockContext(true),
    plugins: inferenceOnlyPlugins([]),
    request,
    logger: mockLogger(),
    ...overrides,
  });
}

function callById(connectorId: string, overrides: Partial<ResolveArgs> = {}) {
  return resolveConnectorById({
    context: mockContext(true),
    plugins: inferenceOnlyPlugins([]),
    request,
    logger: mockLogger(),
    ...overrides,
    connectorId,
  });
}

describe('resolveConnectorList', () => {
  it('returns allow-list when model settings has endpoints', async () => {
    const endpoints = [connector('a'), connector('b')];
    expect(await callList({ plugins: siepPlugins(endpoints, true) })).toEqual(endpoints);
  });

  it('throws 400 when model settings is configured but empty', async () => {
    await assertBoom(callList({ plugins: siepPlugins([], true) }), 400);
  });

  it('falls back to inference when model settings flag is off', async () => {
    const fallback = [connector('x')];
    expect(
      await callList({ context: mockContext(false), plugins: inferenceOnlyPlugins(fallback) })
    ).toEqual(fallback);
  });

  it('falls back to inference when SIEP plugin is unavailable', async () => {
    const fallback = [connector('y')];
    expect(await callList({ plugins: inferenceOnlyPlugins(fallback) })).toEqual(fallback);
  });

  it('falls back to inference when empty endpoints and no SO entry', async () => {
    const fallback = [connector('z')];
    expect(await callList({ plugins: siepPlugins([], false, { fallback }) })).toEqual(fallback);
  });

  it('logs warnings from SIEP resolution', async () => {
    const log = mockLogger();
    await callList({
      plugins: siepPlugins([connector('a')], true, { warnings: ['w1'] }),
      logger: log,
    });
    expect(log.warn).toHaveBeenCalledWith('w1');
  });

  it('throws 503 when getForFeature fails', async () => {
    const log = mockLogger();
    await assertBoom(
      callList({ plugins: siepPluginsRejecting(new Error('es down')), logger: log }),
      503
    );
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to resolve'));
  });
});

describe('resolveConnectorById', () => {
  it('returns connector from allow-list when id matches', async () => {
    const c = connector('match');
    expect(await callById('match', { plugins: siepPlugins([c, connector('other')], true) })).toBe(
      c
    );
  });

  it('throws 404 when id is not in allow-list', async () => {
    await assertBoom(callById('missing', { plugins: siepPlugins([connector('a')], true) }), 404);
  });

  it('throws 400 when model settings is configured but empty', async () => {
    await assertBoom(callById('any', { plugins: siepPlugins([], true) }), 400);
  });

  it('falls back to inference when model settings flag is off', async () => {
    const c = connector('fb');
    expect(
      await callById('fb', { context: mockContext(false), plugins: inferenceOnlyPlugins([c]) })
    ).toBe(c);
  });

  it('falls back to inference when SIEP plugin is unavailable', async () => {
    const c = connector('fb');
    expect(await callById('fb', { plugins: inferenceOnlyPlugins([c]) })).toBe(c);
  });

  it('falls back to inference when empty endpoints and no SO entry', async () => {
    const c = connector('inferred');
    expect(await callById('inferred', { plugins: siepPlugins([], false, { fallback: [c] }) })).toBe(
      c
    );
  });

  it('throws 503 when getForFeature fails', async () => {
    await assertBoom(callById('any', { plugins: siepPluginsRejecting(new Error('boom')) }), 503);
  });
});
