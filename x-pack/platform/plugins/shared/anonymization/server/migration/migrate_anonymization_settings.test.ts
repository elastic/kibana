/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { migrateAnonymizationSettings } from './migrate_anonymization_settings';
import type { ElasticsearchClient, IUiSettingsClient, Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';

const createDeps = () => {
  const esClientMock = {
    search: jest.fn(),
    update: jest.fn(),
  };
  const esClient = esClientMock as unknown as ElasticsearchClient;

  const uiSettingsMock = {
    get: jest.fn(),
  };
  const uiSettings = uiSettingsMock as unknown as IUiSettingsClient;

  const logger = loggerMock.create() as unknown as Logger;

  return { esClient, esClientMock, uiSettings, uiSettingsMock, logger };
};

describe('migrateAnonymizationSettings', () => {
  it('returns without migration when legacy setting is missing', async () => {
    const { esClient, esClientMock, uiSettings, uiSettingsMock, logger } = createDeps();
    uiSettingsMock.get.mockRejectedValueOnce(new Error('not found'));

    await migrateAnonymizationSettings({
      namespace: 'default',
      esClient,
      uiSettings,
      logger,
    });

    expect(esClientMock.search).not.toHaveBeenCalled();
    expect(esClientMock.update).not.toHaveBeenCalled();
  });

  it('migrates enabled regex and NER rules into unmigrated profiles', async () => {
    const { esClient, esClientMock, uiSettings, uiSettingsMock, logger } = createDeps();

    uiSettingsMock.get.mockResolvedValueOnce(
      JSON.stringify({
        rules: [
          {
            type: 'RegExp',
            enabled: true,
            pattern: '\\b\\d{3}-\\d{2}-\\d{4}\\b',
            entityClass: 'SSN',
          },
          {
            type: 'NER',
            enabled: true,
            modelId: 'ner-v1',
            allowedEntityClasses: ['PER'],
          },
          {
            type: 'RegExp',
            enabled: false,
            pattern: 'ignored',
            entityClass: 'IGNORED',
          },
        ],
      })
    );

    esClientMock.search.mockResolvedValueOnce({
      hits: {
        hits: [
          {
            _id: 'profile-1',
            _source: {
              namespace: 'default',
              rules: {
                field_rules: [],
                regex_rules: [],
                ner_rules: [],
              },
            },
          },
        ],
      },
    });

    await migrateAnonymizationSettings({
      namespace: 'default',
      esClient,
      uiSettings,
      logger,
    });

    expect(esClientMock.update).toHaveBeenCalledTimes(1);
    const updateArgs = esClientMock.update.mock.calls[0][0];
    expect(updateArgs.id).toBe('profile-1');
    expect(updateArgs.doc.rules.regex_rules).toHaveLength(1);
    expect(updateArgs.doc.rules.regex_rules[0].entity_class).toBe('SSN');
    expect(updateArgs.doc.rules.ner_rules).toHaveLength(1);
    expect(updateArgs.doc.rules.ner_rules[0].model_id).toBe('ner-v1');
    expect(updateArgs.doc.migration.ai_anonymization_settings.applied_at).toBeDefined();
  });

  it('does not overwrite existing regex or NER rules but records migration marker', async () => {
    const { esClient, esClientMock, uiSettings, uiSettingsMock, logger } = createDeps();

    uiSettingsMock.get.mockResolvedValueOnce(
      JSON.stringify({
        rules: [
          {
            type: 'RegExp',
            enabled: true,
            pattern: 'foo',
            entityClass: 'BAR',
          },
          {
            type: 'NER',
            enabled: true,
            modelId: 'ner-v1',
            allowedEntityClasses: ['PER'],
          },
        ],
      })
    );

    esClientMock.search.mockResolvedValueOnce({
      hits: {
        hits: [
          {
            _id: 'profile-2',
            _source: {
              namespace: 'default',
              rules: {
                field_rules: [],
                regex_rules: [{ id: 'existing-regex' }],
                ner_rules: [{ id: 'existing-ner' }],
              },
            },
          },
        ],
      },
    });

    await migrateAnonymizationSettings({
      namespace: 'default',
      esClient,
      uiSettings,
      logger,
    });

    expect(esClientMock.update).toHaveBeenCalledTimes(1);
    const updateArgs = esClientMock.update.mock.calls[0][0];
    expect(updateArgs.doc.migration.ai_anonymization_settings.applied_at).toBeDefined();
    expect(updateArgs.doc.rules).toBeUndefined();
  });

  it('is idempotent when no unmigrated profiles are returned', async () => {
    const { esClient, esClientMock, uiSettings, uiSettingsMock, logger } = createDeps();

    uiSettingsMock.get.mockResolvedValueOnce(
      JSON.stringify({
        rules: [{ type: 'RegExp', enabled: true, pattern: 'x', entityClass: 'X' }],
      })
    );
    esClientMock.search.mockResolvedValueOnce({
      hits: {
        hits: [],
      },
    });

    await migrateAnonymizationSettings({
      namespace: 'default',
      esClient,
      uiSettings,
      logger,
    });

    expect(esClientMock.search).toHaveBeenCalledTimes(1);
    expect(esClientMock.update).not.toHaveBeenCalled();
  });
});
