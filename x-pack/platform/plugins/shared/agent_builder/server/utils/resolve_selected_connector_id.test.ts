/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveSelectedConnectorId } from './resolve_selected_connector_id';
import { type InferenceConnector, InferenceConnectorType } from '@kbn/inference-common';
import { PREFERRED_DEFAULT_CONNECTOR_ID } from '../../common/constants';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { inferenceMock } from '@kbn/inference-plugin/server/mocks';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';

const setupCoreMocks = (values: Record<string, any>) => {
  const savedObjects = savedObjectsServiceMock.createStartContract();
  const uiSettings = uiSettingsServiceMock.createStartContract();
  const request = httpServerMock.createKibanaRequest();

  const soClient = {} as any;
  savedObjects.getScopedClient.mockReturnValue(soClient);

  const get = jest.fn(async (key: string) => values[key]);
  uiSettings.asScopedToClient.mockReturnValue({ get } as any);

  return { savedObjects, uiSettings, request };
};

describe('resolveSelectedConnectorId', () => {
  it('throws when defaultOnly=true and explicit connectorId does not match default', async () => {
    const { savedObjects, uiSettings, request } = setupCoreMocks({
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: 'default-id',
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: true,
    });
    const inference = inferenceMock.createStartContract();

    await expect(
      resolveSelectedConnectorId({
        uiSettings,
        savedObjects,
        request,
        connectorId: 'explicit-id',
        inference,
      })
    ).rejects.toThrow(
      'Connector ID [explicit-id] does not match the configured default connector ID [default-id].'
    );
    expect(inference.getDefaultConnector).not.toHaveBeenCalled();
    expect(inference.getConnectorList).not.toHaveBeenCalled();
  });

  it('returns default connector when defaultOnly=true and explicit connectorId matches default', async () => {
    const { savedObjects, uiSettings, request } = setupCoreMocks({
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: 'default-id',
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: true,
    });
    const inference = inferenceMock.createStartContract();

    const result = await resolveSelectedConnectorId({
      uiSettings,
      savedObjects,
      request,
      connectorId: 'default-id',
      inference,
    });

    expect(result).toBe('default-id');
    expect(inference.getDefaultConnector).not.toHaveBeenCalled();
    expect(inference.getConnectorList).not.toHaveBeenCalled();
  });

  it('returns explicit connectorId when provided and defaultOnly=false', async () => {
    const { savedObjects, uiSettings, request } = setupCoreMocks({
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: 'default-id',
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: false,
    });
    const inference = inferenceMock.createStartContract();

    const result = await resolveSelectedConnectorId({
      uiSettings,
      savedObjects,
      request,
      connectorId: 'explicit-id',
      inference,
    });

    expect(result).toBe('explicit-id');
    expect(inference.getDefaultConnector).not.toHaveBeenCalled();
    expect(inference.getConnectorList).not.toHaveBeenCalled();
  });

  it('returns default connector when provided and defaultOnly=false', async () => {
    const { savedObjects, uiSettings, request } = setupCoreMocks({
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: 'default-id',
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: false,
    });
    const inference = inferenceMock.createStartContract();

    const result = await resolveSelectedConnectorId({
      uiSettings,
      savedObjects,
      request,
      inference,
    });

    expect(result).toBe('default-id');
    expect(inference.getDefaultConnector).not.toHaveBeenCalled();
    expect(inference.getConnectorList).not.toHaveBeenCalled();
  });

  it('falls back to inference default when no valid default setting exists', async () => {
    const { savedObjects, uiSettings, request } = setupCoreMocks({
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: 'NO_DEFAULT_CONNECTOR',
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: false,
    });
    const inference = inferenceMock.createStartContract();
    (inference.getDefaultConnector as jest.Mock).mockResolvedValue({
      connectorId: 'inference-default-id',
    });

    const result = await resolveSelectedConnectorId({
      uiSettings,
      savedObjects,
      request,
      inference,
    });

    expect(result).toBe('inference-default-id');
    expect(inference.getDefaultConnector).toHaveBeenCalledTimes(1);
    expect(inference.getConnectorList).not.toHaveBeenCalled();
  });

  it('prefers Anthropic-Claude-Sonnet-4-5 when available in connector list', async () => {
    const { savedObjects, uiSettings, request } = setupCoreMocks({
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: 'NO_DEFAULT_CONNECTOR',
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: false,
    });
    const inference = inferenceMock.createStartContract();
    (inference.getDefaultConnector as jest.Mock).mockRejectedValue(new Error('no default'));
    (inference.getConnectorList as jest.Mock).mockResolvedValue([
      { connectorId: 'inference-id', type: InferenceConnectorType.Inference } as InferenceConnector,
      {
        connectorId: PREFERRED_DEFAULT_CONNECTOR_ID,
        type: InferenceConnectorType.Inference,
      } as InferenceConnector,
      { connectorId: 'openai-id', type: InferenceConnectorType.OpenAI } as InferenceConnector,
    ]);

    const result = await resolveSelectedConnectorId({
      uiSettings,
      savedObjects,
      request,
      inference,
    });

    expect(result).toBe(PREFERRED_DEFAULT_CONNECTOR_ID);
  });

  it('selects Inference connector over OpenAI when falling back to connector list', async () => {
    const { savedObjects, uiSettings, request } = setupCoreMocks({
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: 'NO_DEFAULT_CONNECTOR',
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: false,
    });
    const inference = inferenceMock.createStartContract();
    (inference.getDefaultConnector as jest.Mock).mockRejectedValue(new Error('no default'));
    (inference.getConnectorList as jest.Mock).mockResolvedValue([
      { connectorId: 'openai-id', type: InferenceConnectorType.OpenAI } as InferenceConnector,
      { connectorId: 'inference-id', type: InferenceConnectorType.Inference } as InferenceConnector,
      { connectorId: 'first-id', type: InferenceConnectorType.Gemini } as InferenceConnector,
    ]);

    const result = await resolveSelectedConnectorId({
      uiSettings,
      savedObjects,
      request,
      inference,
    });

    expect(result).toBe('inference-id');
  });

  it('selects OpenAI connector when Inference is not available', async () => {
    const { savedObjects, uiSettings, request } = setupCoreMocks({
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: 'NO_DEFAULT_CONNECTOR',
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: false,
    });
    const inference = inferenceMock.createStartContract();
    (inference.getDefaultConnector as jest.Mock).mockRejectedValue(new Error('no default'));
    (inference.getConnectorList as jest.Mock).mockResolvedValue([
      { connectorId: 'openai-id', type: InferenceConnectorType.OpenAI } as InferenceConnector,
      { connectorId: 'first-id', type: InferenceConnectorType.Gemini } as InferenceConnector,
    ]);

    const result = await resolveSelectedConnectorId({
      uiSettings,
      savedObjects,
      request,
      inference,
    });

    expect(result).toBe('openai-id');
  });

  it('selects first connector when neither Inference nor OpenAI are available', async () => {
    const { savedObjects, uiSettings, request } = setupCoreMocks({
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: 'NO_DEFAULT_CONNECTOR',
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: false,
    });
    const inference = inferenceMock.createStartContract();
    (inference.getDefaultConnector as jest.Mock).mockRejectedValue(new Error('no default'));
    (inference.getConnectorList as jest.Mock).mockResolvedValue([
      { connectorId: 'first-id', type: InferenceConnectorType.Gemini } as InferenceConnector,
      { connectorId: 'second-id', type: InferenceConnectorType.Bedrock } as InferenceConnector,
    ]);

    const result = await resolveSelectedConnectorId({
      uiSettings,
      savedObjects,
      request,
      inference,
    });

    expect(result).toBe('first-id');
  });

  it('returns undefined when no default and no connectors are available', async () => {
    const { savedObjects, uiSettings, request } = setupCoreMocks({
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: 'NO_DEFAULT_CONNECTOR',
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: false,
    });
    const inference = inferenceMock.createStartContract();
    (inference.getDefaultConnector as jest.Mock).mockRejectedValue(new Error('no default'));
    (inference.getConnectorList as jest.Mock).mockResolvedValue([]);

    const result = await resolveSelectedConnectorId({
      uiSettings,
      savedObjects,
      request,
      inference,
    });

    expect(result).toBeUndefined();
  });
});
