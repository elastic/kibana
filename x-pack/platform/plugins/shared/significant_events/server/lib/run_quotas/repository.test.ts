/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { RunQuotaSettingsAttributes } from './saved_objects';
import {
  patchRunQuotaSettings,
  readRunQuotaSettings,
  type RunQuotaSavedObjectsRepository,
} from './repository';

const makeSavedObject = <T extends Record<string, unknown>>(
  attributes: T,
  version = 'WzEsMV0='
) => ({
  type: 'settings',
  id: 'settings',
  attributes,
  references: [],
  version,
});

const makeRepository = (): jest.Mocked<RunQuotaSavedObjectsRepository> =>
  ({
    create: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<RunQuotaSavedObjectsRepository>);

describe('run quota settings repository', () => {
  it('returns disabled enforcement and the default limits when settings do not exist', async () => {
    const repository = makeRepository();
    repository.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('settings', 'settings')
    );

    await expect(readRunQuotaSettings(repository)).resolves.toEqual({
      enabled: false,
      limits: {
        detection: 100,
        investigation: 30,
        ki_extraction: 20,
      },
    });
  });

  it('preserves unrelated fields and groups when a settings patch conflicts', async () => {
    const repository = makeRepository();
    const first: RunQuotaSettingsAttributes = {
      enabled: false,
      limits: {
        detection: 100,
        investigation: 30,
        ki_extraction: 20,
        future_group: 9,
      },
      futureTopLevel: { retained: 'first' },
    };
    const winner: RunQuotaSettingsAttributes = {
      ...first,
      enabled: true,
      limits: {
        ...first.limits,
        investigation: 40,
      },
      futureTopLevel: { retained: 'winner' },
    };
    repository.get
      .mockResolvedValueOnce(makeSavedObject(first))
      .mockResolvedValueOnce(makeSavedObject(winner, 'WzIsMV0='));
    repository.update
      .mockRejectedValueOnce(SavedObjectsErrorHelpers.createConflictError('settings', 'settings'))
      .mockImplementation(async (_type, _id, attributes) =>
        makeSavedObject(attributes as RunQuotaSettingsAttributes, 'WzMsMV0=')
      );

    await expect(
      patchRunQuotaSettings(repository, {
        limits: { detection: 120 },
      })
    ).resolves.toEqual({
      enabled: true,
      futureTopLevel: { retained: 'winner' },
      limits: {
        detection: 120,
        investigation: 40,
        ki_extraction: 20,
        future_group: 9,
      },
    });
  });
});
