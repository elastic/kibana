/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createInferenceRequestError } from '@kbn/inference-common';
import {
  NIGHTSHIFT_DEFAULT_MODELS,
  NightshiftModelBlockedError,
  NightshiftModelNotFoundError,
} from '@kbn/significant-events-schema';
import {
  resolveNightshiftModel,
  type ResolveNightshiftModelOptions,
} from './resolve_nightshift_model';

type ResolverInputOverrides = Partial<
  Pick<ResolveNightshiftModelOptions, 'step' | 'requestedId' | 'roundConnectorId' | 'onFallback'>
>;

describe('resolveNightshiftModel', () => {
  let validateConnector: jest.MockedFunction<ResolveNightshiftModelOptions['validateConnector']>;
  let getModelRestriction: jest.MockedFunction<
    ResolveNightshiftModelOptions['getModelRestriction']
  >;

  const resolve = (overrides: ResolverInputOverrides = {}) =>
    resolveNightshiftModel({
      step: 'discovery',
      validateConnector,
      getModelRestriction,
      ...overrides,
    });

  beforeEach(() => {
    validateConnector = jest.fn(async (connectorId) => ({ connectorId }));
    getModelRestriction = jest.fn(async () => ({ defaultOnly: false }));
  });

  describe('model selection', () => {
    it('uses the default when the requested id is blank', async () => {
      await expect(resolve({ requestedId: '   ' })).resolves.toBe(
        NIGHTSHIFT_DEFAULT_MODELS.discovery
      );
      expect(validateConnector).toHaveBeenCalledWith(NIGHTSHIFT_DEFAULT_MODELS.discovery);
    });

    it('uses a strict requested id', async () => {
      await expect(resolve({ requestedId: ' requested-model ' })).resolves.toBe('requested-model');
      expect(validateConnector).toHaveBeenCalledWith('requested-model');
    });

    it('gives a strict requested id precedence over a round connector id', async () => {
      await expect(
        resolve({ requestedId: 'requested-model', roundConnectorId: 'round-model' })
      ).resolves.toBe('requested-model');
      expect(validateConnector).toHaveBeenCalledTimes(1);
      expect(validateConnector).toHaveBeenCalledWith('requested-model');
    });

    it('uses the round connector id when the requested id is blank', async () => {
      await expect(resolve({ requestedId: '   ', roundConnectorId: 'round-model' })).resolves.toBe(
        'round-model'
      );
      expect(validateConnector).toHaveBeenCalledTimes(1);
      expect(validateConnector).toHaveBeenCalledWith('round-model');
    });

    it('throws a named error when a strict requested id is not found', async () => {
      validateConnector.mockRejectedValue(createInferenceRequestError('not found', 404));

      await expect(resolve({ requestedId: 'missing-model' })).rejects.toEqual(
        new NightshiftModelNotFoundError('missing-model')
      );
      expect(getModelRestriction).not.toHaveBeenCalled();
    });

    it('calls onFallback and uses the default when a round connector id is not found', async () => {
      const notFound = createInferenceRequestError('not found', 404);
      validateConnector.mockImplementation(async (connectorId) => {
        if (connectorId === 'removed-round-model') {
          throw notFound;
        }
        return { connectorId };
      });
      const onFallback = jest.fn();

      await expect(resolve({ roundConnectorId: 'removed-round-model', onFallback })).resolves.toBe(
        NIGHTSHIFT_DEFAULT_MODELS.discovery
      );
      expect(onFallback).toHaveBeenCalledWith(
        new NightshiftModelNotFoundError('removed-round-model')
      );
      expect(validateConnector.mock.calls).toEqual([
        ['removed-round-model'],
        [NIGHTSHIFT_DEFAULT_MODELS.discovery],
      ]);
    });

    it('throws a named error when the default is not found', async () => {
      validateConnector.mockRejectedValue(createInferenceRequestError('not found', 404));

      await expect(resolve()).rejects.toEqual(
        new NightshiftModelNotFoundError(NIGHTSHIFT_DEFAULT_MODELS.discovery)
      );
      expect(getModelRestriction).not.toHaveBeenCalled();
    });

    it.each([
      [
        'an inference request error with another status',
        createInferenceRequestError('denied', 403),
      ],
      ['another kind of error', new Error('lookup failed')],
    ])('rethrows %s from a round connector lookup', async (_description, error) => {
      validateConnector.mockRejectedValue(error);
      const onFallback = jest.fn();

      await expect(resolve({ roundConnectorId: 'round-model', onFallback })).rejects.toBe(error);
      expect(onFallback).not.toHaveBeenCalled();
      expect(getModelRestriction).not.toHaveBeenCalled();
    });
  });

  describe('canonical connector ids', () => {
    it('returns the canonical id for a strict alias', async () => {
      validateConnector.mockResolvedValue({ connectorId: 'endpoint-E' });

      await expect(resolve({ requestedId: 'alias-A' })).resolves.toBe('endpoint-E');
    });

    it('allows an alias when its canonical id is the effective default', async () => {
      validateConnector.mockResolvedValue({ connectorId: 'endpoint-E' });
      getModelRestriction.mockResolvedValue({
        defaultOnly: true,
        defaultConnectorId: 'endpoint-E',
      });

      await expect(resolve({ requestedId: 'alias-A' })).resolves.toBe('endpoint-E');
    });

    it('blocks an alias when its canonical id differs from the effective default', async () => {
      validateConnector.mockResolvedValue({ connectorId: 'endpoint-E' });
      getModelRestriction.mockResolvedValue({
        defaultOnly: true,
        defaultConnectorId: 'endpoint-D',
      });

      await expect(resolve({ requestedId: 'alias-A' })).rejects.toEqual(
        new NightshiftModelBlockedError('endpoint-E', 'endpoint-D')
      );
    });
  });

  describe('model restriction', () => {
    it('allows the selected canonical id when it is the platform default', async () => {
      getModelRestriction.mockResolvedValue({
        defaultOnly: true,
        defaultConnectorId: 'requested-model',
      });

      await expect(resolve({ requestedId: 'requested-model' })).resolves.toBe('requested-model');
    });

    it('blocks a strict requested model that differs from the platform default', async () => {
      getModelRestriction.mockResolvedValue({
        defaultOnly: true,
        defaultConnectorId: 'platform-default',
      });

      await expect(resolve({ requestedId: 'requested-model' })).rejects.toEqual(
        new NightshiftModelBlockedError('requested-model', 'platform-default')
      );
    });

    it('blocks a round model without falling back', async () => {
      getModelRestriction.mockResolvedValue({
        defaultOnly: true,
        defaultConnectorId: 'platform-default',
      });
      const onFallback = jest.fn();

      await expect(resolve({ roundConnectorId: 'round-model', onFallback })).rejects.toEqual(
        new NightshiftModelBlockedError('round-model', 'platform-default')
      );
      expect(onFallback).not.toHaveBeenCalled();
      expect(validateConnector).toHaveBeenCalledTimes(1);
      expect(validateConnector).toHaveBeenCalledWith('round-model');
    });

    it('blocks the Nightshift default when it differs from the platform default', async () => {
      getModelRestriction.mockResolvedValue({
        defaultOnly: true,
        defaultConnectorId: 'platform-default',
      });

      await expect(resolve()).rejects.toEqual(
        new NightshiftModelBlockedError(NIGHTSHIFT_DEFAULT_MODELS.discovery, 'platform-default')
      );
    });

    it('blocks every model when default-only is on without a platform default', async () => {
      getModelRestriction.mockResolvedValue({ defaultOnly: true });

      await expect(resolve({ requestedId: 'requested-model' })).rejects.toEqual(
        new NightshiftModelBlockedError('requested-model')
      );
    });

    it('does not apply the default connector id when default-only is off', async () => {
      getModelRestriction.mockResolvedValue({
        defaultOnly: false,
        defaultConnectorId: 'different-model',
      });

      await expect(resolve({ requestedId: 'requested-model' })).resolves.toBe('requested-model');
    });

    it('rethrows a failure to read the restriction', async () => {
      const error = new Error('could not read model restriction');
      getModelRestriction.mockRejectedValue(error);

      await expect(resolve()).rejects.toBe(error);
    });
  });
});
