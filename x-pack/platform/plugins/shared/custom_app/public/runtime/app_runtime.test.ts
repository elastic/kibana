/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appDocumentSchema, type Action, type AppDocument } from '@kbn/custom-app-common';
import { createAppRuntime } from './app_runtime';

const parse = (input: unknown): AppDocument => appDocumentSchema.parse(input);

const document = parse({
  state: {
    service: { type: 'string', default: 'all' },
    limit: { type: 'number', default: 10 },
    compact: { type: 'boolean', default: false },
  },
  root: {
    type: 'stack',
    id: 'root',
    children: [
      { type: 'flyout', id: 'detail', title: 'Detail', children: [] },
      {
        type: 'stack',
        id: 'wrap',
        children: [{ type: 'flyout', id: 'nested', title: 'N', children: [] }],
      },
    ],
  },
});

const setState = (key: string, value: unknown): Action =>
  ({ type: 'setState', key, value } as Action);

describe('running a workflow', () => {
  const run = (inputs: Record<string, unknown>, extra: Action[] = []) =>
    ({
      type: 'runWorkflow',
      workflow: 'isolate-host',
      inputs,
    } as Action);

  it('asks for a workflow to be run, and runs nothing itself', () => {
    const runtime = createAppRuntime(document);

    const result = runtime.run([run({ reason: 'Suspicious' })]);

    expect(result.workflows).toEqual([
      { workflow: 'isolate-host', inputs: { reason: 'Suspicious' } },
    ]);
    expect(result.dropped).toEqual([]);
  });

  it('hands over a column of the clicked row, and the current value of the app', () => {
    const runtime = createAppRuntime(document);

    const { workflows } = runtime.run(
      [
        run({
          host: { fromColumn: 'host.name' },
          service: { fromState: 'service' },
          limit: { fromState: 'limit' },
        }),
      ],
      { row: { 'host.name': 'web-1' } }
    );

    expect(workflows).toEqual([
      { workflow: 'isolate-host', inputs: { host: 'web-1', service: 'all', limit: 10 } },
    ]);
  });

  it('hands over the value an earlier action set, as the actions run in order', () => {
    const runtime = createAppRuntime(document);

    const { workflows } = runtime.run([
      setState('service', 'checkout'),
      run({ service: { fromState: 'service' } }),
    ]);

    expect(workflows[0].inputs).toEqual({ service: 'checkout' });
  });

  it('hands over what it was given at that point, not what an action after it sets', () => {
    const runtime = createAppRuntime(document);

    const { workflows } = runtime.run([
      run({ service: { fromState: 'service' } }),
      setState('service', 'checkout'),
    ]);

    expect(workflows[0].inputs).toEqual({ service: 'all' });
  });

  it('hands over several values of a column, and nothing of a kind a workflow cannot take', () => {
    const runtime = createAppRuntime(document);

    const several = runtime.run([run({ tags: { fromColumn: 'tags' } })], {
      row: { tags: ['a', 'b'] },
    });
    expect(several.workflows[0].inputs).toEqual({ tags: ['a', 'b'] });

    const object = runtime.run([run({ nested: { fromColumn: 'nested' } })], {
      row: { nested: { a: 1 } },
    });
    expect(object.workflows).toEqual([]);
    expect(object.dropped.join()).toContain('not a plain value');
  });

  it('does not run it at all, and says why, when a column is not in the row', () => {
    const runtime = createAppRuntime(document);

    const { workflows, dropped } = runtime.run(
      [run({ reason: 'x', host: { fromColumn: 'host.name' } })],
      { row: { other: 1 } }
    );

    expect(workflows).toEqual([]);
    expect(dropped).toEqual(['Column "host.name" is not in the row']);
  });

  it('does not run it for a button pressed with no row, when it needs a column', () => {
    const runtime = createAppRuntime(document);

    expect(runtime.run([run({ host: { fromColumn: 'host.name' } })]).workflows).toEqual([]);
  });

  it('asks for each workflow, in order, and does the other actions as well', () => {
    const runtime = createAppRuntime(document);

    const { workflows } = runtime.run([
      { type: 'openFlyout', flyout: 'detail' },
      { type: 'runWorkflow', workflow: 'first', inputs: {} } as Action,
      { type: 'runWorkflow', workflow: 'second', inputs: {} } as Action,
    ]);

    expect(workflows.map(({ workflow }) => workflow)).toEqual(['first', 'second']);
    expect(runtime.openFlyoutId$.getValue()).toBe('detail');
  });

  it('asks for nothing when there is nothing to run', () => {
    expect(createAppRuntime(document).run([setState('service', 'x')]).workflows).toEqual([]);
  });
});

