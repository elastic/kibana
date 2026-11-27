/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDocument } from 'yaml';
import { writeFragmentValue } from './fragment_yaml';
import type { StepFormField } from './step_form_schema';

const field = (path: readonly string[], overrides: Partial<StepFormField> = {}): StepFormField => ({
  key: path[path.length - 1],
  path,
  label: path[path.length - 1],
  required: false,
  kind: 'text',
  ...overrides,
});

const toJs = (yaml: string) => parseDocument(yaml).toJS();

const STEP = `name: notify # keep me
type: slack
x-owner: team-a
with:
  message: hi
  count: 5
`;

describe('writeFragmentValue', () => {
  describe('setting a value', () => {
    it('writes the value at its path', () => {
      expect(toJs(writeFragmentValue(STEP, field(['with', 'message']), 'bye', 2))).toMatchObject({
        with: { message: 'bye', count: 5 },
      });
    });

    it('writes a root key', () => {
      expect(toJs(writeFragmentValue(STEP, field(['timeout']), '30s', 2))).toMatchObject({
        timeout: '30s',
        name: 'notify',
      });
    });

    it('creates the mapping a key lives in when it is missing', () => {
      const out = writeFragmentValue('name: a\ntype: x\n', field(['with', 'message']), 'hi', 2);
      expect(toJs(out)).toEqual({ name: 'a', type: 'x', with: { message: 'hi' } });
    });

    it('keeps comments and keys the form does not own', () => {
      const out = writeFragmentValue(STEP, field(['with', 'message']), 'bye', 2);
      expect(out).toContain('# keep me');
      expect(out).toContain('x-owner: team-a');
    });

    it('writes structured values as YAML', () => {
      const out = writeFragmentValue(STEP, field(['with', 'query']), { a: [1, 2] }, 2);
      expect(toJs(out)).toMatchObject({ with: { query: { a: [1, 2] } } });
    });

    it('indents by the amount given', () => {
      expect(writeFragmentValue('name: a\n', field(['with', 'x']), 'y', 4)).toContain('\n    x: y');
    });

    it('does not fold a long line', () => {
      const long = 'word '.repeat(60).trim();
      const out = writeFragmentValue('name: a\n', field(['with', 'x']), long, 2);
      expect(toJs(out)).toMatchObject({ with: { x: long } });
      // `name`, `with` and the one line of `x`: nothing was folded onto more lines.
      expect(out.trim().split('\n')).toHaveLength(3);
    });
  });

  describe('clearing a value', () => {
    it.each([
      ['undefined', undefined],
      ['null', null],
      ['an empty list', []],
      ['an empty map', {}],
    ])('removes an optional key when it becomes %s', (_label, value) => {
      const out = writeFragmentValue(STEP, field(['with', 'count']), value, 2);
      expect(toJs(out)).toMatchObject({ with: { message: 'hi' } });
      expect(toJs(out).with).not.toHaveProperty('count');
    });

    it('keeps an optional key as an empty string, which is how a field stays in expression mode', () => {
      const out = writeFragmentValue(STEP, field(['with', 'message']), '', 2);
      expect(toJs(out).with).toHaveProperty('message', '');
    });

    it('removes that key when the field says clearing deletes it', () => {
      const out = writeFragmentValue(
        STEP,
        field(['with', 'message'], { deleteWhenEmpty: true }),
        '',
        2
      );
      expect(toJs(out).with).not.toHaveProperty('message');
    });

    it('never removes a required key, it keeps it empty', () => {
      const out = writeFragmentValue(
        STEP,
        field(['with', 'message'], { required: true }),
        undefined,
        2
      );
      expect(toJs(out).with).toHaveProperty('message');
    });

    it('does nothing for a key whose parent mapping is not there', () => {
      const out = writeFragmentValue('name: a\n', field(['with', 'count']), undefined, 2);
      expect(toJs(out)).toEqual({ name: 'a' });
    });
  });

  describe('text that is not a step mapping', () => {
    it.each([
      ['a scalar', 'just text'],
      ['a list', '- a\n- b\n'],
      ['nothing', ''],
    ])('is returned as it was for %s', (_label, text) => {
      expect(writeFragmentValue(text, field(['with', 'x']), 'y', 2)).toBe(text);
    });
  });

  describe('a list that is already there', () => {
    const PARALLEL = `name: par
type: parallel
branches:
  - name: a # keep a
    steps:
      - name: s1 # keep s1
        type: console
        with:
          message: hi
  - name: b
    steps:
      - name: s2
        type: console
        # keep s2 comment
        with:
          message: yo
`;
    const branches = field(['branches'], { kind: 'parallel-branches' });
    const current = () => toJs(PARALLEL).branches as Array<Record<string, unknown>>;
    const write = (next: unknown[]) => writeFragmentValue(PARALLEL, branches, next, 2);

    it('keeps the comments of every step when one branch is renamed', () => {
      const [first, second] = current();
      const out = write([{ ...first, name: 'alpha' }, second]);

      expect(toJs(out).branches[0].name).toBe('alpha');
      expect(out).toContain('# keep s1');
      expect(out).toContain('# keep s2 comment');
      expect(toJs(out).branches[1]).toEqual(second);
    });

    it('keeps the comments of the branches that stay when one is deleted', () => {
      const [, second] = current();
      const out = write([second]);

      expect(toJs(out).branches).toEqual([second]);
      expect(out).toContain('# keep s2 comment');
      expect(out).not.toContain('keep s1');
    });

    it('keeps the existing branches, as they were written, when one is added', () => {
      const out = write([...current(), { name: 'c', steps: [] }]);

      expect(toJs(out).branches).toHaveLength(3);
      expect(toJs(out).branches[2]).toEqual({ name: 'c', steps: [] });
      expect(out).toContain('# keep s1');
      expect(out).toContain('# keep s2 comment');
    });

    it('drops a key the new value no longer has, and writes one it gained', () => {
      const [first, second] = current();
      const { steps, ...withoutSteps } = first as { steps: unknown };
      const out = write([{ ...withoutSteps, extra: 1 }, second]);

      expect(toJs(out).branches[0]).toEqual({ name: 'a', extra: 1 });
      expect(steps).toBeDefined();
    });

    it('leaves the text as it was when the value did not change', () => {
      expect(write(current())).toBe(PARALLEL);
    });

    it('empties a list the field requires, which keeps its key', () => {
      const required = field(['branches'], { kind: 'parallel-branches', required: true });
      expect(toJs(writeFragmentValue(PARALLEL, required, [], 2)).branches).toEqual([]);
    });

    it('keeps the flow style of a short list when one item changes', () => {
      const out = writeFragmentValue(
        'name: x\ntags: [a, b, c]\n',
        field(['tags'], { kind: 'list' }),
        ['a', 'z', 'c'],
        2
      );
      expect(out).toMatch(/tags: \[\s*a, z, c\s*\]/);
    });
  });

  describe('a list that is still empty', () => {
    // `placeholderFor` seeds switch cases and parallel branches with `[]`, which `yaml` keeps as a
    // flow sequence: every item written (and every step inserted under it later) would then be
    // flow style too, which turns multi-line strings into multi-line double-quoted scalars.
    it('writes the first switch case in block style', () => {
      const out = writeFragmentValue(
        'name: s\ntype: switch\nexpression: x\ncases: []\n',
        field(['cases'], { kind: 'switch-cases' }),
        [{ match: 'a', steps: [] }],
        2
      );

      expect(toJs(out).cases).toEqual([{ match: 'a', steps: [] }]);
      expect(out).toMatch(/cases:\n {2}- match: a\n {4}steps: \[\]/);
    });

    it('writes the first parallel branch in block style', () => {
      const out = writeFragmentValue(
        'name: p\ntype: parallel\nbranches: []\n',
        field(['branches'], { kind: 'parallel-branches' }),
        [{ name: 'left', steps: [] }],
        2
      );

      expect(out).toMatch(/branches:\n {2}- name: left/);
    });

    it('leaves an empty list as it was when it is written empty again', () => {
      const text = 'name: s\ncases: [] # none yet\n';

      const required = field(['cases'], { kind: 'switch-cases', required: true });

      expect(writeFragmentValue(text, required, [], 2)).toBe(text);
    });
  });

  describe('a fragment with YAML errors', () => {
    const BROKEN = 'name: a\ntype: x\nwith: {a: 1\n';

    it('is returned as it was, because a document with errors cannot be written back', () => {
      expect(writeFragmentValue(BROKEN, field(['name']), 'b', 2)).toBe(BROKEN);
      expect(writeFragmentValue(BROKEN, field(['timeout']), '30s', 2)).toBe(BROKEN);
    });
  });
});
