/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { DEFAULT_RULE_PROFILES } from '../../common/presets';
import { createRule, explain, getState, updateDefaultRule, updateRule } from './boost_store';
import { BoostRequestError } from './errors';

const catalogsRule = {
  kind: 'rule',
  name: 'catalogs',
  index_patterns: ['catalog-*'],
  boost_profile: '_on-demand',
  priority: 1,
};

/** A saved objects client holding these settings and one custom rule. */
const createClient = (settings?: Record<string, unknown>, rule: object = catalogsRule) => {
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
            attributes: rule,
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
      '_default-indices',
      '_default-data-streams',
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
      data_streams_profile: '_last-1-day',
    });
    // Simple mode suspended custom rules; they now apply.
    expect(state.rules.map(({ name }) => name)).toContain('catalogs');
  });

  it('reads built-in profiles saved under their names from before the `_` prefix', async () => {
    const state = await getState(
      createClient(
        {
          kind: 'settings',
          default_profiles: {
            indices_profile: 'elastic-on-demand',
            data_streams_profile: 'elastic-last-3-days',
          },
        },
        { ...catalogsRule, boost_profile: 'elastic-high-availability' }
      ),
      createEsClient()
    );

    expect(state.settings.default_profiles).toEqual({
      indices_profile: '_on-demand',
      data_streams_profile: '_last-3-days',
    });
    expect(state.rules.find(({ name }) => name === 'catalogs')?.boost_profile).toBe(
      '_high-availability'
    );
  });
});

describe('explain', () => {
  const settings = { kind: 'settings', default_profiles: DEFAULT_RULE_PROFILES };

  it('reports the profile that applies, and every matching rule, the applied rule first', async () => {
    const esClient = createEsClient();
    esClient.indices.resolveIndex.mockResolvedValue({
      indices: [{ name: 'catalog-fall', attributes: ['open'] }],
      aliases: [],
      data_streams: [],
    });

    await expect(explain(createClient(settings), esClient, 'catalog-fall')).resolves.toEqual({
      boost_profile: '_on-demand',
      matches: [
        expect.objectContaining({ name: 'catalogs' }),
        expect.objectContaining({ name: '_default-indices' }),
      ],
    });
  });

  it('reports no profile for what no rule matches, such as a system index', async () => {
    const esClient = createEsClient();
    esClient.indices.resolveIndex.mockResolvedValue({
      indices: [{ name: '.kibana_1', attributes: ['open', 'hidden', 'system'] }],
      aliases: [],
      data_streams: [],
    });

    await expect(explain(createClient(settings), esClient, '.kibana_1')).resolves.toEqual({
      matches: [],
    });
  });
});

describe('rule conflicts', () => {
  const settings = { kind: 'settings', default_profiles: DEFAULT_RULE_PROFILES };
  const moreCatalogs = {
    name: 'more-catalogs',
    index_patterns: ['catalog-fall-*'],
    boost_profile: '_performant',
    priority: 1,
  };

  it('rejects a rule that would tie with another, as Elasticsearch does', async () => {
    const client = createClient(settings);

    const creating = createRule(client, moreCatalogs);
    await expect(creating).rejects.toThrow(BoostRequestError);
    await expect(creating).rejects.toThrow('conflicts with boost rule [catalogs]');
    expect(client.create).not.toHaveBeenCalled();
  });

  it('saves a rule that another priority keeps from tying', async () => {
    const client = createClient(settings);

    await createRule(client, { ...moreCatalogs, priority: 2 });
    expect(client.create).toHaveBeenCalled();
  });

  it("doesn't compare an updated rule with its saved version", async () => {
    const client = createClient(settings);

    await updateRule(client, 'catalogs', { ...catalogsRule, index_patterns: ['catalog-fall-*'] });
    expect(client.create).toHaveBeenCalled();
  });
});

describe('updateDefaultRule', () => {
  it("sets one type's project default, keeping the other's", async () => {
    const client = createClient({ kind: 'settings', default_profiles: DEFAULT_RULE_PROFILES });

    await updateDefaultRule(client, 'data_streams', '_last-3-days');

    expect(client.create).toHaveBeenCalledWith(
      'boost_prototype',
      {
        kind: 'settings',
        default_profiles: {
          indices_profile: '_performant',
          data_streams_profile: '_last-3-days',
        },
      },
      expect.objectContaining({ overwrite: true })
    );
  });
});
