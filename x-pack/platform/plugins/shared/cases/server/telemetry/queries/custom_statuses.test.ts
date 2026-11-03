/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResult } from '@kbn/core/server';
import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { CASES_SPACE_SETTINGS_SAVED_OBJECT } from '../../../common/constants';
import type {
  CaseStatusDefinition,
  CasesSpaceSettings,
} from '../../../common/types/domain/space_settings/v1';
import { DEFAULT_CASE_STATUSES } from '../../../common/utils/statuses';
import { TelemetrySavedObjectsClient } from '../telemetry_saved_objects_client';
import { getCustomStatusesTelemetryData } from './custom_statuses';

const customStatus = (
  key: string,
  category: CaseStatusDefinition['category']
): CaseStatusDefinition => ({
  key,
  label: key,
  color: 'default',
  category,
  order: 10,
  isDefault: false,
  disabled: false,
});

const settingsSO = (
  id: string,
  attributes: CasesSpaceSettings
): SavedObjectsFindResult<CasesSpaceSettings> => ({
  id,
  type: CASES_SPACE_SETTINGS_SAVED_OBJECT,
  attributes,
  references: [],
  score: 0,
});

describe('getCustomStatusesTelemetryData', () => {
  const logger = loggingSystemMock.createLogger();
  const repository = savedObjectsRepositoryMock.create();
  const savedObjectsClient = new TelemetrySavedObjectsClient(repository);
  const close = jest.fn();

  const mockPages = (pages: Array<Array<SavedObjectsFindResult<CasesSpaceSettings>>>) => {
    repository.createPointInTimeFinder.mockReturnValue({
      async *find() {
        for (const savedObjects of pages) {
          yield {
            saved_objects: savedObjects,
            total: savedObjects.length,
            per_page: 1000,
            page: 1,
          };
        }
      },
      close,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports zeros when no space saved statuses', async () => {
    mockPages([[]]);

    await expect(getCustomStatusesTelemetryData({ savedObjectsClient, logger })).resolves.toEqual({
      totalSpaces: 0,
      byCategory: {
        notStarted: { total: 0, max: 0 },
        active: { total: 0, max: 0 },
        done: { total: 0, max: 0 },
      },
    });
    expect(close).toHaveBeenCalled();
  });

  it('counts the spaces and the statuses per category across every space', async () => {
    mockPages([
      [
        settingsSO('space-a', {
          statuses: [
            ...DEFAULT_CASE_STATUSES,
            customStatus('triage', 'not_started'),
            customStatus('duplicate', 'done'),
            customStatus('false_positive', 'done'),
          ],
        }),
      ],
      [
        settingsSO('space-b', { statuses: [...DEFAULT_CASE_STATUSES] }),
        settingsSO('space-c', { statuses: [] }),
      ],
    ]);

    await expect(getCustomStatusesTelemetryData({ savedObjectsClient, logger })).resolves.toEqual({
      totalSpaces: 2,
      byCategory: {
        notStarted: { total: 3, max: 2 },
        active: { total: 2, max: 1 },
        done: { total: 4, max: 3 },
      },
    });
    expect(repository.createPointInTimeFinder).toHaveBeenCalledWith(
      { type: CASES_SPACE_SETTINGS_SAVED_OBJECT, namespaces: ['*'], perPage: 1000 },
      expect.anything()
    );
  });

  it('logs, closes the finder, and rethrows on failure', async () => {
    repository.createPointInTimeFinder.mockReturnValue({
      async *find() {
        yield* [];
        throw new Error('boom');
      },
      close,
    });

    await expect(getCustomStatusesTelemetryData({ savedObjectsClient, logger })).rejects.toThrow(
      'boom'
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Cases custom statuses telemetry failed with error: Error: boom'
    );
    expect(close).toHaveBeenCalled();
  });
});
