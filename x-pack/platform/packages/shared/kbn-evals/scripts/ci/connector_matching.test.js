/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const {
  addReasoningEffortVariants,
  connectorMatchesModelGroup,
  describeAvailableModels,
  parseModelGroup,
  parseModelGroups,
  selectConnectorIds,
  splitReasoningEffortVariantId,
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

describe('parseModelGroup', () => {
  it('splits a trailing @<level> off the group', () => {
    expect(parseModelGroup('eis/openai-gpt-5.4@high')).toEqual({
      base: 'eis/openai-gpt-5.4',
      reasoningEffort: 'high',
    });
  });

  it('leaves a group without @ unchanged', () => {
    expect(parseModelGroup('openrouter/openai-gpt-5.4')).toEqual({
      base: 'openrouter/openai-gpt-5.4',
      reasoningEffort: undefined,
    });
  });

  it('rejects an unknown level rather than matching nothing', () => {
    expect(() => parseModelGroup('eis/openai-gpt-5.4@max')).toThrow(
      'Unknown reasoning effort "max" in model group "eis/openai-gpt-5.4@max"'
    );
  });
});

describe('splitReasoningEffortVariantId', () => {
  it('splits a variant id into its base and level', () => {
    expect(splitReasoningEffortVariantId('eis-openai-gpt-5-4-effort-high')).toEqual({
      baseId: 'eis-openai-gpt-5-4',
      reasoningEffort: 'high',
    });
  });

  it('leaves a plain id alone', () => {
    expect(splitReasoningEffortVariantId('eis-openai-gpt-5-4')).toEqual({
      baseId: 'eis-openai-gpt-5-4',
      reasoningEffort: undefined,
    });
  });
});

describe('reasoning effort variants', () => {
  const withVariants = addReasoningEffortVariants(CONNECTORS, [
    'eis/openai-gpt-5.4@low',
    'eis/openai-gpt-5.4@high',
    'openrouter/openai-gpt-5.4@low',
    'eis/anthropic-claude-4.6-sonnet',
  ]);

  it('adds one variant per <group>@<level>, copying the base and tagging the effort', () => {
    expect(Object.keys(withVariants)).toEqual([
      ...Object.keys(CONNECTORS),
      'eis-openai-gpt-5-4-effort-low',
      'eis-openai-gpt-5-4-effort-high',
      'openrouter-openai-gpt-5-4-effort-low',
    ]);
    expect(withVariants['eis-openai-gpt-5-4-effort-high']).toEqual({
      ...CONNECTORS['eis-openai-gpt-5-4'],
      name: 'eis-openai-gpt-5-4 (high)',
      reasoningEffort: 'high',
    });
  });

  it('keeps an already-present variant and never derives a variant from another variant', () => {
    const again = addReasoningEffortVariants(withVariants, ['eis/openai-gpt-5.4@high']);
    expect(again).toEqual(withVariants);
  });

  it('matches <group>@<level> only to the variant at that level', () => {
    expect(selectConnectorIds(withVariants, ['eis/openai-gpt-5.4@high'])).toEqual([
      'eis-openai-gpt-5-4-effort-high',
    ]);
    expect(selectConnectorIds(withVariants, ['openrouter/openai-gpt-5.4@low'])).toEqual([
      'openrouter-openai-gpt-5-4-effort-low',
    ]);
  });

  it('keeps a bare group matching only the definition without an effort', () => {
    expect(selectConnectorIds(withVariants, ['eis/openai-gpt-5.4'])).toEqual([
      'eis-openai-gpt-5-4',
    ]);
    expect(
      connectorMatchesModelGroup(
        'eis-openai-gpt-5-4-effort-high',
        withVariants['eis-openai-gpt-5-4-effort-high'],
        'eis/openai-gpt-5.4'
      )
    ).toBe(false);
  });

  it('describes variants with their level', () => {
    expect(describeAvailableModels(withVariants)).toEqual([
      'eis/openai-gpt-5.4',
      'eis/anthropic-claude-4.6-sonnet',
      'openai/gpt-5.4',
      'eis/openai-gpt-5.4@low',
      'eis/openai-gpt-5.4@high',
      'openai/gpt-5.4@low',
    ]);
  });
});
