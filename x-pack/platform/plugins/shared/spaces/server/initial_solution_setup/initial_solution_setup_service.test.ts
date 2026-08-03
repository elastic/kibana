/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import { InitialSolutionSetupService } from './initial_solution_setup_service';
import { SOLUTION_VIEW_CLASSIC } from '../../common/constants';
import { spacesClientMock } from '../spaces_client/spaces_client.mock';

interface MockOptions {
  enabled?: boolean;
  required?: boolean;
  notFound?: boolean;
}

const createService = (options: MockOptions = {}) => {
  const spacesClient = spacesClientMock.create();

  if (options.notFound) {
    spacesClient.isInitialSolutionSetupRequired.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('space', DEFAULT_SPACE_ID)
    );
  } else {
    spacesClient.isInitialSolutionSetupRequired.mockResolvedValue(options.required ?? false);
  }

  spacesClient.completeInitialSolutionSetup.mockResolvedValue(undefined);

  const service = new InitialSolutionSetupService({
    enabled: options.enabled ?? true,
  });

  return { service, spacesClient };
};

describe('InitialSolutionSetupService', () => {
  describe('#isRequired()', () => {
    it('returns false when disabled', async () => {
      const { service, spacesClient } = createService({ enabled: false, required: true });

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

    it('returns false when the default space is missing and does not cache the result', async () => {
      const { service, spacesClient } = createService({ notFound: true });

      await expect(service.isRequired(spacesClient)).resolves.toBe(false);
      await expect(service.isRequired(spacesClient)).resolves.toBe(false);
      expect(spacesClient.isInitialSolutionSetupRequired).toHaveBeenCalledTimes(2);
    });

    it('caches a terminal false marker', async () => {
      const { service, spacesClient } = createService({ required: false });

      await expect(service.isRequired(spacesClient)).resolves.toBe(false);
      await expect(service.isRequired(spacesClient)).resolves.toBe(false);
      expect(spacesClient.isInitialSolutionSetupRequired).toHaveBeenCalledTimes(1);
    });
  });

  describe('#complete()', () => {
    it.each([
      ['classic', SOLUTION_VIEW_CLASSIC],
      ['es', 'es'],
      ['oblt', 'oblt'],
      ['security', 'security'],
    ] as const)('persists %s as the space solution', async (_label, solution) => {
      const { service, spacesClient } = createService();

      await service.complete(spacesClient, solution);

      expect(spacesClient.completeInitialSolutionSetup).toHaveBeenCalledWith(solution);
    });

    it('rejects completion when disabled', async () => {
      const { service, spacesClient } = createService({ enabled: false });

      await expect(service.complete(spacesClient, 'es')).rejects.toMatchInlineSnapshot(
        `[Error: Initial solution setup is disabled]`
      );
      expect(spacesClient.completeInitialSolutionSetup).not.toHaveBeenCalled();
    });

    it('propagates conflicts when setup is already complete', async () => {
      const { service, spacesClient } = createService();
      spacesClient.completeInitialSolutionSetup.mockRejectedValue(
        Boom.conflict('Initial solution setup is already complete')
      );

      await expect(service.complete(spacesClient, 'es')).rejects.toMatchInlineSnapshot(
        `[Error: Initial solution setup is already complete]`
      );
    });

    it('caches completion so subsequent reads skip the client', async () => {
      const { service, spacesClient } = createService({ required: true });

      await service.complete(spacesClient, 'security');
      spacesClient.isInitialSolutionSetupRequired.mockClear();

      await expect(service.isRequired(spacesClient)).resolves.toBe(false);
      expect(spacesClient.isInitialSolutionSetupRequired).not.toHaveBeenCalled();
    });
  });
});
