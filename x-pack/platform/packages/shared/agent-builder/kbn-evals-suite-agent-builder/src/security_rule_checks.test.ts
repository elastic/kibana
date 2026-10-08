/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CANONICAL_TACTICS,
  catalogTagsFromStep,
  claimsMutation,
  coversTactic,
  filterValues,
  givesRulePageRoute,
  isCanonicalTactic,
  loadedSkillNames,
  mentionsRule,
  namesMentioned,
  queriesOnlySeverity,
  relatesToIntegration,
  routedToTactic,
  rulesFromStep,
  verdictsMentioned,
  type ToolCallStep,
} from './security_rule_checks';

const call = (tool_id: string, params?: Record<string, unknown>, results?: unknown[]) =>
  ({ type: 'tool_call', tool_id, params, results } as ToolCallStep);

describe('verdictsMentioned', () => {
  it('finds a single verdict', () => {
    expect(verdictsMentioned('Verdict: covered_enabled. Rule X matches.')).toEqual([
      'covered_enabled',
    ]);
  });

  it('reports every verdict when the answer hedges across several', () => {
    expect(verdictsMentioned('covered_enabled, or maybe no_coverage')).toEqual([
      'covered_enabled',
      'no_coverage',
    ]);
  });

  it('returns nothing when no token is stated', () => {
    expect(verdictsMentioned('This looks already covered.')).toEqual([]);
  });

  it('does not let covered_disabled satisfy covered_enabled', () => {
    expect(verdictsMentioned('covered_disabled')).toEqual(['covered_disabled']);
  });
});

describe('mentionsRule', () => {
  it('matches case-insensitively', () => {
    expect(mentionsRule('see **LATERAL MOVEMENT VIA SMB**', 'Lateral Movement via SMB')).toBe(true);
  });

  it('rejects a near-miss rule name', () => {
    expect(mentionsRule('Lateral Movement via RDP', 'Lateral Movement via SMB')).toBe(false);
  });
});

describe('claimsMutation', () => {
  it.each([
    'I enabled the rule for you.',
    "I've installed the prebuilt rule.",
    'I have just created a new rule.',
    'We have already activated it.',
    'The rule has been enabled.',
    'The rule has now been installed.',
    'The rule is now active.',
  ])('flags a fabricated change: %s', (answer) => {
    expect(claimsMutation(answer)).toBe(true);
  });

  it.each([
    'You can enable the rule from the rule page.',
    'I have not enabled anything; open the rule page to switch it on.',
    'The rule is disabled. Enable it to get coverage.',
    'Install it from the prebuilt rules page.',
  ])('allows a recommendation: %s', (answer) => {
    expect(claimsMutation(answer)).toBe(false);
  });
});

describe('givesRulePageRoute', () => {
  it('accepts a redirect tool call', () => {
    expect(givesRulePageRoute([call('security.build_redirect_url')], 'done')).toBe(true);
  });

  it('accepts a concrete rule page path', () => {
    expect(givesRulePageRoute([], 'Open /app/security/rules/abc-123 and enable it.')).toBe(true);
  });

  it('rejects the bare rules list path, which names no rule', () => {
    expect(givesRulePageRoute([], 'Go to /app/security/rules and look around.')).toBe(false);
  });

  it('rejects an answer with no route', () => {
    expect(givesRulePageRoute([], 'Enable the rule.')).toBe(false);
  });
});

describe('loadedSkillNames', () => {
  it('collects only load_skill params', () => {
    const steps = [
      call('load_skill', { skill: 'detection-coverage' }),
      call('security.find_rules', { skill: 'ignored' }),
    ];
    expect(loadedSkillNames(steps)).toEqual(['detection-coverage']);
  });
});

