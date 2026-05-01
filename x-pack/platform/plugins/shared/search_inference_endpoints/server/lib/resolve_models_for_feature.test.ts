/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { type InferenceConnector, InferenceConnectorType } from '@kbn/inference-common';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import { resolveModelsForFeature } from './resolve_models_for_feature';
import type { ResolvedInferenceEndpoints } from '../types';

const inferenceConnector = (connectorId: string): InferenceConnector => ({
  type: InferenceConnectorType.Inference,
  name: connectorId,
  connectorId,
  config: {},
  capabilities: {},
  isInferenceEndpoint: true,
  isPreconfigured: false,
});

interface UiSettings {
  defaultConnectorId?: string;
  defaultConnectorOnly?: boolean;
}

const createUiSettingsClient = ({
  defaultConnectorId,
  defaultConnectorOnly,
}: UiSettings = {}): IUiSettingsClient =>
  ({
    get: jest.fn(async (key: string) => {
      if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) return defaultConnectorId;
      if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY)
        return defaultConnectorOnly ?? false;
      return undefined;
    }),
  } as unknown as IUiSettingsClient);

describe('resolveModelsForFeature', () => {
  let logger: Logger;
  let getForFeature: jest.Mock;
  let getConnectorList: jest.Mock;
  let getConnectorById: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
    getForFeature = jest.fn();
    getConnectorList = jest.fn();
    getConnectorById = jest.fn();
  });

  const resolve = (uiSettings: UiSettings = {}, featureId = 'my_feature') =>
    resolveModelsForFeature({
      getForFeature,
      getConnectorList,
      getConnectorById,
      uiSettingsClient: createUiSettingsClient(uiSettings),
      featureId,
      logger,
    });

  it('returns SO-configured endpoints as-is when soEntryFound is true', async () => {
    const resolved = inferenceConnector('feature-ep');
    getForFeature.mockResolvedValue({
      endpoints: [resolved],
      warnings: [],
      soEntryFound: true,
    } satisfies ResolvedInferenceEndpoints);
    getConnectorList.mockResolvedValue([resolved, inferenceConnector('other')]);

    const result = await resolve();

    expect(result).toEqual({
      connectors: [resolved],
      warnings: [],
      soEntryFound: true,
    });
  });

  it('marks recommended endpoints with isRecommended and appends the rest of the catalog', async () => {
    const recommended = inferenceConnector('rec-ep');
    const other = inferenceConnector('noise');
    getForFeature.mockResolvedValue({
      endpoints: [recommended],
      warnings: [],
      soEntryFound: false,
    });
    getConnectorList.mockResolvedValue([recommended, other]);

    const result = await resolve();

    expect(result).toEqual({
      connectors: [{ ...recommended, isRecommended: true }, other],
      warnings: [],
      soEntryFound: false,
    });
  });

  it('returns the catalog alone when there are no recommendations or SO override', async () => {
    const a = inferenceConnector('a');
    const b = inferenceConnector('b');
    getForFeature.mockResolvedValue({
      endpoints: [],
      warnings: [],
      soEntryFound: false,
    });
    getConnectorList.mockResolvedValue([a, b]);

    const result = await resolve();

    expect(result).toEqual({
      connectors: [a, b],
      warnings: [],
      soEntryFound: false,
    });
  });

  it('returns an empty list when SO explicitly configures no endpoints', async () => {
    getForFeature.mockResolvedValue({
      endpoints: [],
      warnings: [],
      soEntryFound: true,
    });
    getConnectorList.mockResolvedValue([inferenceConnector('a')]);

    const result = await resolve();

    expect(result).toEqual({
      connectors: [],
      warnings: [],
      soEntryFound: true,
    });
  });

  it('returns only the default connector when defaultConnectorOnly is set', async () => {
    const defaultConnector = inferenceConnector('default-id');
    getConnectorById.mockResolvedValue(defaultConnector);

    const result = await resolve({ defaultConnectorId: 'default-id', defaultConnectorOnly: true });

    expect(getConnectorById).toHaveBeenCalledWith('default-id');
    expect(getForFeature).not.toHaveBeenCalled();
    expect(getConnectorList).not.toHaveBeenCalled();
    expect(result).toEqual({
      connectors: [defaultConnector],
      warnings: [],
      soEntryFound: false,
    });
  });

  it('returns an empty list when defaultConnectorOnly is set but no default is configured', async () => {
    const result = await resolve({ defaultConnectorOnly: true });

    expect(getConnectorById).not.toHaveBeenCalled();
    expect(getForFeature).not.toHaveBeenCalled();
    expect(getConnectorList).not.toHaveBeenCalled();
    expect(result).toEqual({
      connectors: [],
      warnings: [],
      soEntryFound: false,
    });
  });

  it('returns an empty list when defaultConnectorOnly is set but the default connector lookup fails', async () => {
    getConnectorById.mockRejectedValue(new Error('Connector not found'));

    const result = await resolve({ defaultConnectorId: 'missing', defaultConnectorOnly: true });

    expect(result).toEqual({
      connectors: [],
      warnings: [],
      soEntryFound: false,
    });
  });

  it('returns an empty list when defaultConnectorOnly is set with the NO_DEFAULT_CONNECTOR sentinel', async () => {
    const result = await resolve({
      defaultConnectorId: 'NO_DEFAULT_CONNECTOR',
      defaultConnectorOnly: true,
    });

    expect(getConnectorById).not.toHaveBeenCalled();
    expect(result).toEqual({ connectors: [], warnings: [], soEntryFound: false });
  });

  it('prepends the default connector when soEntryFound is false and a default is configured', async () => {
    const recommended = inferenceConnector('rec');
    const other = inferenceConnector('other');
    const defaultConnector = inferenceConnector('default');
    getForFeature.mockResolvedValue({
      endpoints: [recommended],
      warnings: [],
      soEntryFound: false,
    });
    getConnectorList.mockResolvedValue([recommended, other]);
    getConnectorById.mockResolvedValue(defaultConnector);

    const result = await resolve({ defaultConnectorId: 'default' });

    expect(getConnectorById).toHaveBeenCalledWith('default');
    expect(result).toEqual({
      connectors: [defaultConnector, { ...recommended, isRecommended: true }, other],
      warnings: [],
      soEntryFound: false,
    });
  });

  it('replaces an existing entry when the default connector is already in the merged list', async () => {
    const recommended = inferenceConnector('rec');
    const defaultInCatalog = inferenceConnector('default');
    getForFeature.mockResolvedValue({
      endpoints: [recommended],
      warnings: [],
      soEntryFound: false,
    });
    getConnectorList.mockResolvedValue([recommended, defaultInCatalog]);
    getConnectorById.mockResolvedValue(defaultInCatalog);

    const result = await resolve({ defaultConnectorId: 'default' });

    expect(result).toEqual({
      connectors: [defaultInCatalog, { ...recommended, isRecommended: true }],
      warnings: [],
      soEntryFound: false,
    });
  });

  it('ignores the default connector when soEntryFound is true', async () => {
    const resolved = inferenceConnector('feature-ep');
    getForFeature.mockResolvedValue({
      endpoints: [resolved],
      warnings: [],
      soEntryFound: true,
    });
    getConnectorList.mockResolvedValue([resolved]);

    const result = await resolve({ defaultConnectorId: 'default' });

    expect(getConnectorById).not.toHaveBeenCalled();
    expect(result).toEqual({
      connectors: [resolved],
      warnings: [],
      soEntryFound: true,
    });
  });

  it('returns the merged list without the default connector when its lookup fails', async () => {
    const recommended = inferenceConnector('rec');
    getForFeature.mockResolvedValue({
      endpoints: [recommended],
      warnings: [],
      soEntryFound: false,
    });
    getConnectorList.mockResolvedValue([recommended]);
    getConnectorById.mockRejectedValue(new Error('Default connector unavailable'));

    const result = await resolve({ defaultConnectorId: 'default' });

    expect(result).toEqual({
      connectors: [{ ...recommended, isRecommended: true }],
      warnings: [],
      soEntryFound: false,
    });
  });

  it('falls back to the catalog when getForFeature fails', async () => {
    const a = inferenceConnector('a');
    const b = inferenceConnector('b');
    getForFeature.mockRejectedValue(new Error('SO unavailable'));
    getConnectorList.mockResolvedValue([a, b]);

    const result = await resolve();

    expect(result).toEqual({
      connectors: [a, b],
      warnings: [],
      soEntryFound: false,
    });
  });

  it('falls back to the feature endpoints when getConnectorList fails', async () => {
    const resolved = inferenceConnector('feature-ep');
    getForFeature.mockResolvedValue({
      endpoints: [resolved],
      warnings: [],
      soEntryFound: true,
    });
    getConnectorList.mockRejectedValue(new Error('Inference API unavailable'));

    const result = await resolve();

    expect(result).toEqual({
      connectors: [resolved],
      warnings: [],
      soEntryFound: true,
    });
  });

  it('returns an empty result when both getForFeature and getConnectorList fail', async () => {
    getForFeature.mockRejectedValue(new Error('SO unavailable'));
    getConnectorList.mockRejectedValue(new Error('Inference API unavailable'));

    const result = await resolve();

    expect(result).toEqual({
      connectors: [],
      warnings: [],
      soEntryFound: false,
    });
  });

  it('ignores the NO_DEFAULT_CONNECTOR sentinel when resolving feature endpoints', async () => {
    const recommended = inferenceConnector('rec');
    getForFeature.mockResolvedValue({
      endpoints: [recommended],
      warnings: [],
      soEntryFound: false,
    });
    getConnectorList.mockResolvedValue([recommended]);

    const result = await resolve({ defaultConnectorId: 'NO_DEFAULT_CONNECTOR' });

    expect(getConnectorById).not.toHaveBeenCalled();
    expect(result).toEqual({
      connectors: [{ ...recommended, isRecommended: true }],
      warnings: [],
      soEntryFound: false,
    });
  });

  it('propagates warnings from getForFeature', async () => {
    const recommended = inferenceConnector('rec');
    getForFeature.mockResolvedValue({
      endpoints: [recommended],
      warnings: ['Inference endpoint "missing-ep" was not found in Elasticsearch.'],
      soEntryFound: false,
    });
    getConnectorList.mockResolvedValue([recommended]);

    const result = await resolve();

    expect(result.warnings).toEqual([
      'Inference endpoint "missing-ep" was not found in Elasticsearch.',
    ]);
  });
});
