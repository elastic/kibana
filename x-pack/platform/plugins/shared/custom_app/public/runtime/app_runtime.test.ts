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
