/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  attackDiscoveryAdapter,
  automaticMigrationsAdapter,
  personaMatrixAdapter,
  collectExamples,
  selectAdapter,
  type DatasetExample,
} from './reference_adapters';

describe('reference adapters', () => {
  describe('persona-matrix', () => {
    const examples: DatasetExample[] = [
      { id: 'alert-analysis-a', output: { reference: 'Explain the alert.' } },
      { id: 'no-ref', output: {} },
    ];

    it('keys prose references by example id', () => {
      const refs = personaMatrixAdapter.build(examples);
      expect(refs.get('alert-analysis-a')).toBe('Explain the alert.');
    });

    it('omits examples without a reference rather than inventing one', () => {
      expect(personaMatrixAdapter.build(examples).has('no-ref')).toBe(false);
    });
  });

  describe('attack-discovery', () => {
    const examples: DatasetExample[] = [
      {
        output: {
          criteria: ['Insights mention encoded PowerShell.', 'Insights reference wks-alice-01.'],
          attackDiscoveries: [
            {
              title: 'Encoded PowerShell on wks-alice-01',
              summaryMarkdown: 'Office spawned encoded PowerShell.',
              mitreAttackTactics: ['Execution', 'Persistence'],
            },
          ],
        },
        metadata: { scenarioKey: 'encoded-powershell' },
      },
      { output: { criteria: ['Insights reference web-prod-07.'] } },
    ];

    // Golden records attack-discovery example.id positionally ('0', '1'), so a
    // scenarioKey-keyed reference would never join to a score document.
    it('joins positionally because the dataset carries no ids', () => {
      const refs = attackDiscoveryAdapter.build(examples);
      expect([...refs.keys()]).toEqual(['0', '1']);
    });

    it('renders every criterion into the reference text', () => {
      const ref = attackDiscoveryAdapter.build(examples).get('0')!;
      expect(ref).toContain('Insights mention encoded PowerShell.');
      expect(ref).toContain('Insights reference wks-alice-01.');
    });

    it('includes expected discovery detail and tactics', () => {
      const ref = attackDiscoveryAdapter.build(examples).get('0')!;
      expect(ref).toContain('Encoded PowerShell on wks-alice-01');
      expect(ref).toContain('Execution, Persistence');
    });

    // The header is what tells the judge criteria are conjunctive, not a menu.
    it('instructs the judge that all criteria must hold', () => {
      const ref = attackDiscoveryAdapter.build(examples).get('0')!;
      expect(ref).toContain('must satisfy all of the following');
    });

    it('drops examples with no ground truth at all', () => {
      const refs = attackDiscoveryAdapter.build([{ output: {} }]);
      expect(refs.size).toBe(0);
    });
  });

  describe('automatic-migrations', () => {
    const examples: DatasetExample[] = [
      {
        id: 'splunk-simple-001',
        output: {
          translation_result: 'full',
          esql_query: 'FROM logs | WHERE user == "root"',
          index_pattern: 'logs-*',
          has_lookup_join: false,
          is_unsupported: false,
        },
      },
      {
        id: 'qradar-unsupported-001',
        output: { translation_result: 'untranslatable', esql_query: null, is_unsupported: true },
      },
    ];

    it('joins by real example id', () => {
      const refs = automaticMigrationsAdapter.build(examples);
      expect([...refs.keys()]).toEqual(['splunk-simple-001', 'qradar-unsupported-001']);
    });

    it('states the expected translation outcome in words', () => {
      const ref = automaticMigrationsAdapter.build(examples).get('splunk-simple-001')!;
      expect(ref).toContain('fully translated');
      expect(ref).toContain('FROM logs | WHERE user == "root"');
    });

    // A null esql_query is an expectation ("none"), not a missing field.
    it('distinguishes an expected-absent query from an unchecked one', () => {
      const ref = automaticMigrationsAdapter.build(examples).get('qradar-unsupported-001')!;
      expect(ref).toContain('No ES|QL query is expected');
      expect(ref).toContain('unsupported pattern');
    });
  });

  describe('module collection and selection', () => {
    it('collects examples split across several exports', () => {
      const mod = {
        splunkRules: [{ id: 's1', output: { translation_result: 'full' } }],
        qradarRules: [{ id: 'q1', output: { translation_result: 'partial' } }],
      };
      expect(collectExamples(mod)).toHaveLength(2);
    });

    it('unwraps a dataset object exposing an examples array', () => {
      const mod = { dataset: { examples: [{ id: 'a', output: { reference: 'x' } }] } };
      expect(collectExamples(mod)).toHaveLength(1);
    });

    it('selects the adapter matching the example shape', () => {
      expect(selectAdapter([{ output: { criteria: ['x'] } }])?.name).toBe('attack-discovery');
      expect(selectAdapter([{ id: 'a', output: { translation_result: 'full' } }])?.name).toBe(
        'automatic-migrations'
      );
      expect(selectAdapter([{ id: 'a', output: { reference: 'x' } }])?.name).toBe('persona-matrix');
    });

    it('returns no adapter for an unrecognised suite shape', () => {
      expect(selectAdapter([{ id: 'a', output: { somethingElse: 1 } }])).toBeUndefined();
    });
  });
});
