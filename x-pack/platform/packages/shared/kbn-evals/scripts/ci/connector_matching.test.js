/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const {
  selectConnectorIds,
  connectorMatchesModelGroup,
  describeAvailableModels,
  parseModelGroups,
} = require('./connector_matching');

const CONNECTORS = {
  'eis-openai-gpt-5-4': { provider: 'elastic', providerConfig: { model_id: 'openai-gpt-5.4' } },
  'eis-anthropic-claude-4-6-sonnet': {
    provider: 'elastic',
    providerConfig: { model_id: 'anthropic-claude-4.6-sonnet' },
  },
  'openrouter-openai-gpt-5-4': {
    provider: 'openai',
    providerConfig: { model_id: 'openai/gpt-5.4' },
  },
};

describe('parseModelGroups', () => {
  it('splits, trims and drops empties', () => {
    expect(parseModelGroups(' eis/openai-gpt-5.4 , , openrouter/openai-gpt-5.4 ')).toEqual([
      'eis/openai-gpt-5.4',
      'openrouter/openai-gpt-5.4',
    ]);
  });

  it('returns an empty list for an empty value', () => {
    expect(parseModelGroups('')).toEqual([]);
    expect(parseModelGroups(undefined)).toEqual([]);
  });
});

describe('connectorMatchesModelGroup', () => {
  const eis = CONNECTORS['eis-openai-gpt-5-4'];
  const openrouter = CONNECTORS['openrouter-openai-gpt-5-4'];

  it('matches by connector id', () => {
    expect(connectorMatchesModelGroup('eis-openai-gpt-5-4', eis, 'eis-openai-gpt-5-4')).toBe(true);
  });

  it('matches an eis model by both the bare id and the eis/ prefix', () => {
    expect(connectorMatchesModelGroup('eis-openai-gpt-5-4', eis, 'openai-gpt-5.4')).toBe(true);
    expect(connectorMatchesModelGroup('eis-openai-gpt-5-4', eis, 'eis/openai-gpt-5.4')).toBe(true);
  });

  it('matches an openrouter/<provider>-<model> group to the slugified connector id', () => {
    expect(
      connectorMatchesModelGroup(
        'openrouter-openai-gpt-5-4',
        openrouter,
        'openrouter/openai-gpt-5.4'
      )
    ).toBe(true);
  });

  it('matches a native openrouter id against providerConfig.model_id', () => {
    expect(
      connectorMatchesModelGroup('openrouter-openai-gpt-5-4', openrouter, 'openai/gpt-5.4')
    ).toBe(true);
  });

  it('does not match an eis/ group against a non-EIS endpoint', () => {
    expect(
      connectorMatchesModelGroup('openrouter-openai-gpt-5-4', openrouter, 'eis/openai/gpt-5.4')
    ).toBe(false);
  });

  it('does not match an unrelated group', () => {
    expect(connectorMatchesModelGroup('eis-openai-gpt-5-4', eis, 'eis/openai-gpt-5.4-mini')).toBe(
      false
    );
  });
});

describe('selectConnectorIds', () => {
  it('returns every connector for an empty request or "all"', () => {
    expect(selectConnectorIds(CONNECTORS, [])).toEqual(Object.keys(CONNECTORS));
    expect(selectConnectorIds(CONNECTORS, ['all'])).toEqual(Object.keys(CONNECTORS));
  });

  it('returns only the connectors matching the requested groups', () => {
    expect(selectConnectorIds(CONNECTORS, ['eis/openai-gpt-5.4'])).toEqual(['eis-openai-gpt-5-4']);
    expect(
      selectConnectorIds(CONNECTORS, ['eis/openai-gpt-5.4', 'eis/anthropic-claude-4.6-sonnet'])
    ).toEqual(['eis-openai-gpt-5-4', 'eis-anthropic-claude-4-6-sonnet']);
  });

  it('returns nothing when no connector matches', () => {
    expect(selectConnectorIds(CONNECTORS, ['eis/does-not-exist'])).toEqual([]);
  });
});

describe('describeAvailableModels', () => {
  it('lists eis models with the eis/ prefix and other endpoint model ids as-is', () => {
    expect(describeAvailableModels(CONNECTORS)).toEqual([
      'eis/openai-gpt-5.4',
      'eis/anthropic-claude-4.6-sonnet',
      'openai/gpt-5.4',
    ]);
  });
});