describe('createAppRuntime', () => {
  it('starts from the declared defaults with no flyout open', () => {
    const runtime = createAppRuntime(document);

    expect(runtime.state$.getValue()).toEqual({ service: 'all', limit: 10, compact: false });
    expect(runtime.openFlyoutId$.getValue()).toBeUndefined();
  });

  describe('setState', () => {
    it('stores a literal of the declared type', () => {
      const runtime = createAppRuntime(document);

      const { dropped } = runtime.run([setState('service', 'checkout'), setState('limit', 5)]);

      expect(dropped).toEqual([]);
      expect(runtime.state$.getValue()).toEqual({ service: 'checkout', limit: 5, compact: false });
    });

    it('copies a column of the clicked row', () => {
      const runtime = createAppRuntime(document);

      runtime.run([setState('service', { fromColumn: 'service.name' })], {
        row: { 'service.name': 'cart', other: 1 },
      });

      expect(runtime.state$.getValue().service).toBe('cart');
    });

    it('copies the value of an input', () => {
      const runtime = createAppRuntime(document);

      runtime.run([setState('compact', { fromInput: true })], { input: true });

      expect(runtime.state$.getValue().compact).toBe(true);
    });

    it('takes a number or a true/false from a column as text for a text value', () => {
      const runtime = createAppRuntime(document);

      runtime.run([setState('service', { fromColumn: 'id' })], { row: { id: 42 } });
      expect(runtime.state$.getValue().service).toBe('42');

      runtime.run([setState('service', { fromColumn: 'ok' })], { row: { ok: true } });
      expect(runtime.state$.getValue().service).toBe('true');
    });

    it('does not turn text into a number or a boolean', () => {
      const runtime = createAppRuntime(document);

      const { dropped } = runtime.run([setState('compact', { fromColumn: 'c' })], {
        row: { c: 'yes' },
      });

      expect(dropped).toEqual(['"compact" expects a boolean but got string']);
      expect(runtime.state$.getValue().compact).toBe(false);
    });

    it('drops a value of the wrong type and says why, leaving the state alone', () => {
      const runtime = createAppRuntime(document);

      const { dropped } = runtime.run([setState('limit', { fromColumn: 'count' })], {
        row: { count: 'many' },
      });

      expect(dropped).toEqual(['"limit" expects a number but got string']);
      expect(runtime.state$.getValue().limit).toBe(10);
    });

    it.each([
      [null, 'null'],
      [undefined, 'undefined'],
      [{ a: 1 }, 'object'],
    ])('drops %p from a row, which is not a string', (value, described) => {
      const runtime = createAppRuntime(document);

      const { dropped } = runtime.run([setState('service', { fromColumn: 'c' })], {
        row: { c: value },
      });

      expect(dropped).toEqual([`"service" expects a string but got ${described}`]);
    });

    it('drops a number that is not finite and a string over the length limit', () => {
      const runtime = createAppRuntime(document);

      expect(
        runtime.run([setState('limit', { fromColumn: 'c' })], { row: { c: NaN } }).dropped
      ).toEqual(['"limit" expects a finite number']);
      expect(
        runtime.run([setState('service', { fromColumn: 'c' })], { row: { c: 'x'.repeat(1001) } })
          .dropped
      ).toEqual(['"service" expects at most 1000 characters']);
      expect(runtime.state$.getValue()).toEqual({ service: 'all', limit: 10, compact: false });
    });

    it('drops a column the row does not have, and a row-less interaction', () => {
      const runtime = createAppRuntime(document);

      expect(
        runtime.run([setState('service', { fromColumn: 'nope' })], { row: { a: 1 } }).dropped
      ).toEqual(['Column "nope" is not in the row']);
      expect(runtime.run([setState('service', { fromColumn: 'a' })]).dropped).toEqual([
        'Column "a" is not in the row',
      ]);
    });

    it('drops an input action that carries no input', () => {
      const runtime = createAppRuntime(document);

      const { dropped } = runtime.run([setState('compact', { fromInput: true })]);

      expect(dropped).toEqual(['"compact" expects a boolean but got undefined']);
    });

    it('drops a key that is not declared', () => {
      const runtime = createAppRuntime(document);

      expect(runtime.run([setState('ghost', 'x')]).dropped).toEqual(['Unknown state key "ghost"']);
    });

    it('applies the actions that are valid and reports the others', () => {
      const runtime = createAppRuntime(document);

      const { dropped } = runtime.run([
        setState('service', 'checkout'),
        setState('limit', 'ten'),
        setState('compact', true),
      ]);

      expect(dropped).toHaveLength(1);
      expect(runtime.state$.getValue()).toEqual({ service: 'checkout', limit: 10, compact: true });
    });

    it('does not emit when the value is unchanged, and never mutates a state it emitted', () => {
      const runtime = createAppRuntime(document);
      const emissions: unknown[] = [];
      runtime.state$.subscribe((value) => emissions.push(value));
      const initial = runtime.state$.getValue();

      runtime.run([setState('service', 'all')]);
      expect(emissions).toHaveLength(1);

      runtime.run([setState('service', 'cart')]);
      expect(emissions).toHaveLength(2);
      expect(initial).toEqual({ service: 'all', limit: 10, compact: false });
    });
  });

  describe('flyouts', () => {
    it('opens a flyout wherever it is in the tree, and closes it', () => {
      const runtime = createAppRuntime(document);

      runtime.run([{ type: 'openFlyout', flyout: 'nested' }]);
      expect(runtime.openFlyoutId$.getValue()).toBe('nested');

      runtime.run([{ type: 'closeFlyout' }]);
      expect(runtime.openFlyoutId$.getValue()).toBeUndefined();
    });

    it('drops an attempt to open something that is not a flyout', () => {
      const runtime = createAppRuntime(document);

      expect(runtime.run([{ type: 'openFlyout', flyout: 'root' }]).dropped).toEqual([
        '"root" is not a flyout',
      ]);
      expect(runtime.openFlyoutId$.getValue()).toBeUndefined();
    });

    it('lets a click set state and open a flyout in one go', () => {
      const runtime = createAppRuntime(document);

      runtime.run(
        [setState('service', { fromColumn: 'name' }), { type: 'openFlyout', flyout: 'detail' }],
        { row: { name: 'cart' } }
      );

      expect(runtime.state$.getValue().service).toBe('cart');
      expect(runtime.openFlyoutId$.getValue()).toBe('detail');
    });
  });

  describe('a list', () => {
    const listDocument = parse({
      state: {
        users: { type: 'list', default: [] },
        service: { type: 'string', default: 'all' },
      },
      root: { type: 'text', id: 't', text: 'x' },
    });

    it('starts as declared', () => {
      expect(createAppRuntime(listDocument).state$.getValue().users).toEqual([]);
    });

    it('is set by an action to a list, by the list an input hands over, or to a column of a row', () => {
      const runtime = createAppRuntime(listDocument);

      runtime.run([setState('users', ['alice'])]);
      expect(runtime.state$.getValue().users).toEqual(['alice']);

      runtime.run([setState('users', { fromInput: true })], { input: ['bob', 'carol'] });
      expect(runtime.state$.getValue().users).toEqual(['bob', 'carol']);

      runtime.run([setState('users', { fromColumn: 'names' })], { row: { names: ['dave'] } });
      expect(runtime.state$.getValue().users).toEqual(['dave']);
    });

    it('is set to a list of one by a column that holds one value, as a click on a bar gives', () => {
      const runtime = createAppRuntime(listDocument);

      runtime.run([setState('users', { fromColumn: 'user.name' })], {
        row: { 'user.name': 'alice' },
      });
      expect(runtime.state$.getValue().users).toEqual(['alice']);

      runtime.run([setState('users', { fromColumn: 'count' })], { row: { count: 42 } });
      expect(runtime.state$.getValue().users).toEqual(['42']);
    });

    it('is emptied by a column that holds nothing, not set to a list of an empty value', () => {
      const runtime = createAppRuntime(listDocument);
      runtime.run([setState('users', ['alice'])]);

      runtime.run([setState('users', { fromColumn: 'user.name' })], { row: { 'user.name': '' } });

      expect(runtime.state$.getValue().users).toEqual([]);
    });

    it('does not take a null, which is not a value, and says so', () => {
      const runtime = createAppRuntime(listDocument);

      const { dropped } = runtime.run([setState('users', { fromColumn: 'user.name' })], {
        row: { 'user.name': null },
      });

      expect(dropped).toEqual(['"users" expects a list but got null']);
    });

    it('still refuses a text that was written down for a list, which is a mistake of the author', () => {
      const runtime = createAppRuntime(listDocument);

      expect(runtime.run([setState('users', 'alice')]).dropped).toEqual([
        '"users" expects a list but got string',
      ]);
    });

    it('says nothing, and does not change, when it is set to the same values', () => {
      const runtime = createAppRuntime(listDocument);
      runtime.run([setState('users', ['alice'])]);
      const states: unknown[] = [];
      runtime.state$.subscribe((state) => states.push(state));

      runtime.run([setState('users', ['alice'])]);

      expect(states).toHaveLength(1);
    });

    it('refuses what is not a list of texts, and a text for a list', () => {
      const runtime = createAppRuntime(listDocument);

      expect(runtime.run([setState('users', 'alice')]).dropped).toEqual([
        '"users" expects a list but got string',
      ]);
      expect(runtime.run([setState('users', [1, 2])]).dropped[0]).toContain('a list of texts');
      expect(runtime.run([setState('service', ['a'])]).dropped).toEqual([
        '"service" expects a string but got a list',
      ]);
      expect(runtime.state$.getValue()).toEqual({ users: [], service: 'all' });
    });

    it('refuses a list that is too long, and a value that is too long', () => {
      const runtime = createAppRuntime(listDocument);

      expect(
        runtime.run([
          setState(
            'users',
            Array.from({ length: 1001 }, (_, i) => `u${i}`)
          ),
        ]).dropped[0]
      ).toContain('at most 1000 values');
      expect(runtime.run([setState('users', ['x'.repeat(1001)])]).dropped[0]).toContain(
        'a list of texts'
      );
    });

    it('is handed to a workflow as a list of texts', () => {
      const runtime = createAppRuntime(listDocument);
      runtime.run([setState('users', ['alice', 'bob'])]);

      const { workflows } = runtime.run([
        { type: 'runWorkflow', workflow: 'w', inputs: { users: { fromState: 'users' } } },
      ]);

      expect(workflows).toEqual([{ workflow: 'w', inputs: { users: ['alice', 'bob'] } }]);
    });

    it('is kept by a new document that still declares it, and reset when it is not a list any more', () => {
      const runtime = createAppRuntime(listDocument);
      runtime.run([setState('users', ['alice'])]);

      runtime.setDocument(listDocument);
      expect(runtime.state$.getValue().users).toEqual(['alice']);

      runtime.setDocument(
        parse({
          state: { users: { type: 'string', default: 'none' } },
          root: { type: 'text', id: 't', text: 'x' },
        })
      );
      expect(runtime.state$.getValue().users).toBe('none');
    });
  });

  describe('restoreView', () => {
    const keys = ['service', 'limit', 'compact'];

    it('sets the values the view holds, and the flyout', () => {
      const runtime = createAppRuntime(document);

      runtime.restoreView({ values: { service: 'cart', limit: 5 }, flyout: 'detail' }, keys);

      expect(runtime.state$.getValue()).toEqual({ service: 'cart', limit: 5, compact: false });
      expect(runtime.openFlyoutId$.getValue()).toBe('detail');
    });

    it('puts back to how it starts every value of the keys that the view does not hold', () => {
      const runtime = createAppRuntime(document);
      runtime.run([setState('service', 'cart'), setState('limit', 99)]);
      runtime.run([{ type: 'openFlyout', flyout: 'detail' }]);

      runtime.restoreView({ values: { limit: 5 } }, keys);

      expect(runtime.state$.getValue()).toEqual({ service: 'all', limit: 5, compact: false });
      expect(runtime.openFlyoutId$.getValue()).toBeUndefined();
    });

    it('leaves a value that is not of the keys as it is, as a form answer should be', () => {
      const runtime = createAppRuntime(document);
      runtime.run([setState('service', 'typed')]);

      runtime.restoreView({ values: {} }, ['limit']);

      expect(runtime.state$.getValue().service).toBe('typed');
    });

    it('does not take a value of the wrong type, nor a flyout that is not there', () => {
      const runtime = createAppRuntime(document);

      runtime.restoreView({ values: { limit: 'ten' as unknown as number }, flyout: 'nope' }, keys);

      expect(runtime.state$.getValue().limit).toBe(10);
      expect(runtime.openFlyoutId$.getValue()).toBeUndefined();
    });

    it('says nothing when the view is what the app already is', () => {
      const runtime = createAppRuntime(document);
      const states: unknown[] = [];
      runtime.state$.subscribe((state) => states.push(state));

      runtime.restoreView({ values: {} }, keys);

      expect(states).toHaveLength(1);
    });
  });

  describe('setDocument', () => {
    it('keeps the values of keys that are still declared with the same type', () => {
      const runtime = createAppRuntime(document);
      runtime.run([setState('service', 'cart')]);

      runtime.setDocument(
        parse({
          state: { service: { type: 'string', default: 'all' } },
          root: { type: 'text', id: 'a', text: 'x' },
        })
      );

      expect(runtime.state$.getValue()).toEqual({ service: 'cart' });
    });

    it('adds new keys with their default and resets a key whose type changed', () => {
      const runtime = createAppRuntime(document);
      runtime.run([setState('limit', 99)]);

      runtime.setDocument(
        parse({
          state: {
            limit: { type: 'string', default: 'none' },
            fresh: { type: 'number', default: 1 },
          },
          root: { type: 'text', id: 'a', text: 'x' },
        })
      );

      expect(runtime.state$.getValue()).toEqual({ limit: 'none', fresh: 1 });
    });

    it('closes a flyout the new document no longer has, and keeps one it still has', () => {
      const runtime = createAppRuntime(document);
      runtime.run([{ type: 'openFlyout', flyout: 'detail' }]);

      runtime.setDocument(document);
      expect(runtime.openFlyoutId$.getValue()).toBe('detail');

      runtime.setDocument(parse({ root: { type: 'text', id: 'a', text: 'x' } }));
      expect(runtime.openFlyoutId$.getValue()).toBeUndefined();
    });

    it('does not emit when nothing changed', () => {
      const runtime = createAppRuntime(document);
      const emissions: unknown[] = [];
      runtime.state$.subscribe((value) => emissions.push(value));

      runtime.setDocument(document);

      expect(emissions).toHaveLength(1);
    });
  });
});
