/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { AgentConfiguration } from '@kbn/agent-builder-common';
import { resolveConfiguration } from './configuration';
import { resolveAiIndexCatalog } from './resolve_ai_index_catalog';

jest.mock('./resolve_ai_index_catalog', () => ({
  resolveAiIndexCatalog: jest.fn(),
}));

const resolveAiIndexCatalogMock = resolveAiIndexCatalog as jest.MockedFunction<
  typeof resolveAiIndexCatalog
>;

const request = {} as KibanaRequest;
const configuration = { instructions: 'Be nice.', ai_indices: ['a', 'b'] } as AgentConfiguration;

describe('resolveConfiguration', () => {
  beforeEach(() => {
    resolveAiIndexCatalogMock.mockReset();
    resolveAiIndexCatalogMock.mockResolvedValue([]);
  });

  it('returns the configured AI indices when AI indices are disabled', async () => {
    const defaultAiIndexProvider = jest.fn().mockResolvedValue(['c']);

    const resolved = await resolveConfiguration(configuration, {
      aiIndicesEnabled: false,
      request,
      defaultAiIndexProvider,
    });

    expect(resolved).toEqual({ instructions: 'Be nice.', aiIndices: ['a', 'b'] });
    expect(defaultAiIndexProvider).not.toHaveBeenCalled();
  });

  it('appends default AI indices after the configured ones, without duplicates', async () => {
    const defaultAiIndexProvider = jest.fn().mockResolvedValue(['b', 'c']);

    const resolved = await resolveConfiguration(configuration, {
      aiIndicesEnabled: true,
      request,
      defaultAiIndexProvider,
    });

    expect(defaultAiIndexProvider).toHaveBeenCalledWith({ request });
    expect(resolved.aiIndices).toEqual(['a', 'b', 'c']);
    expect(resolveAiIndexCatalogMock).toHaveBeenCalledWith(
      expect.objectContaining({ aiIndices: ['a', 'b', 'c'] })
    );
  });

  it('keeps the configured AI indices when the default provider fails', async () => {
    const logger = loggingSystemMock.createLogger();
    const defaultAiIndexProvider = jest.fn().mockRejectedValue(new Error('boom'));

    const resolved = await resolveConfiguration(configuration, {
      aiIndicesEnabled: true,
      request,
      defaultAiIndexProvider,
      logger,
    });

    expect(resolved.aiIndices).toEqual(['a', 'b']);
    expect(logger.warn).toHaveBeenCalledWith('Failed to resolve default AI indices: boom');
  });
});
