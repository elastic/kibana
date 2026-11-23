/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiagnosticResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import type { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { BoostProfile, BoostRule } from '../../common/types';
import type { BoostTarget } from './local_explain';
import { explainTargets, getBoostTargets } from './local_explain';

const PROFILES: BoostProfile[] = [
  {
    name: 'fast',
    type: 'indices',
    is_builtin: false,
    min_boost: 1,
    max_boost: 5,
    availability: 'base',
    prewarm: false,
    pinned: false,
  },
  {
    name: 'recent',
    type: 'data_streams',
    is_builtin: false,
    recent: { min_boost: 1, max_boost: 5, max_age: '1d' },
    standard: { min_boost: 1, max_boost: 2, max_age: '7d' },
    background: { min_boost: 1, max_boost: 1 },
  },
];

const rule = (
  name: string,
  indexPattern: string,
  priority = 0,
  boostProfile = 'fast'
): BoostRule => ({
  name,
  index_pattern: indexPattern,
  boost_profile: boostProfile,
  priority,
  is_builtin: false,
});

const index = (name: string, isHidden = false): BoostTarget => ({
  name,
  type: 'indices',
  isHidden,
});

/** The names of the rules that match each target, highest ranked first. */
const getMatchedRuleNames = (rules: BoostRule[], targets: BoostTarget[]) =>
  explainTargets(rules, PROFILES, targets).map(({ name, matchedRuleNames }) => [
    name,
    matchedRuleNames,
  ]);

const dataStream = (
  name: string,
  { hidden = false, system = false }: Partial<Pick<IndicesDataStream, 'hidden' | 'system'>> = {}
): IndicesDataStream => ({
  name,
  hidden,
  system,
  timestamp_field: { name: '@timestamp' },
  indices: [{ index_name: `.ds-${name}-1`, index_uuid: `${name}-uuid` }],
  generation: 1,
  status: 'green',
  template: name,
  settings: {},
  next_generation_managed_by: 'Data stream lifecycle',
  prefer_ilm: false,
  rollover_on_write: false,
});

const createClient = () => {
  const client = elasticsearchServiceMock.createScopedClusterClient();
  client.asCurrentUser.indices.resolveIndex.mockResolvedValue({
    indices: [
      { name: 'products', attributes: ['open'] },
      { name: '.hidden-index', attributes: ['hidden', 'open'] },
      { name: '.system-index', attributes: ['hidden', 'open', 'system'] },
      { name: '.ds-logs-1', attributes: ['hidden', 'open'], data_stream: 'logs' },
      { name: '.ds-system-1', attributes: ['hidden', 'open', 'system'], data_stream: 'system' },
    ],
    aliases: [],
    data_streams: [],
  });
  client.asCurrentUser.indices.getDataStream.mockResolvedValue({
    data_streams: [
      dataStream('logs'),
      dataStream('.hidden-logs', { hidden: true }),
      dataStream('system', { hidden: true, system: true }),
    ],
  });
  return client;
};

const forbidden = () =>
  new errors.ResponseError({
    statusCode: 403,
    body: { error: { type: 'security_exception' } },
    headers: {},
    warnings: [],
    meta: {} as DiagnosticResult['meta'],
  });

describe('getBoostTargets', () => {
  it('lists regular indices and data streams, without backing or system ones', async () => {
    const client = createClient();

    expect(await getBoostTargets(client)).toEqual([
      { name: 'products', type: 'indices', isHidden: false },
      { name: '.hidden-index', type: 'indices', isHidden: true },
      { name: 'logs', type: 'data_streams', isHidden: false },
      { name: '.hidden-logs', type: 'data_streams', isHidden: true },
    ]);
    expect(client.asCurrentUser.indices.resolveIndex).toHaveBeenCalledWith({
      name: '*',
      expand_wildcards: ['open', 'hidden'],
    });
    expect(client.asCurrentUser.indices.getDataStream).toHaveBeenCalledWith({
      name: '*',
      expand_wildcards: ['open', 'hidden'],
    });
  });

  it('lists nothing to a user without index privileges', async () => {
    const client = createClient();
    client.asCurrentUser.indices.resolveIndex.mockRejectedValue(forbidden());
    client.asCurrentUser.indices.getDataStream.mockRejectedValue(forbidden());

    expect(await getBoostTargets(client)).toEqual([]);
  });

  it('keeps the indices when only the data streams lookup is forbidden', async () => {
    const client = createClient();
    client.asCurrentUser.indices.getDataStream.mockRejectedValue(forbidden());

    expect(await getBoostTargets(client)).toEqual([
      { name: 'products', type: 'indices', isHidden: false },
      { name: '.hidden-index', type: 'indices', isHidden: true },
    ]);
  });

  it('fails on other errors', async () => {
    const client = createClient();
    client.asCurrentUser.indices.resolveIndex.mockRejectedValue(new Error('Unavailable'));

    await expect(getBoostTargets(client)).rejects.toThrow('Unavailable');
  });
});

describe('explainTargets', () => {
  it('keeps the type and whether the target is hidden', () => {
    expect(explainTargets([], PROFILES, [index('.hidden', true)])).toEqual([
      { name: '.hidden', type: 'indices', isHidden: true, matchedRuleNames: [] },
    ]);
  });

  it('matches names with each `*` standing for any characters', () => {
    expect(
      getMatchedRuleNames(
        [rule('products', 'prod*-v*')],
        [index('products-v2'), index('prod-v'), index('dev-v1')]
      )
    ).toEqual([
      ['products-v2', ['products']],
      ['prod-v', ['products']],
      ['dev-v1', []],
    ]);
  });

  it('needs the parts between each `*` in order, without overlapping', () => {
    expect(
      getMatchedRuleNames(
        [rule('parts', 'ab*bc*cd'), rule('ends', 'a*a'), rule('repeated', 'logs**')],
        [
          index('ab-bc-cd'),
          index('abbccd'),
          index('abcd'),
          index('ab-cd-bc'),
          index('a'),
          index('aa'),
          index('logs-1'),
        ]
      )
    ).toEqual([
      ['ab-bc-cd', ['parts']],
      ['abbccd', ['parts']],
      ['abcd', []],
      ['ab-cd-bc', []],
      ['a', []],
      ['aa', ['ends']],
      ['logs-1', ['repeated']],
    ]);
  });

  it('matches a pattern with many `*` against a long name without backtracking', () => {
    const longName = 'a'.repeat(255);

    expect(getMatchedRuleNames([rule('many', `${'*a'.repeat(8)}*b`)], [index(longName)])).toEqual([
      [longName, []],
    ]);
    expect(getMatchedRuleNames([rule('many', `${'*a'.repeat(8)}*`)], [index(longName)])).toEqual([
      [longName, ['many']],
    ]);
  });

  it('reads characters other than `*` literally', () => {
    expect(getMatchedRuleNames([rule('dotted', 'a.c')], [index('a.c'), index('abc')])).toEqual([
      ['a.c', ['dotted']],
      ['abc', []],
    ]);
  });

  it('only matches rules whose profile is of the target type', () => {
    expect(
      getMatchedRuleNames(
        [rule('indices', '*'), rule('dataStreams', '*', 0, 'recent')],
        [index('logs'), { name: 'logs', type: 'data_streams', isHidden: false }]
      )
    ).toEqual([
      ['logs', ['indices']],
      ['logs', ['dataStreams']],
    ]);
  });

  it('ranks the rule with the higher priority first', () => {
    expect(
      getMatchedRuleNames([rule('exact', 'logs', 1), rule('wildcard', 'lo*', 2)], [index('logs')])
    ).toEqual([['logs', ['wildcard', 'exact']]]);
  });

  it('ranks an exact name over a wildcard, and a wildcard over `*`, at the same priority', () => {
    expect(
      getMatchedRuleNames(
        [rule('matchAll', '*'), rule('wildcard', 'lo*'), rule('exact', 'logs')],
        [index('logs'), index('lost')]
      )
    ).toEqual([
      ['logs', ['exact', 'wildcard', 'matchAll']],
      ['lost', ['wildcard', 'matchAll']],
    ]);
  });

  it('leaves out rules whose profile is unknown', () => {
    expect(getMatchedRuleNames([rule('orphan', '*', 0, 'missing')], [index('logs')])).toEqual([
      ['logs', []],
    ]);
  });
});
