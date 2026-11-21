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
import type { GetForFeatureOptions, ResolvedInferenceEndpoints } from '../types';

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

  const resolve = (
    uiSettings: UiSettings = {},
    featureId = 'my_feature',
    ignoreGlobalDefault = false,
    opts?: GetForFeatureOptions
  ) =>
    resolveModelsForFeature({
      getForFeature,
      getConnectorList,
      getConnectorById,
      uiSettingsClient: createUiSettingsClient(uiSettings),
      featureId,
      ignoreGlobalDefault,
      opts,
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
      connectors: [{ ...defaultConnector, isDefault: true }],
      warnings: [],
      soEntryFound: false,
    });
  });

  it('returns the default connector without declared parameters when defaultConnectorOnly is set', async () => {
    const defaultConnector = inferenceConnector('claude-1');
    getConnectorById.mockResolvedValue(defaultConnector);

    const result = await resolve({ defaultConnectorId: 'claude-1', defaultConnectorOnly: true });

    expect(getForFeature).not.toHaveBeenCalled();
    expect(result.connectors).toEqual([{ ...defaultConnector, isDefault: true }]);
    expect(result.connectors[0]).not.toHaveProperty('parameters');
  });

  it('attaches the declared parameters to the default connector when defaultConnectorOnly is not set', async () => {
    const parameters = { reasoning: { effort: 'medium' as const } };
    const defaultConnector = inferenceConnector('claude-1');
    getForFeature.mockResolvedValue({
      endpoints: [{ ...defaultConnector, parameters }],
      warnings: [],
      soEntryFound: false,
    });
    getConnectorList.mockResolvedValue([defaultConnector]);
    getConnectorById.mockResolvedValue(defaultConnector);

    const result = await resolve({ defaultConnectorId: 'claude-1', defaultConnectorOnly: false });

    expect(result.connectors).toEqual([{ ...defaultConnector, parameters, isDefault: true }]);
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
      connectors: [
        { ...defaultConnector, isDefault: true },
        { ...recommended, isRecommended: true },
        other,
      ],
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
      connectors: [
        { ...defaultInCatalog, isDefault: true },
        { ...recommended, isRecommended: true },
      ],
      warnings: [],
      soEntryFound: false,
    });
  });

  it('attaches the recommended parameters to the prepended default connector', async () => {
    const parameters = { reasoning: { effort: 'low' as const } };
    const recommended = inferenceConnector('rec');
    const defaultConnector = inferenceConnector('default');
    getForFeature.mockResolvedValue({
      endpoints: [recommended, { ...defaultConnector, parameters }],
      warnings: [],
      soEntryFound: false,
    });
    getConnectorList.mockResolvedValue([recommended, defaultConnector]);
    getConnectorById.mockResolvedValue(defaultConnector);

    const result = await resolve({ defaultConnectorId: 'default' });

    expect(result.connectors).toEqual([
      { ...defaultConnector, parameters, isDefault: true },
      { ...recommended, isRecommended: true },
    ]);
  });

  it('prepends the default connector without parameters when it is not recommended', async () => {
    const recommended = {
      ...inferenceConnector('rec'),
      parameters: { reasoning: { effort: 'low' as const } },
    };
    const defaultConnector = inferenceConnector('default');
    getForFeature.mockResolvedValue({
      endpoints: [recommended],
      warnings: [],
      soEntryFound: false,
    });
    getConnectorList.mockResolvedValue([inferenceConnector('rec'), defaultConnector]);
    getConnectorById.mockResolvedValue(defaultConnector);

    const result = await resolve({ defaultConnectorId: 'default' });

    expect(result.connectors).toEqual([
      { ...defaultConnector, isDefault: true },
      { ...recommended, isRecommended: true },
    ]);
    expect(result.connectors[0]).not.toHaveProperty('parameters');
  });

  it('flags the default connector when the setting holds a stack connector alias of an inference endpoint', async () => {
    const endpoint = inferenceConnector('endpoint-id');
    const other = inferenceConnector('other');
    getForFeature.mockResolvedValue({ endpoints: [], warnings: [], soEntryFound: false });
    getConnectorList.mockResolvedValue([endpoint, other]);
    // The alias `.my-alias` resolves to the inference endpoint, whose id differs from the setting.
    getConnectorById.mockResolvedValue(endpoint);

    const result = await resolve({ defaultConnectorId: '.my-alias' });

    expect(result.connectors).toEqual([{ ...endpoint, isDefault: true }, other]);
  });

  it('keeps the recommended flag and parameters when the default setting is an alias of the recommended endpoint', async () => {
    const parameters = { reasoning: { effort: 'low' as const } };
    const endpoint = inferenceConnector('endpoint-id');
    getForFeature.mockResolvedValue({
      endpoints: [{ ...endpoint, parameters }],
      warnings: [],
      soEntryFound: false,
    });
    getConnectorList.mockResolvedValue([endpoint]);
    getConnectorById.mockResolvedValue(endpoint);

    const result = await resolve({ defaultConnectorId: '.my-alias' });

    expect(result.connectors).toEqual([
      { ...endpoint, parameters, isRecommended: true, isDefault: true },
    ]);
  });

  it('does not flag any connector when there is no default connector', async () => {
    const other = inferenceConnector('other');
    getForFeature.mockResolvedValue({ endpoints: [], warnings: [], soEntryFound: false });
    getConnectorList.mockResolvedValue([other]);

    const result = await resolve();

    expect(result.connectors).toEqual([other]);
    expect(result.connectors[0]).not.toHaveProperty('isDefault');
  });

  it('does not add the default connector to a saved override that does not contain it', async () => {
    const resolved = inferenceConnector('feature-ep');
    getForFeature.mockResolvedValue({
      endpoints: [resolved],
      warnings: [],
      soEntryFound: true,
    });
    getConnectorList.mockResolvedValue([resolved]);
    getConnectorById.mockResolvedValue(inferenceConnector('default'));

    const result = await resolve({ defaultConnectorId: 'default' });

    expect(result).toEqual({
      connectors: [resolved],
      warnings: [],
      soEntryFound: true,
    });
  });

  it('does not look the default up when it is a known connector the saved override left out', async () => {
    const resolved = inferenceConnector('feature-ep');
    const knownDefault = inferenceConnector('default');
    getForFeature.mockResolvedValue({
      endpoints: [resolved],
      warnings: [],
      soEntryFound: true,
    });
    getConnectorList.mockResolvedValue([resolved, knownDefault]);

    const result = await resolve({ defaultConnectorId: 'default' });

    expect(getConnectorById).not.toHaveBeenCalled();
    expect(result.connectors).toEqual([resolved]);
  });

  it.each(['NO_DEFAULT_CONNECTOR', 'NO_DEFAULT_MODEL'])(
    'does not look the default up for a saved override when the setting is the %s sentinel',
    async (sentinel) => {
      const resolved = inferenceConnector('feature-ep');
      getForFeature.mockResolvedValue({
        endpoints: [resolved],
        warnings: [],
        soEntryFound: true,
      });
      getConnectorList.mockResolvedValue([resolved]);

      const result = await resolve({ defaultConnectorId: sentinel });

      expect(getConnectorById).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
      expect(result.connectors).toEqual([resolved]);
    }
  );

  it('does not look the default up when the setting is the NO_DEFAULT_MODEL sentinel and there is no saved override', async () => {
    const recommended = inferenceConnector('rec');
    getForFeature.mockResolvedValue({
      endpoints: [recommended],
      warnings: [],
      soEntryFound: false,
    });
    getConnectorList.mockResolvedValue([recommended]);

    const result = await resolve({ defaultConnectorId: 'NO_DEFAULT_MODEL' });

    expect(getConnectorById).not.toHaveBeenCalled();
    expect(result.connectors).toEqual([{ ...recommended, isRecommended: true }]);
  });

  it('returns an empty list when defaultConnectorOnly is set with the NO_DEFAULT_MODEL sentinel', async () => {
    const result = await resolve({
      defaultConnectorId: 'NO_DEFAULT_MODEL',
      defaultConnectorOnly: true,
    });

    expect(getConnectorById).not.toHaveBeenCalled();
    expect(result).toEqual({ connectors: [], warnings: [], soEntryFound: false });
  });

  it('flags the default connector in a saved override that already contains it', async () => {
    const other = inferenceConnector('other-ep');
    const defaultInOverride = inferenceConnector('default');
    getForFeature.mockResolvedValue({
      endpoints: [other, defaultInOverride],
      warnings: [],
      soEntryFound: true,
    });
    getConnectorList.mockResolvedValue([other, defaultInOverride]);
    getConnectorById.mockResolvedValue(defaultInOverride);

    const result = await resolve({ defaultConnectorId: 'default' });

    expect(result.connectors).toEqual([other, { ...defaultInOverride, isDefault: true }]);
    expect(getConnectorById).not.toHaveBeenCalled();
  });

  it('does not look the default up for an empty saved override', async () => {
    getForFeature.mockResolvedValue({ endpoints: [], warnings: [], soEntryFound: true });
    getConnectorList.mockResolvedValue([inferenceConnector('default')]);

    const result = await resolve({ defaultConnectorId: 'default' });

    expect(getConnectorById).not.toHaveBeenCalled();
    expect(result.connectors).toEqual([]);
  });

  it('flags the endpoint behind an alias default in a saved override', async () => {
    const other = inferenceConnector('other-ep');
    const endpoint = inferenceConnector('endpoint-id');
    getForFeature.mockResolvedValue({
      endpoints: [other, endpoint],
      warnings: [],
      soEntryFound: true,
    });
    getConnectorList.mockResolvedValue([other, endpoint]);
    getConnectorById.mockResolvedValue(endpoint);

    const result = await resolve({ defaultConnectorId: '.my-alias' });

    expect(getConnectorById).toHaveBeenCalledWith('.my-alias');
    expect(result.connectors).toEqual([other, { ...endpoint, isDefault: true }]);
  });

  it('does not flag anything in a saved override when the default lookup fails', async () => {
    const resolved = inferenceConnector('feature-ep');
    getForFeature.mockResolvedValue({ endpoints: [resolved], warnings: [], soEntryFound: true });
    getConnectorList.mockResolvedValue([resolved]);
    getConnectorById.mockRejectedValue(new Error('not found'));

    const result = await resolve({ defaultConnectorId: 'missing' });

    expect(result.connectors).toEqual([resolved]);
  });

  it('does not flag anything in a saved override when ignoreGlobalDefault is true', async () => {
    const defaultInOverride = inferenceConnector('default');
    getForFeature.mockResolvedValue({
      endpoints: [defaultInOverride],
      warnings: [],
      soEntryFound: true,
    });
    getConnectorList.mockResolvedValue([defaultInOverride]);
    getConnectorById.mockResolvedValue(defaultInOverride);

    const result = await resolve({ defaultConnectorId: 'default' }, 'my_feature', true);

    expect(getConnectorById).not.toHaveBeenCalled();
    expect(result.connectors).toEqual([defaultInOverride]);
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

  describe('ignoreGlobalDefault', () => {
    it('still returns only the default connector when ignoreGlobalDefault is true and defaultConnectorOnly is set', async () => {
      const defaultConnector = inferenceConnector('default-id');
      getConnectorById.mockResolvedValue(defaultConnector);

      const result = await resolve(
        { defaultConnectorId: 'default-id', defaultConnectorOnly: true },
        'my_feature',
        true
      );

      expect(getForFeature).not.toHaveBeenCalled();
      expect(getConnectorList).not.toHaveBeenCalled();
      expect(result).toEqual({
        connectors: [{ ...defaultConnector, isDefault: true }],
        warnings: [],
        soEntryFound: false,
      });
    });

    it('does not prepend the global default when ignoreGlobalDefault is true and soEntryFound is false', async () => {
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

      const result = await resolve({ defaultConnectorId: 'default' }, 'my_feature', true);

      expect(getConnectorById).not.toHaveBeenCalled();
      expect(result).toEqual({
        connectors: [{ ...recommended, isRecommended: true }, other],
        warnings: [],
        soEntryFound: false,
      });
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

  describe('onlyReturnConfigured option', () => {
    it('returns empty list when no SO override and no recommendedEndpoints', async () => {
      getForFeature.mockResolvedValue({
        endpoints: [],
        warnings: [],
        soEntryFound: false,
      });

      const result = await resolve({}, 'my_feature', false, { onlyReturnConfigured: true });

      expect(getConnectorList).not.toHaveBeenCalled();
      expect(getConnectorById).not.toHaveBeenCalled();
      expect(result).toEqual({ connectors: [], warnings: [], soEntryFound: false });
    });

    it('sets isRecommended on recommendedEndpoints (soEntryFound=false)', async () => {
      const recommended = inferenceConnector('rec');
      getForFeature.mockResolvedValue({
        endpoints: [recommended],
        warnings: [],
        soEntryFound: false,
      });

      const result = await resolve({}, 'my_feature', false, { onlyReturnConfigured: true });

      expect(getConnectorList).not.toHaveBeenCalled();
      expect(result).toEqual({
        connectors: [{ ...recommended, isRecommended: true }],
        warnings: [],
        soEntryFound: false,
      });
    });

    it('does not set isRecommended on SO override endpoints (soEntryFound=true)', async () => {
      const soEndpoint = inferenceConnector('so-ep');
      getForFeature.mockResolvedValue({
        endpoints: [soEndpoint],
        warnings: [],
        soEntryFound: true,
      });

      const result = await resolve({}, 'my_feature', false, { onlyReturnConfigured: true });

      expect(getConnectorList).not.toHaveBeenCalled();
      expect(result).toEqual({
        connectors: [soEndpoint],
        warnings: [],
        soEntryFound: true,
      });
      expect(result.connectors[0]).not.toHaveProperty('isRecommended');
    });

    it('does not prepend global default even when one is configured', async () => {
      const recommended = inferenceConnector('rec');
      getForFeature.mockResolvedValue({
        endpoints: [recommended],
        warnings: [],
        soEntryFound: false,
      });

      const result = await resolve({ defaultConnectorId: 'global-default' }, 'my_feature', false, {
        onlyReturnConfigured: true,
      });

      expect(getConnectorById).not.toHaveBeenCalled();
      expect(result.connectors).toHaveLength(1);
      expect(result.connectors[0].connectorId).toBe('rec');
    });

    it('still enforces defaultConnectorOnly policy before the onlyReturnConfigured path', async () => {
      const defaultConnector = inferenceConnector('admin-default');
      getConnectorById.mockResolvedValue(defaultConnector);

      const result = await resolve(
        { defaultConnectorId: 'admin-default', defaultConnectorOnly: true },
        'my_feature',
        false,
        { onlyReturnConfigured: true }
      );

      expect(getForFeature).not.toHaveBeenCalled();
      expect(result).toEqual({
        connectors: [{ ...defaultConnector, isDefault: true }],
        warnings: [],
        soEntryFound: false,
      });
    });

    it('propagates warnings from getForFeature', async () => {
      const recommended = inferenceConnector('rec');
      getForFeature.mockResolvedValue({
        endpoints: [recommended],
        warnings: ['Endpoint "missing" was not found.'],
        soEntryFound: false,
      });

      const result = await resolve({}, 'my_feature', false, { onlyReturnConfigured: true });

      expect(result.warnings).toEqual(['Endpoint "missing" was not found.']);
    });
  });
});
