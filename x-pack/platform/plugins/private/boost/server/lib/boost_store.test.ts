/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { DEFAULT_RULE_PROFILES } from '../../common/presets';
import { getState, updateDefaultRule } from './boost_store';

const catalogsRule = {
  kind: 'rule',
  name: 'catalogs',
  index_patterns: ['catalog-*'],
  boost_profile: 'elastic-on-demand',
  priority: 1,
};

/** A saved objects client holding these settings and one custom rule. */
const createClient = (settings?: Record<string, unknown>) => {
  const client = savedObjectsClientMock.create();
  client.get.mockImplementation(async () => {
    if (!settings) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError();
    }
    return { id: 'settings', type: 'boost_prototype', references: [], attributes: settings };
  });
  client.find.mockImplementation(async ({ filter }) => ({
    saved_objects: String(filter).includes('rule')
      ? [
          {
            id: 'rule-catalogs',
            type: 'boost_prototype',
            references: [],
            score: 1,
            attributes: catalogsRule,
          },
        ]
      : [],
    total: 0,
    per_page: 1000,
    page: 1,
  }));
  return client;
};

const createEsClient = () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.indices.resolveIndex.mockResolvedValue({ indices: [], aliases: [], data_streams: [] });
  return esClient;
};

describe('getState', () => {
  it('starts with the out-of-the-box project defaults', async () => {
    const state = await getState(createClient(), createEsClient());

    expect(state.settings.default_profiles).toEqual(DEFAULT_RULE_PROFILES);
  });

  it('always applies custom rules, ahead of the default rules', async () => {
    const state = await getState(
      createClient({ kind: 'settings', default_profiles: DEFAULT_RULE_PROFILES }),
      createEsClient()
    );

    expect(state.rules.map(({ name }) => name)).toEqual([
      'catalogs',
      'elastic-default-indices',
      'elastic-default-data-streams',
    ]);
  });

  it('reads settings saved with simple and advanced modes as the default rules used them', async () => {
    const state = await getState(
      createClient({
        kind: 'settings',
        mode: 'simple',
        simple: { indices: 'on_demand', data_streams: { window: 'last_1_day' } },
        custom_defaults: { indices_profile: 'catalog-search', data_streams_profile: null },
      }),
      createEsClient()
    );

    expect(state.settings.default_profiles).toEqual({
      indices_profile: 'catalog-search',
      data_streams_profile: 'elastic-last-1-day',
    });
    // Simple mode suspended custom rules; they now apply.
    expect(state.rules.map(({ name }) => name)).toContain('catalogs');
  });
});

describe('updateDefaultRule', () => {
  it("sets one type's project default, keeping the other's", async () => {
    const client = createClient({ kind: 'settings', default_profiles: DEFAULT_RULE_PROFILES });

    await updateDefaultRule(client, 'data_streams', 'elastic-last-3-days');

    expect(client.create).toHaveBeenCalledWith(
      'boost_prototype',
      {
        kind: 'settings',
        default_profiles: {
          indices_profile: 'elastic-performant',
          data_streams_profile: 'elastic-last-3-days',
        },
      },
      expect.objectContaining({ overwrite: true })
    );
  });
});