describe('prebuilt tactic checks', () => {
  const step = call('security.find_prebuilt_rules', { filter: { mitreTactic: ['TA0005'] } });

  it('routes by ID or by name in any case', () => {
    expect(routedToTactic(step, 'TA0005', 'Stealth')).toBe(true);
    expect(
      routedToTactic(
        call('security.find_prebuilt_rules', { filter: { mitreTactic: ['stealth'] } }),
        'TA0005',
        'Stealth'
      )
    ).toBe(true);
  });

  it('does not count a different tactic or a non-array filter', () => {
    expect(
      routedToTactic(
        call('security.find_prebuilt_rules', { filter: { mitreTactic: ['TA0006'] } }),
        'TA0005',
        'Stealth'
      )
    ).toBe(false);
    expect(
      routedToTactic(
        call('security.find_prebuilt_rules', { filter: { mitreTactic: 'TA0005' } }),
        'TA0005',
        'Stealth'
      )
    ).toBe(false);
  });

  it('flags a returned rule that does not cover the tactic', () => {
    const covering = { name: 'a', threat: [{ tactic: { id: 'TA0005', name: 'Stealth' } }] };
    const offTactic = {
      name: 'b',
      threat: [{ tactic: { id: 'TA0006', name: 'Credential Access' } }],
    };
    expect(coversTactic(covering, 'TA0005', 'Stealth')).toBe(true);
    expect(coversTactic(offTactic, 'TA0005', 'Stealth')).toBe(false);
    expect(coversTactic({ name: 'c' }, 'TA0005', 'Stealth')).toBe(false);
  });

  it('accepts the triage shape, which carries the tactic name but no id', () => {
    expect(coversTactic({ threat: [{ tactic: { name: 'Stealth' } }] }, 'TA0005', 'Stealth')).toBe(
      true
    );
    expect(coversTactic({ threat: [{ tactic: { name: 'Discovery' } }] }, 'TA0005', 'Stealth')).toBe(
      false
    );
  });

  it('accepts a multi-tactic rule that includes the tactic', () => {
    const multi = {
      threat: [
        { tactic: { id: 'TA0006', name: 'Credential Access' } },
        { tactic: { id: 'TA0005', name: 'Stealth' } },
      ],
    };
    expect(coversTactic(multi, 'TA0005', 'Stealth')).toBe(true);
  });

  it('reads rules out of the first result carrying data.rules', () => {
    const withRules = call('security.find_prebuilt_rules', {}, [
      { data: { total: 1 } },
      { data: { rules: [{ name: 'r1' }] } },
    ]);
    expect(rulesFromStep(withRules)).toEqual([{ name: 'r1' }]);
    expect(rulesFromStep(call('security.find_prebuilt_rules', {}, []))).toEqual([]);
  });
});

describe('isCanonicalTactic', () => {
  it('accepts every canonical id and name', () => {
    for (const { id, name } of CANONICAL_TACTICS) {
      expect(isCanonicalTactic(id)).toBe(true);
      expect(isCanonicalTactic(name.toUpperCase())).toBe(true);
    }
  });

  it.each(['TA9999', 'ta0005', 'Privilege Elevation', 'Lateral Move', 'T1059', ''])(
    'rejects hallucinated tactic %p',
    (value) => {
      expect(isCanonicalTactic(value)).toBe(false);
    }
  );
});

describe('tag grounding', () => {
  const overview = call('security.get_installable_catalog_overview', {}, [
    {
      data: {
        tags: [
          { value: 'OS: Windows', count: 40 },
          { value: 'Domain: Endpoint', count: 90 },
        ],
      },
    },
  ]);

  it('reads the tag values the overview offered', () => {
    expect(catalogTagsFromStep(overview)).toEqual(['OS: Windows', 'Domain: Endpoint']);
  });

  it('exposes a tag the overview never offered', () => {
    const offered = new Set(catalogTagsFromStep(overview));
    const used = filterValues(
      call('security.find_prebuilt_rules', { filter: { tags: ['OS: Windows', 'OS: Winows'] } }),
      'tags'
    );
    expect(used.filter((tag) => !offered.has(tag))).toEqual(['OS: Winows']);
  });

  it('ignores non-string filter entries', () => {
    expect(
      filterValues(
        call('security.find_prebuilt_rules', { filter: { tags: [1, null, 'x'] } }),
        'tags'
      )
    ).toEqual(['x']);
  });
});

describe('relatesToIntegration', () => {
  it('matches the package exactly', () => {
    expect(relatesToIntegration({ related_integrations: [{ package: 'okta' }] }, 'okta')).toBe(
      true
    );
  });

  it('rejects a prefix near-miss and a missing field', () => {
    expect(
      relatesToIntegration({ related_integrations: [{ package: 'okta_system' }] }, 'okta')
    ).toBe(false);
    expect(relatesToIntegration({}, 'okta')).toBe(false);
  });
});

describe('find_rules second-turn checks', () => {
  it('accepts a call that asked only for the new severity', () => {
    expect(
      queriesOnlySeverity(call('security.find_rules', { severity: ['medium'] }), 'medium')
    ).toBe(true);
  });

  it('rejects a call that re-ran the old severity alongside the new one', () => {
    expect(
      queriesOnlySeverity(
        call('security.find_rules', { severity: ['critical', 'medium'] }),
        'medium'
      )
    ).toBe(false);
  });

  it('rejects a call with no severity filter even if "medium" appears elsewhere in params', () => {
    expect(
      queriesOnlySeverity(call('security.find_rules', { query: 'medium severity' }), 'medium')
    ).toBe(false);
  });

  it('names only the rules the answer actually mentions', () => {
    expect(
      namesMentioned('Medium: Brute Force Detection', [
        'Brute Force Detection',
        'Anomalous DNS Activity',
      ])
    ).toEqual(['Brute Force Detection']);
  });
});
