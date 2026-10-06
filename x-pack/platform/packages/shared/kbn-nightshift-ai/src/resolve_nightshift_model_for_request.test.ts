/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createInferenceRequestError } from '@kbn/inference-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY } from '@kbn/management-settings-ids';
import {
  NIGHTSHIFT_DEFAULT_MODELS,
  NightshiftModelNotFoundError,
} from '@kbn/significant-events-schema';
import {
  getNightshiftModelRestriction,
  resolveNightshiftModelForRequest,
} from './resolve_nightshift_model_for_request';

const request = {} as KibanaRequest;
const getConnectorById = jest.fn(async (connectorId: string) => ({ connectorId }));
const getClient = jest.fn();
const getDefaultConnector = jest.fn();
const inference = {
  getClient,
  getDefaultConnector,
  getConnectorById,
} as unknown as InferenceServerStart;
const getSetting = jest.fn().mockResolvedValue(false);
const savedObjects = { getScopedClient: jest.fn().mockReturnValue({}) } as never;
const uiSettings = {
  asScopedToClient: jest.fn().mockReturnValue({ get: getSetting }),
} as never;

beforeEach(() => {
  jest.clearAllMocks();
  getSetting.mockResolvedValue(false);
  getConnectorById.mockImplementation(async (connectorId: string) => ({ connectorId }));
});

it('resolves the code-owned default through the request-aware server lookup', async () => {
  await expect(
    resolveNightshiftModelForRequest({
      request,
      inference,
      savedObjects,
      uiSettings,
      step: 'kiExtraction',
    })
  ).resolves.toBe(NIGHTSHIFT_DEFAULT_MODELS.kiExtraction);

  expect(getConnectorById).toHaveBeenCalledWith(NIGHTSHIFT_DEFAULT_MODELS.kiExtraction, request);
  expect(getClient).not.toHaveBeenCalled();
});

it('returns the canonical connector ID for a strict override', async () => {
  getConnectorById.mockResolvedValue({ connectorId: 'canonical-model' });

  await expect(
    resolveNightshiftModelForRequest({
      request,
      inference,
      savedObjects,
      uiSettings,
      step: 'discovery',
      requestedId: 'model-alias',
    })
  ).resolves.toBe('canonical-model');
  expect(getConnectorById).toHaveBeenCalledWith('model-alias', request);
});

it('passes a round model and falls back to the code default if it is missing', async () => {
  getConnectorById.mockImplementation(async (connectorId: string) => {
    if (connectorId === 'removed-round-model') {
      throw createInferenceRequestError('not found', 404);
    }
    return { connectorId };
  });
  const onFallback = jest.fn();

  await expect(
    resolveNightshiftModelForRequest({
      request,
      inference,
      savedObjects,
      uiSettings,
      step: 'investigation',
      roundConnectorId: 'removed-round-model',
      onFallback,
    })
  ).resolves.toBe(NIGHTSHIFT_DEFAULT_MODELS.investigation);

  expect(getConnectorById.mock.calls).toEqual([
    ['removed-round-model', request],
    [NIGHTSHIFT_DEFAULT_MODELS.investigation, request],
  ]);
  expect(onFallback).toHaveBeenCalledWith(new NightshiftModelNotFoundError('removed-round-model'));
});

it('does not load the platform default when the default-only setting is off', async () => {
  await expect(
    getNightshiftModelRestriction({ request, inference, savedObjects, uiSettings })
  ).resolves.toEqual({ defaultOnly: false });

  expect(getSetting).toHaveBeenCalledWith(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY, {
    request,
  });
  expect(getDefaultConnector).not.toHaveBeenCalled();
});

it('returns the canonical platform default when the restriction is on', async () => {
  getSetting.mockResolvedValue(true);
  getDefaultConnector.mockResolvedValue({ connectorId: 'canonical-default' });

  await expect(
    getNightshiftModelRestriction({ request, inference, savedObjects, uiSettings })
  ).resolves.toEqual({ defaultOnly: true, defaultConnectorId: 'canonical-default' });
  expect(getDefaultConnector).toHaveBeenCalledWith(request);
});
