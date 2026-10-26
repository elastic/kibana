/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getBoundSignature, isNodeVisible, resolveBoundProps } from './bindings';
import { appDocumentSchema, type AppNode } from './document_schema';

const doc = (children: unknown[], state: Record<string, unknown> = {}) => ({
  state,
  root: { type: 'stack', id: 'root', children },
});
const messagesOf = (document: unknown) => {
  const result = appDocumentSchema.safeParse(document);
  return result.success ? [] : result.error.issues.map(({ message }) => message);
};
const nodeOf = (document: unknown, index = 0) =>
  (appDocumentSchema.parse(document).root as { children: AppNode[] }).children[index];

describe('properties that read a value of the app', () => {
  it('keep their defaults when they are written down, or left out', () => {
    const [badge, progress] = [
      nodeOf(doc([{ type: 'badge', id: 'b', text: 'x' }])),
      nodeOf(doc([{ type: 'progress', id: 'p', query: 'ROW a = 1' }])),
    ] as Array<Record<string, unknown>>;

    expect(badge.color).toBe('default');
    expect(progress).toMatchObject({ max: 100, color: 'primary' });
  });

  it('are accepted when they are a value of the right kind', () => {
    expect(
      messagesOf(
        doc(
          [
            { type: 'badge', id: 'b', text: 'x', color: { $state: 'sev' } },
            { type: 'progress', id: 'p', query: 'ROW a = 1', max: { $state: 'limit' } },
            { type: 'card', id: 'c', icon: { $state: 'pic' }, children: [] },
          ],
          {
            sev: { type: 'string', default: 'success' },
            limit: { type: 'number', default: 10 },
            pic: { type: 'string', default: 'check' },
          }
        )
      )
    ).toEqual([]);
  });

  it.each([
    ['a key that does not exist', {}, 'Node "b" reads "color" from unknown state key "sev"'],
    [
      'a key of another kind',
      { sev: { type: 'number', default: 1 } },
      'Node "b" reads "color" from state key "sev" (number); it needs a string key',
    ],
    [
      'a key whose default the property cannot have',
      { sev: { type: 'string', default: 'purple-ish' } },
      'is not a value "color" can have',
    ],
  ])('are refused for %s', (_what, state, message) => {
    expect(
      messagesOf(doc([{ type: 'badge', id: 'b', text: 'x', color: { $state: 'sev' } }], state))[0]
    ).toContain(message);
  });

  it('become the value they read, when the component is drawn', () => {
    const badge = nodeOf(
      doc([{ type: 'badge', id: 'b', text: 'x', color: { $state: 'sev' } }], {
        sev: { type: 'string', default: 'success' },
      })
    );

    expect(resolveBoundProps(badge, { sev: 'danger' })).toMatchObject({ color: 'danger' });
  });

  it('become what they are when nothing is written, if the value is not one they can have', () => {
    const badge = nodeOf(
      doc([{ type: 'badge', id: 'b', text: 'x', color: { $state: 'sev' } }], {
        sev: { type: 'string', default: 'success' },
      })
    );

    expect(resolveBoundProps(badge, { sev: 'magenta' })).toMatchObject({ color: 'default' });
    expect(resolveBoundProps(badge, {})).toMatchObject({ color: 'default' });
  });

  it('can be inside another property, such as the annotations of a chart', () => {
    const chart = nodeOf(
      doc(
        [
          {
            type: 'chart',
            id: 'c',
            query: 'FROM d',
            annotations: { query: 'FROM e', time: 't', visible: { $state: 'show' } },
          },
        ],
        { show: { type: 'boolean', default: false } }
      )
    );

    expect(resolveBoundProps(chart, { show: true })).toMatchObject({
      annotations: { visible: true },
    });
    expect(resolveBoundProps(chart, { show: false })).toMatchObject({
      annotations: { visible: false },
    });
  });

  it('are told apart by what they are now, so that a component can be kept while they do not change', () => {
    const badge = nodeOf(
      doc([{ type: 'badge', id: 'b', text: 'x', color: { $state: 'sev' } }], {
        sev: { type: 'string', default: 'success' },
      })
    );

    expect(getBoundSignature(badge, { sev: 'danger', other: 1 })).toBe(
      getBoundSignature(badge, { sev: 'danger', other: 2 })
    );
    expect(getBoundSignature(badge, { sev: 'danger' })).not.toBe(
      getBoundSignature(badge, { sev: 'warning' })
    );
    expect(getBoundSignature(nodeOf(doc([{ type: 'heading', id: 'h', text: 'x' }])), {})).toBe('');
  });

  it('leave a component as the same one when it reads nothing', () => {
    const heading = nodeOf(doc([{ type: 'heading', id: 'h', text: 'x' }]));

    expect(resolveBoundProps(heading, { anything: 1 })).toBe(heading);
  });
});

describe('showing a component by a value', () => {
  const withRule = (rule: unknown, state: Record<string, unknown>) =>
    doc([{ type: 'heading', id: 'h', text: 'x', visibleWhen: rule }], state);

  it('is allowed on every component, and a component with no rule is always shown', () => {
    expect(isNodeVisible({}, {})).toBe(true);
    expect(
      messagesOf(
        doc(
          [
            { type: 'table', id: 't', query: 'ROW a = 1', visibleWhen: { $state: 'on' } },
            { type: 'stack', id: 's', visibleWhen: { $state: 'on' }, children: [] },
            { type: 'switch', id: 'w', label: 'W', bind: 'on', visibleWhen: { $state: 'on' } },
          ],
          { on: { type: 'boolean', default: true } }
        )
      )
    ).toEqual([]);
  });

  it('is shown while a true or false is true, or while a value is the one wanted', () => {
    expect(isNodeVisible({ visibleWhen: { $state: 'on' } }, { on: true })).toBe(true);
    expect(isNodeVisible({ visibleWhen: { $state: 'on' } }, { on: false })).toBe(false);
    expect(isNodeVisible({ visibleWhen: { $state: 'view', equals: 'a' } }, { view: 'a' })).toBe(
      true
    );
    expect(isNodeVisible({ visibleWhen: { $state: 'view', equals: 'a' } }, { view: 'b' })).toBe(
      false
    );
  });

  it.each([
    ['a key that does not exist', {}, 'Node "h" is shown by unknown state key "on"'],
    [
      'a text without a value to equal',
      { on: { type: 'string', default: 'x' } },
      'without "equals" it needs a boolean key',
    ],
    [
      'a list',
      { on: { type: 'list', default: [] } },
      'is shown by state key "on", which is a list',
    ],
  ])('is refused for %s', (_what, state, message) => {
    expect(messagesOf(withRule({ $state: 'on' }, state))[0]).toContain(message);
  });

  it('is refused when the value to equal is of another kind than the key', () => {
    expect(
      messagesOf(
        withRule({ $state: 'view', equals: 3 }, { view: { type: 'string', default: 'a' } })
      )[0]
    ).toContain('which is a number');
  });
});
