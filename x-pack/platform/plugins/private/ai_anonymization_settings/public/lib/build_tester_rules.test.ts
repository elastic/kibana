/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegexAnonymizationRule } from '@kbn/ai-anonymization-common';
import { buildTesterRules } from './build_tester_rules';

const rule = (id: string, pattern = id): RegexAnonymizationRule => ({
  type: 'RegExp',
  id,
  name: id,
  entityClass: 'MISC',
  pattern,
  enabled: true,
  builtIn: false,
});

describe('buildTesterRules', () => {
  const builtInHost = rule('builtin-host-name');
  const existingCustom = rule('custom-1');

  it('puts a new rule after the existing ones, because that is where it will be saved', () => {
    const draft = rule('draft');

    // A new custom rule that overlaps the built-in host rule must lose to it in the preview,
    // exactly as it will once saved, so it cannot be first.
    expect(buildTesterRules(draft, [builtInHost, existingCustom]).map(({ id }) => id)).toEqual([
      'builtin-host-name',
      'custom-1',
      'draft',
    ]);
  });

  it('keeps an edited rule at its saved position, using the edited definition', () => {
    const edited = rule('custom-1', 'edited-pattern');

    const result = buildTesterRules(edited, [builtInHost, existingCustom, rule('custom-2')]);

    expect(result.map(({ id }) => id)).toEqual(['builtin-host-name', 'custom-1', 'custom-2']);
    expect(result[1].pattern).toBe('edited-pattern');
  });

  it('appends an edited rule that is currently disabled, since only enabled rules are listed', () => {
    const edited = rule('custom-disabled');

    expect(buildTesterRules(edited, [builtInHost]).map(({ id }) => id)).toEqual([
      'builtin-host-name',
      'custom-disabled',
    ]);
  });
});
