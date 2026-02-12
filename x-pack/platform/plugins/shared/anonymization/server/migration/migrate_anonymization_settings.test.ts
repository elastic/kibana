/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, IUiSettingsClient, Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { migrateAnonymizationSettings } from './migrate_anonymization_settings';

const createDeps = () => {
  const esClientMock = {
    search: jest.fn(),
    update: jest.fn(),
  };
  const uiSettingsMock = {
    get: jest.fn(),
  };

  return {
    esClientMock,
    esClient: esClientMock as unknown as ElasticsearchClient,
    uiSettingsMock,
    uiSettings: uiSettingsMock as unknown as IUiSettingsClient,
    logger: loggerMock.create() as unknown as Logger,
  };
};

describe('migrateAnonymizationSettings', () => {
  it('returns without migration when legacy setting is missing', async () => {
    const { esClient, esClientMock, uiSettings, uiSettingsMock, logger } = createDeps();
    uiSettingsMock.get.mockRejectedValueOnce(new Error('not found'));

    await migrateAnonymizationSettings({ namespace: 'default', esClient, uiSettings, logger });

    expect(esClientMock.search).not.toHaveBeenCalled();
    expect(esClientMock.update).not.toHaveBeenCalled();
  });

  it('migrates enabled regex and NER rules to unmigrated profile documents', async () => {
    const { esClient, esClientMock, uiSettings, uiSettingsMock, logger } = createDeps();
    uiSettingsMock.get.mockResolvedValueOnce(
      JSON.stringify({
        rules: [
          { type: 'RegExp', enabled: true, pattern: 'foo', entityClass: 'TEST_REGEX' },
          { type: 'NER', enabled: true, modelId: 'ner-v1', allowedEntityClasses: ['PER'] },
        ],
      })
    );
    esClientMock.search
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'profile-1',
              sort: ['2026-01-01T00:00:00.000Z', 'profile-1'],
              _source: {
                rules: {
                  regex_rules: [],
                  ner_rules: [],
                },
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({ hits: { hits: [] } });

    await migrateAnonymizationSettings({ namespace: 'default', esClient, uiSettings, logger });

    expect(esClientMock.update).toHaveBeenCalledTimes(1);
    expect(esClientMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'profile-1',
        doc: expect.objectContaining({
          migration: expect.any(Object),
          rules: expect.objectContaining({
            regex_rules: [expect.objectContaining({ entity_class: 'TEST_REGEX' })],
            ner_rules: [expect.objectContaining({ model_id: 'ner-v1' })],
          }),
        }),
      })
    );
  });
});
