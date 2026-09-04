/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import { InitialSolutionSetupService } from './initial_solution_setup_service';
import { spacesClientMock } from '../spaces_client/spaces_client.mock';

const createService = (options: { eligible?: boolean; required?: boolean } = {}) => {
  const spacesClient = spacesClientMock.create();
  spacesClient.isInitialSolutionSetupRequired.mockResolvedValue(options.required ?? false);

  const service = new InitialSolutionSetupService(options.eligible ?? true);
  return { service, spacesClient };
};

describe('InitialSolutionSetupService', () => {
  describe('#isRequired()', () => {
    it('returns false when not eligible', async () => {
      const { service, spacesClient } = createService({ eligible: false, required: true });

      await expect(service.isRequired(spacesClient)).resolves.toBe(false);
      expect(spacesClient.isInitialSolutionSetupRequired).not.toHaveBeenCalled();
    });

    it('returns true when the default space marker is set', async () => {
      const { service, spacesClient } = createService({ required: true });

      await expect(service.isRequired(spacesClient)).resolves.toBe(true);
    });

    it('returns false when the default space marker is unset', async () => {
      const { service, spacesClient } = createService({ required: false });

      await expect(service.isRequired(spacesClient)).resolves.toBe(false);
    });

    it('returns false without caching when the default space is missing', async () => {
      const { service, spacesClient } = createService();
      spacesClient.isInitialSolutionSetupRequired.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError('space', DEFAULT_SPACE_ID)
      );

      await expect(service.isRequired(spacesClient)).resolves.toBe(false);

      spacesClient.isInitialSolutionSetupRequired.mockResolvedValue(true);
      await expect(service.isRequired(spacesClient)).resolves.toBe(true);
      expect(spacesClient.isInitialSolutionSetupRequired).toHaveBeenCalledTimes(2);
    });

    it('propagates non-not-found client errors', async () => {
      const { service, spacesClient } = createService();
      spacesClient.isInitialSolutionSetupRequired.mockRejectedValue(
        new Error('setup check failed')
      );

      await expect(service.isRequired(spacesClient)).rejects.toThrow('setup check failed');
    });

    it('caches a terminal false marker', async () => {
      const { service, spacesClient } = createService({ required: false });

      await expect(service.isRequired(spacesClient)).resolves.toBe(false);
      await expect(service.isRequired(spacesClient)).resolves.toBe(false);
      expect(spacesClient.isInitialSolutionSetupRequired).toHaveBeenCalledTimes(1);
    });
  });

  describe('#markComplete()', () => {
    it('caches completion so subsequent reads skip the client', async () => {
      const { service, spacesClient } = createService({ required: true });

      service.markComplete();
      spacesClient.isInitialSolutionSetupRequired.mockClear();

      await expect(service.isRequired(spacesClient)).resolves.toBe(false);
      expect(spacesClient.isInitialSolutionSetupRequired).not.toHaveBeenCalled();
    });
  });

  describe('#isEligible()', () => {
    it('reflects constructor eligibility', () => {
      expect(new InitialSolutionSetupService(true).isEligible()).toBe(true);
      expect(new InitialSolutionSetupService(false).isEligible()).toBe(false);
    });
  });
});
