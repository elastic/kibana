/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { writeFragmentValue } from './fragment_yaml';
import type { StepFormField } from './step_form_schema';
import {
  appendTrigger,
  collectStepNamesFromYaml,
  countTriggers,
  deleteStepByName,
  deleteTrigger,
  getStepFragment,
  getStepSourceRange,
  getTriggerFragment,
  insertStepAfterName,
  insertStepIntoBranch,
  prependStep,
  replaceStepFragment,
  replaceTriggerFragment,
  setStepFallback,
  uniqueStepName,
} from './yaml_mutations';
import type { MutationError, MutationResult } from './yaml_mutations';

const BASE = `name: demo
# top comment
triggers:
  - type: manual
steps:
  - name: first
    type: console
    with:
      message: "hello {{ inputs.name }}" # keep me
  - name: second
    type: http
    with:
      url: https://example.com
`;

const failureOf = (result: MutationResult): MutationError => {
  if (result.success) throw new Error('expected the mutation to fail');
  return result.error;
};

describe('yaml_mutations', () => {
  describe('appendTrigger / deleteTrigger', () => {
    it('appends to triggers and removes by index', () => {
      const added = appendTrigger(BASE, 'type: scheduled\nwith:\n  every: 5m\n');
      expect(parse(added.yaml).triggers).toEqual([
        { type: 'manual' },
        { type: 'scheduled', with: { every: '5m' } },
      ]);
      const removed = deleteTrigger(added.yaml, 0);
      expect(parse(removed.yaml).triggers).toEqual([{ type: 'scheduled', with: { every: '5m' } }]);
    });

    it('counts the triggers a workflow declares', () => {
      const added = appendTrigger(BASE, 'type: scheduled\nwith:\n  every: 5m\n');

      expect(countTriggers(BASE)).toBe(1);
      expect(countTriggers(added.yaml)).toBe(2);
      expect(countTriggers(deleteTrigger(BASE, 0).yaml)).toBe(0);
    });

    it('drops the triggers key when the last trigger is removed', () => {
      const r = deleteTrigger(BASE, 0);
      expect(parse(r.yaml).triggers).toBeUndefined();
    });

    it('extracts and replaces a trigger fragment by index', () => {
      const fragment = getTriggerFragment(BASE, 0);
      expect(fragment).toContain('type: manual');
      const replaced = replaceTriggerFragment(
        BASE,
        0,
        'type: manual\ninputs:\n  - name: env\n    type: string\n'
      );
      expect(replaced.success).toBe(true);
      expect(parse(replaced.yaml).triggers[0]).toEqual({
        type: 'manual',
        inputs: [{ name: 'env', type: 'string' }],
      });
    });
  });

  describe('setStepFallback', () => {
    it('adds on-failure.fallback and keeps sibling on-failure keys', () => {
      const withRetry = BASE.replace(
        '  - name: second\n    type: http\n',
        '  - name: second\n    type: http\n    on-failure:\n      retry:\n        max-attempts: 3\n'
      );
      const r = setStepFallback(withRetry, 'second', 'name: notify\ntype: console\n');
      expect(r.success).toBe(true);
      const second = parse(r.yaml).steps[1];
      expect(second['on-failure']).toEqual({
        retry: { 'max-attempts': 3 },
        fallback: [{ name: 'notify', type: 'console' }],
      });
    });
  });

  describe('deleteStepByName', () => {
    it('removes a top-level step including its error branch', () => {
      const withFallback = setStepFallback(BASE, 'first', 'name: notify\ntype: console\n').yaml;
      const r = deleteStepByName(withFallback, 'first');
      const names = collectStepNamesFromYaml(r.yaml);
      expect([...names]).toEqual(['second']);
    });

    it('removing the only fallback step clears the parent on-failure', () => {
      const withFallback = setStepFallback(BASE, 'first', 'name: notify\ntype: console\n').yaml;
      const r = deleteStepByName(withFallback, 'notify');
      expect(parse(r.yaml).steps[0]['on-failure']).toBeUndefined();
      expect(parse(r.yaml).steps[0].name).toBe('first');
    });

    it('keeps retry config when only the fallback list is emptied', () => {
      const withRetry = BASE.replace(
        '  - name: second\n    type: http\n',
        '  - name: second\n    type: http\n    on-failure:\n      retry:\n        max-attempts: 3\n'
      );
      const withFallback = setStepFallback(
        withRetry,
        'second',
        'name: notify\ntype: console\n'
      ).yaml;
      const r = deleteStepByName(withFallback, 'notify');
      expect(parse(r.yaml).steps[1]['on-failure']).toEqual({ retry: { 'max-attempts': 3 } });
    });
  });

  describe('getStepFragment / replaceStepFragment round-trip', () => {
    it('extracts a mapping fragment with its comments and puts it back verbatim', () => {
      const fragment = getStepFragment(BASE, 'first');
      expect(fragment).toContain('name: first');
      expect(fragment).toContain('# keep me');
      expect(fragment).not.toContain('- name');

      const edited = `${fragment}retry:\n  max-attempts: 2\n`;
      const r = replaceStepFragment(BASE, 'first', edited);
      expect(r.success).toBe(true);
      expect(r.yaml).toContain('# keep me');
      expect(r.yaml).toContain('# top comment');
      expect(parse(r.yaml).steps[0]).toEqual({
        name: 'first',
        type: 'console',
        with: { message: 'hello {{ inputs.name }}' },
        retry: { 'max-attempts': 2 },
      });
      expect(parse(r.yaml).steps[1].name).toBe('second');
    });

    it('preserves unknown keys and Liquid expressions in the fragment', () => {
      const fragment =
        'name: first\ntype: console\nx-custom: 1 # unknown\nwith:\n  message: "{{ a | json }}"\n';
      const r = replaceStepFragment(BASE, 'first', fragment);
      expect(r.yaml).toContain('x-custom: 1 # unknown');
      expect(r.yaml).toContain('"{{ a | json }}"');
    });
  });

  describe('getStepSourceRange', () => {
    it('returns the range of a top-level step, slicing to its own text', () => {
      const range = getStepSourceRange(BASE, 'first');
      expect(range).toBeDefined();
      const [start, end] = range!;
      expect(BASE.slice(start, end)).toBe(
        'name: first\n    type: console\n    with:\n      message: "hello {{ inputs.name }}" # keep me\n'
      );
    });

    it('returns the range of the last step, up to end of document', () => {
      const range = getStepSourceRange(BASE, 'second');
      expect(range).toBeDefined();
      const [start, end] = range!;
      expect(BASE.slice(start, end)).toBe(
        'name: second\n    type: http\n    with:\n      url: https://example.com\n'
      );
      expect(BASE.slice(end)).toBe('');
    });

    it('returns the range of a step nested in an if branch', () => {
      const withIf = `name: demo
steps:
  - name: gate
    type: if
    condition: x
    steps:
      - name: yes
        type: console
    else:
      - name: no
        type: console
`;
      const range = getStepSourceRange(withIf, 'yes');
      expect(range).toBeDefined();
      const [start, end] = range!;
      expect(withIf.slice(start, end)).toBe('name: yes\n        type: console\n');
    });

    it('returns the range of a fallback step under on-failure', () => {
      const withFallback = `name: demo
steps:
  - name: first
    type: console
    on-failure:
      fallback:
        - name: recover
          type: console
`;
      const range = getStepSourceRange(withFallback, 'recover');
      expect(range).toBeDefined();
      const [start, end] = range!;
      expect(withFallback.slice(start, end)).toBe('name: recover\n          type: console\n');
    });

    it('returns undefined for a step that does not exist', () => {
      expect(getStepSourceRange(BASE, 'missing')).toBeUndefined();
    });
  });

  describe('uniqueStepName', () => {
    it('suffixes on collision', () => {
      expect(uniqueStepName('a', new Set(['a', 'a_2']))).toBe('a_3');
      expect(uniqueStepName('b', new Set(['a']))).toBe('b');
    });
  });

  describe('block style for freshly-populated sequences', () => {
    // A new workflow starts with `triggers: []` / `steps: []` — the `yaml`
    // library remembers these were written inline and keeps them on one line
    // even after splicing in real content, unless the mutation resets the
    // style. Regression for an unreadable single-line `triggers`/`steps`.
    const freshWorkflow = `name: demo
enabled: false
triggers: []
steps: []
`;

    it('appendTrigger renders the triggers array in block style', () => {
      const r = appendTrigger(freshWorkflow, 'type: manual\n');
      expect(r.success).toBe(true);
      expect(r.yaml).not.toMatch(/triggers: \[/);
      expect(r.yaml).toMatch(/triggers:\n\s+- type: manual/);
    });

    it('prependStep renders the steps array in block style', () => {
      const r = prependStep(freshWorkflow, 'name: first\ntype: console\n');
      expect(r.success).toBe(true);
      expect(r.yaml).not.toMatch(/steps: \[/);
      expect(r.yaml).toMatch(/steps:\n\s+- name: first/);
    });

    it('a second insert into an already-populated (previously inline) array stays block style', () => {
      const once = appendTrigger(freshWorkflow, 'type: manual\n').yaml;
      const twice = appendTrigger(once, 'type: scheduled\nwith:\n  every: 5m\n');
      expect(twice.success).toBe(true);
      expect(twice.yaml).not.toMatch(/triggers: \[/);
      expect(parse(twice.yaml).triggers).toEqual([
        { type: 'manual' },
        { type: 'scheduled', with: { every: '5m' } },
      ]);
    });

    it('insertStepIntoBranch renders a freshly-created branch array in block style', () => {
      const withEmptyElse = `name: demo
steps:
  - name: gate
    type: if
    condition: x
    steps:
      - name: yes
        type: console
    else: []
`;
      const r = insertStepIntoBranch(withEmptyElse, 'name: no\ntype: console\n', 'gate', {
        kind: 'else',
      });
      expect(r.success).toBe(true);
      expect(r.yaml).not.toMatch(/else: \[/);
      expect(r.yaml).toMatch(/else:\n\s+- name: no/);
    });
  });

  describe('a switch whose first case is added through the form', () => {
    const workflow = `name: demo
triggers:
  - type: manual
steps:
  - name: route
    type: switch
    expression: x
    cases: []
`;
    const casesField: StepFormField = {
      key: 'cases',
      path: ['cases'],
      label: 'cases',
      required: false,
      kind: 'switch-cases',
    };
    const multiLineStep = [
      'name: report',
      'type: data.set',
      'with:',
      '  text: |-',
      '    line one',
      '    **Evidence:** {{ x }}',
      '    done',
      '',
    ].join('\n');

    it('keeps the cases and the steps inserted under them in block style, so multi-line text stays a block scalar', () => {
      const fragment = getStepFragment(workflow, 'route') ?? '';
      const edited = replaceStepFragment(
        workflow,
        'route',
        writeFragmentValue(fragment, casesField, [{ match: 'a', steps: [] }], 2)
      );
      expect(edited.success).toBe(true);

      const inserted = insertStepIntoBranch(edited.yaml, multiLineStep, 'route', {
        kind: 'case',
        index: 0,
        match: 'a',
      });

      expect(inserted.success).toBe(true);
      expect(inserted.yaml).not.toMatch(/cases: \[/);
      expect(inserted.yaml).toContain('text: |-\n');
      // No multi-line double-quoted scalar: the form `**Evidence:**` line must stay content.
      expect(inserted.yaml).not.toMatch(/text: "line one/);
      expect(parse(inserted.yaml).steps[0].cases[0].steps[0].with.text).toBe(
        'line one\n**Evidence:** {{ x }}\ndone'
      );
    });
  });

  describe('steps under switch cases, default and parallel branches', () => {
    const branching = `name: demo
triggers:
  - type: manual
steps:
  - name: route
    type: switch
    expression: x
    cases:
      - match: a
        steps: []
    default: []
  - name: fan_out
    type: parallel
    branches:
      - name: left
        steps: []
`;
    const child = 'name: child\ntype: console\n';
    const withMessage = 'name: child\ntype: console\nwith:\n  message: hi\n';
    const slots = [
      {
        label: 'default',
        owner: 'route',
        slot: { kind: 'default' } as const,
        path: ['steps', 0, 'default', 0],
      },
      {
        label: 'case',
        owner: 'route',
        slot: { kind: 'case', index: 0, match: 'a' } as const,
        path: ['steps', 0, 'cases', 0, 'steps', 0],
      },
      {
        label: 'branch',
        owner: 'fan_out',
        slot: { kind: 'branch', index: 0 } as const,
        path: ['steps', 1, 'branches', 0, 'steps', 0],
      },
    ];
    const getAt = (value: unknown, path: ReadonlyArray<string | number>): any =>
      path.reduce<any>((acc, key) => acc?.[key], value);

    it.each(slots)('replaceStepFragment edits a step inserted into the $label slot', (s) => {
      const inserted = insertStepIntoBranch(branching, child, s.owner, s.slot).yaml;
      const r = replaceStepFragment(inserted, 'child', withMessage);
      expect(r.success).toBe(true);
      expect(getAt(parse(r.yaml), s.path).with).toEqual({ message: 'hi' });
    });

    it.each(slots)('getStepFragment finds a step in the $label slot', (s) => {
      const inserted = insertStepIntoBranch(branching, child, s.owner, s.slot).yaml;
      expect(getStepFragment(inserted, 'child')).toContain('name: child');
    });

    it.each(slots)('deleteStepByName removes a step from the $label slot', (s) => {
      const inserted = insertStepIntoBranch(branching, child, s.owner, s.slot).yaml;
      const r = deleteStepByName(inserted, 'child');
      expect(r.success).toBe(true);
      expect(collectStepNamesFromYaml(r.yaml).has('child')).toBe(false);
    });

    it('insertStepAfterName appends in the same default sequence as its anchor', () => {
      const inserted = insertStepIntoBranch(branching, child, 'route', { kind: 'default' }).yaml;
      const r = insertStepAfterName(inserted, 'name: sibling\ntype: console\n', 'child');
      expect(r.success).toBe(true);
      expect(parse(r.yaml).steps[0].default.map((s: { name: string }) => s.name)).toEqual([
        'child',
        'sibling',
      ]);
    });

    it('collectStepNamesFromYaml includes nested steps but not a parallel branch name', () => {
      const inserted = insertStepIntoBranch(branching, child, 'fan_out', {
        kind: 'branch',
        index: 0,
      }).yaml;
      expect([...collectStepNamesFromYaml(inserted)].sort()).toEqual(['child', 'fan_out', 'route']);
    });
  });

  describe('failure paths', () => {
    const FRAGMENT = 'name: extra\ntype: console\n';
    const broken = 'name: demo\nsteps: [unclosed\n';

    it.each([
      ['prependStep', (y: string) => prependStep(y, FRAGMENT)],
      ['insertStepAfterName', (y: string) => insertStepAfterName(y, FRAGMENT, 'first')],
      [
        'insertStepIntoBranch',
        (y: string) => insertStepIntoBranch(y, FRAGMENT, 'first', { kind: 'steps' }),
      ],
      ['appendTrigger', (y: string) => appendTrigger(y, 'type: manual\n')],
      ['deleteTrigger', (y: string) => deleteTrigger(y, 0)],
      ['replaceTriggerFragment', (y: string) => replaceTriggerFragment(y, 0, 'type: manual\n')],
      ['setStepFallback', (y: string) => setStepFallback(y, 'first', FRAGMENT)],
      ['deleteStepByName', (y: string) => deleteStepByName(y, 'first')],
      ['replaceStepFragment', (y: string) => replaceStepFragment(y, 'first', FRAGMENT)],
    ])('%s returns the input unchanged and a parse failure for invalid YAML', (_name, mutate) => {
      const r = mutate(broken);
      expect(r.success).toBe(false);
      expect(r.yaml).toBe(broken);
      expect(failureOf(r).code).toBe('yaml-parse-error');
    });

    it('fails when the YAML root is not a mapping', () => {
      const r = prependStep('- a\n- b\n', FRAGMENT);
      expect(r.yaml).toBe('- a\n- b\n');
      expect(failureOf(r)).toEqual({ code: 'yaml-root-not-mapping' });
    });

    it('fails with the fragment error when the fragment is not valid step YAML', () => {
      expect(failureOf(prependStep(BASE, 'just text')).code).toBe('fragment-not-mapping');
      expect(failureOf(prependStep(BASE, 'name: [unclosed\n')).code).toBe('fragment-parse-error');
      expect(failureOf(appendTrigger(BASE, '- a\n')).code).toBe('fragment-not-mapping');
      const r = replaceStepFragment(BASE, 'first', 'just text');
      expect(r.yaml).toBe(BASE);
      expect(r.success).toBe(false);
    });

    it('reports the step name when the target step does not exist', () => {
      const missing = { code: 'step-not-found', stepName: 'nope' };
      expect(failureOf(insertStepAfterName(BASE, FRAGMENT, 'nope'))).toEqual(missing);
      expect(failureOf(insertStepIntoBranch(BASE, FRAGMENT, 'nope', { kind: 'steps' }))).toEqual(
        missing
      );
      expect(failureOf(setStepFallback(BASE, 'nope', FRAGMENT))).toEqual(missing);
      expect(failureOf(deleteStepByName(BASE, 'nope'))).toEqual(missing);
      expect(failureOf(replaceStepFragment(BASE, 'nope', FRAGMENT))).toEqual(missing);
      expect(deleteStepByName(BASE, 'nope').yaml).toBe(BASE);
    });

    it('rejects a trigger index that is out of range, negative included', () => {
      expect(failureOf(deleteTrigger(BASE, 1))).toEqual({
        code: 'trigger-not-found',
        triggerIndex: 1,
      });
      expect(failureOf(deleteTrigger(BASE, -1))).toEqual({
        code: 'trigger-not-found',
        triggerIndex: -1,
      });
      expect(failureOf(replaceTriggerFragment(BASE, 5, 'type: manual\n')).code).toBe(
        'trigger-not-found'
      );
      expect(failureOf(replaceTriggerFragment(BASE, -1, 'type: manual\n')).code).toBe(
        'trigger-not-found'
      );
      expect(deleteTrigger(BASE, -1).yaml).toBe(BASE);
      expect(getTriggerFragment(BASE, -1)).toBeUndefined();
      expect(getTriggerFragment(BASE, 1)).toBeUndefined();
    });

    it('rejects deleting a trigger when the workflow declares none', () => {
      const noTriggers = 'name: demo\nsteps: []\n';
      expect(failureOf(deleteTrigger(noTriggers, 0)).code).toBe('trigger-not-found');
    });

    describe('branch slots', () => {
      const workflow = `name: demo
steps:
  - name: route
    type: switch
    expression: x
    cases:
      - match: a
        steps: []
  - name: fan_out
    type: parallel
    branches:
      - name: left
        steps: []
      - just-a-string
  - name: plain
    type: console
`;

      it('rejects a branch index that is out of range', () => {
        const r = insertStepIntoBranch(workflow, FRAGMENT, 'fan_out', { kind: 'branch', index: 2 });
        expect(failureOf(r)).toEqual({ code: 'branch-not-found', index: 2 });
        expect(r.yaml).toBe(workflow);
      });

      it('rejects a negative branch index', () => {
        const r = insertStepIntoBranch(workflow, FRAGMENT, 'fan_out', {
          kind: 'branch',
          index: -1,
        });
        expect(failureOf(r)).toEqual({ code: 'branch-not-found', index: -1 });
      });

      it('rejects a branch whose wrapper is not a mapping', () => {
        const r = insertStepIntoBranch(workflow, FRAGMENT, 'fan_out', { kind: 'branch', index: 1 });
        expect(failureOf(r)).toEqual({ code: 'branch-not-map', index: 1 });
      });

      it('rejects a branch slot on a step without branches', () => {
        const r = insertStepIntoBranch(workflow, FRAGMENT, 'plain', { kind: 'branch', index: 0 });
        expect(failureOf(r).code).toBe('branch-not-found');
      });

      it('rejects a case index that is out of range, negative included', () => {
        const slot = (index: number) => ({ kind: 'case', index, match: 'a' } as const);
        expect(failureOf(insertStepIntoBranch(workflow, FRAGMENT, 'route', slot(3)))).toEqual({
          code: 'case-not-found',
          index: 3,
        });
        expect(failureOf(insertStepIntoBranch(workflow, FRAGMENT, 'route', slot(-1)))).toEqual({
          code: 'case-not-found',
          index: -1,
        });
      });

      it('rejects a case slot on a step without cases', () => {
        const r = insertStepIntoBranch(workflow, FRAGMENT, 'plain', {
          kind: 'case',
          index: 0,
          match: 'a',
        });
        expect(failureOf(r)).toEqual({ code: 'cases-missing' });
      });
    });
  });

  describe('duplicate step names', () => {
    const duplicated = `name: demo
steps:
  - name: gate
    type: if
    condition: x
    steps:
      - name: dup
        type: console
        with:
          message: nested
  - name: dup
    type: console
    with:
      message: top-level
`;

    it('locates the first match in document order, descending into a step before its next sibling', () => {
      expect(getStepFragment(duplicated, 'dup')).toContain('message: nested');
    });

    it('deleteStepByName removes only the first match', () => {
      const r = deleteStepByName(duplicated, 'dup');
      expect(r.success).toBe(true);
      const parsed = parse(r.yaml);
      expect(parsed.steps[0].steps).toEqual([]);
      expect(parsed.steps[1].with.message).toBe('top-level');
    });

    it('replaceStepFragment replaces only the first match', () => {
      const r = replaceStepFragment(duplicated, 'dup', 'name: dup\ntype: http\n');
      expect(r.success).toBe(true);
      const parsed = parse(r.yaml);
      expect(parsed.steps[0].steps[0].type).toBe('http');
      expect(parsed.steps[1].type).toBe('console');
    });

    it('top-level duplicates resolve to the earlier one', () => {
      const flat = `name: demo
steps:
  - name: dup
    type: console
    with:
      message: one
  - name: dup
    type: console
    with:
      message: two
`;
      expect(getStepFragment(flat, 'dup')).toContain('message: one');
      expect(parse(deleteStepByName(flat, 'dup').yaml).steps).toHaveLength(1);
      expect(parse(deleteStepByName(flat, 'dup').yaml).steps[0].with.message).toBe('two');
    });

    it('collectStepNamesFromYaml reports a duplicated name once', () => {
      expect([...collectStepNamesFromYaml(duplicated)].sort()).toEqual(['dup', 'gate']);
    });
  });

  describe('collectStepNamesFromYaml', () => {
    it('trims names and skips blank ones, like the definition-based collector', () => {
      const padded = `name: demo
steps:
  - name: "  padded  "
    type: console
  - name: "   "
    type: console
  - name: ""
    type: console
`;
      expect([...collectStepNamesFromYaml(padded)]).toEqual(['padded']);
    });

    it('lets a padded name collide with its trimmed form in uniqueStepName', () => {
      const padded = 'name: demo\nsteps:\n  - name: "a "\n    type: console\n';
      expect(uniqueStepName('a', collectStepNamesFromYaml(padded))).toBe('a_2');
    });

    it('returns an empty set for unparseable or non-mapping YAML', () => {
      expect(collectStepNamesFromYaml('- a\n- b\n').size).toBe(0);
      expect(collectStepNamesFromYaml('').size).toBe(0);
    });

    it('ignores a numeric map key that happens to equal a container key', () => {
      expect(collectStepNamesFromYaml('name: demo\nsteps:\n  - 1: x\n    name: ok\n').size).toBe(1);
    });
  });

  describe('failure fallbacks', () => {
    const workflow = `name: demo
steps:
  - name: loop
    type: foreach
    foreach: "{{ items }}"
    steps:
      - name: body
        type: console
    iteration-on-failure:
      fallback:
        - name: loop_recover
          type: console
  - name: call
    type: http
    on-failure:
      fallback:
        - name: call_recover
          type: console
`;

    it.each(['loop_recover', 'call_recover'])('finds the fallback step %s', (name) => {
      expect(getStepFragment(workflow, name)).toContain(`name: ${name}`);
      expect(getStepSourceRange(workflow, name)).toBeDefined();
    });

    it.each([
      ['loop', 'loop_recover', 'iteration-on-failure'],
      ['call', 'call_recover', 'on-failure'],
    ])('deleting the only fallback step of %s clears its %s block', (owner, fallback, key) => {
      const r = deleteStepByName(workflow, fallback);
      expect(r.success).toBe(true);
      const step = parse(r.yaml).steps.find((s: { name: string }) => s.name === owner);
      expect(step[key]).toBeUndefined();
    });

    it('inserts after a fallback step inside the same fallback list', () => {
      const r = insertStepAfterName(workflow, 'name: after\ntype: console\n', 'call_recover');
      expect(r.success).toBe(true);
      expect(
        parse(r.yaml).steps[1]['on-failure'].fallback.map((s: { name: string }) => s.name)
      ).toEqual(['call_recover', 'after']);
    });

    it('setStepFallback replaces a fallback that already exists instead of appending', () => {
      const r = setStepFallback(workflow, 'call', 'name: other\ntype: console\n');
      expect(r.success).toBe(true);
      expect(parse(r.yaml).steps[1]['on-failure'].fallback).toEqual([
        { name: 'other', type: 'console' },
      ]);
      expect(collectStepNamesFromYaml(r.yaml).has('call_recover')).toBe(false);
    });
  });

  describe('read paths do not depend on block style normalisation', () => {
    const flowSteps = 'name: demo\nsteps: [{name: a, type: console}, {name: b, type: console}]\n';

    it('reads a step from a flow-style sequence', () => {
      expect(getStepFragment(flowSteps, 'b')).toContain('name: b');
      expect(getStepSourceRange(flowSteps, 'b')).toBeDefined();
    });

    it('writes still render the touched sequence in block style', () => {
      const r = deleteStepByName(flowSteps, 'a');
      expect(r.success).toBe(true);
      expect(r.yaml).toMatch(/steps:\n\s+- /);
      expect(parse(r.yaml).steps).toEqual([{ name: 'b', type: 'console' }]);
    });
  });
});
