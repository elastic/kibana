/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, SavedObjectsClientContract } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING } from '@kbn/management-settings-ids';
import { migrateTokenUsageTrackingToGlobal } from './migrate_token_usage_tracking_to_global';

const find = jest.fn();
const savedObjectsClient = { find } as unknown as SavedObjectsClientContract;

const getUserProvided = jest.fn();
const set = jest.fn();
const globalUiSettingsClient = { getUserProvided, set } as unknown as IUiSettingsClient;

const logger = loggerMock.create();

const configDocument = ({
  id,
  namespace,
  enabled,
}: {
  id: string;
  namespace?: string;
  enabled?: boolean;
}) => ({
  id,
  type: 'config',
  namespaces: namespace ? [namespace] : ['default'],
  attributes: enabled === undefined ? {} : { [GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING]: enabled },
});

const runMigration = () =>
  migrateTokenUsageTrackingToGlobal({ savedObjectsClient, globalUiSettingsClient, logger });

describe('migrateTokenUsageTrackingToGlobal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getUserProvided.mockResolvedValue({});
    find.mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 1000 });
  });

  it('turns the global setting on when a non-default space had it enabled', async () => {
    find.mockResolvedValue({
      saved_objects: [
        configDocument({ id: '9.5.0', enabled: false }),
        configDocument({ id: '9.5.0', namespace: 'engineering', enabled: true }),
      ],
      total: 2,
      page: 1,
      per_page: 1000,
    });

    await runMigration();

    expect(set).toHaveBeenCalledWith(GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING, true);
    expect(logger.info).toHaveBeenCalledTimes(1);
  });

  it('uses the newest config document in each space, not an older one', async () => {
    find.mockResolvedValue({
      saved_objects: [
        configDocument({ id: '9.5.0', namespace: 'engineering', enabled: true }),
        configDocument({ id: '9.7.0', namespace: 'engineering', enabled: false }),
      ],
      total: 2,
      page: 1,
      per_page: 1000,
    });

    await runMigration();

    expect(set).not.toHaveBeenCalled();
  });

  it('does nothing when no space had tracking enabled', async () => {
    find.mockResolvedValue({
      saved_objects: [
        configDocument({ id: '9.7.0', enabled: false }),
        configDocument({ id: '9.7.0', namespace: 'security' }),
      ],
      total: 2,
      page: 1,
      per_page: 1000,
    });

    await runMigration();

    expect(set).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('does nothing when the global setting already has a value', async () => {
    getUserProvided.mockResolvedValue({
      [GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING]: { userValue: false },
    });
    find.mockResolvedValue({
      saved_objects: [configDocument({ id: '9.7.0', namespace: 'engineering', enabled: true })],
      total: 1,
      page: 1,
      per_page: 1000,
    });

    await runMigration();

    expect(find).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });
});
