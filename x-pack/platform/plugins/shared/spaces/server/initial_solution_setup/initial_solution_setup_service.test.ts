/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import { InitialSolutionSetupService } from './initial_solution_setup_service';
import { SOLUTION_VIEW_CLASSIC } from '../../common/constants';
import type { SpaceSavedObjectAttributes } from '../types';

interface MockOptions {
  enabled?: boolean;
  attributes?: SpaceSavedObjectAttributes;
  notFound?: boolean;
  version?: string;
}

const createService = (options: MockOptions = {}) => {
  const mockGet = jest.fn();
  const mockUpdate = jest.fn().mockResolvedValue({});

  if (options.notFound) {
    mockGet.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('space', DEFAULT_SPACE_ID)
    );
  } else {
    mockGet.mockResolvedValue({
      attributes: options.attributes ?? {},
      version: options.version ?? 'v1',
    });
  }

  const getSavedObjects = jest.fn().mockResolvedValue({
    createInternalRepository: jest.fn().mockReturnValue({
      get: mockGet,
      update: mockUpdate,
    }),
  });

  const service = new InitialSolutionSetupService({
    enabled: options.enabled ?? true,
    getSavedObjects,
  });

  return { service, mockGet, mockUpdate };
};

describe('InitialSolutionSetupService', () => {
  describe('#isRequired()', () => {
    it('returns false when disabled', async () => {
      const { service, mockGet } = createService({ enabled: false });

      await expect(service.isRequired()).resolves.toBe(false);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('returns true when the default space marker is set', async () => {
      const { service } = createService({ attributes: { solutionSetupRequired: true } });

      await expect(service.isRequired()).resolves.toBe(true);
    });

    it('returns false when the default space marker is unset', async () => {
      const { service } = createService({ attributes: {} });

      await expect(service.isRequired()).resolves.toBe(false);
    });

    it('returns false when the default space is missing and does not cache the result', async () => {
      const { service, mockGet } = createService({ notFound: true });

      await expect(service.isRequired()).resolves.toBe(false);
      await expect(service.isRequired()).resolves.toBe(false);
      expect(mockGet).toHaveBeenCalledTimes(2);
    });

    it('caches a terminal false marker', async () => {
      const { service, mockGet } = createService({
        attributes: { solutionSetupRequired: false },
      });

      await expect(service.isRequired()).resolves.toBe(false);
      await expect(service.isRequired()).resolves.toBe(false);
      expect(mockGet).toHaveBeenCalledTimes(1);
    });
  });

  describe('#complete()', () => {
    it.each([
      ['classic', SOLUTION_VIEW_CLASSIC],
      ['es', 'es'],
      ['oblt', 'oblt'],
      ['security', 'security'],
    ] as const)('persists %s as the space solution', async (_label, solution) => {
      const { service, mockUpdate } = createService({
        attributes: { solutionSetupRequired: true },
        version: 'v42',
      });

      await service.complete(solution);

      expect(mockUpdate).toHaveBeenCalledWith(
        'space',
        DEFAULT_SPACE_ID,
        { solution, solutionSetupRequired: false },
        { version: 'v42' }
      );
    });

    it('rejects completion when disabled', async () => {
      const { service } = createService({ enabled: false });

      await expect(service.complete('es')).rejects.toMatchInlineSnapshot(
        `[Error: Initial solution setup is disabled]`
      );
    });

    it('rejects completion when setup is already complete', async () => {
      const { service } = createService({ attributes: { solutionSetupRequired: false } });

      await expect(service.complete('es')).rejects.toMatchInlineSnapshot(
        `[Error: Initial solution setup is already complete]`
      );
    });

    it('caches completion so subsequent reads skip the repository', async () => {
      const { service, mockGet } = createService({
        attributes: { solutionSetupRequired: true },
      });

      await service.complete('security');
      mockGet.mockClear();

      await expect(service.isRequired()).resolves.toBe(false);
      expect(mockGet).not.toHaveBeenCalled();
    });
  });
});
