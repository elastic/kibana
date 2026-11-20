/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { loggerMock } from '@kbn/logging-mocks';
import { MAX_KIND_ID_LENGTH, MAX_OWNED_ID_LENGTH } from '../ledger/ledger_saved_object';
import type { JsonValue } from '@kbn/resource-bootstrap-server';
import {
  ResourceKindRegistry,
  type DeclaredDocument,
  type PreparedDocuments,
  type RegisteredKind,
} from './resource_kind_registry';

const widgetKind = (
  overrides: { id?: string; dependsOn?: string[]; spaces?: 'none' | 'isolated' | 'shared' } = {}
) => ({
  id: 'widget',
  spaces: 'isolated' as const,
  parse: (document: JsonValue) => schema.object({ name: schema.string() }).validate(document),
  idOf: ({ name }: { name: string }) => name,
  apply: jest.fn(async ({ resources }: { resources: Array<{ name: string }> }) => ({
    applied: resources.length,
    errors: [],
  })),
  ...overrides,
});

const prepareOptions = { managed: false, spaces: ['default'] };

/** Documents declared one after another in `widgets.widget.json`. */
const declared = (...bodies: JsonValue[]) =>
  bodies.map((body, index) => ({ source: `widgets.widget.json entry ${index + 1}`, body }));

/** Prepares the documents as the only group of their kind. */
const prepareGroup = (
  registered: RegisteredKind,
  documents: DeclaredDocument[],
  { managed, spaces }: { managed: boolean; spaces: string[] }
): PreparedDocuments => {
  const [prepared] = registered.prepare([{ declarations: documents, spaces }], { managed });
  if (!('documents' in prepared)) {
    throw prepared.error;
  }
  return prepared.documents;
};

const applyParams = {
  spaceId: 'default',
  signal: new AbortController().signal,
  logger: loggerMock.create(),
};

describe('ResourceKindRegistry', () => {
  it('rejects ids that cannot appear in a file name', () => {
    const registry = new ResourceKindRegistry();

    expect(() => registry.register(widgetKind({ id: 'Bad Id' }))).toThrow(/Invalid resource kind/);
  });

  it('rejects ids longer than the ledger records', () => {
    const registry = new ResourceKindRegistry();

    expect(() => registry.register(widgetKind({ id: 'a'.repeat(MAX_KIND_ID_LENGTH + 1) }))).toThrow(
      `the most is ${MAX_KIND_ID_LENGTH}`
    );
    expect(() =>
      registry.register(widgetKind({ id: 'a'.repeat(MAX_KIND_ID_LENGTH) }))
    ).not.toThrow();
  });

  it('rejects a registration after the registry is frozen, and keeps the kinds it has', () => {
    const registry = new ResourceKindRegistry();
    registry.register(widgetKind({ id: 'early' }));
    registry.freeze(loggerMock.create());

    expect(() => registry.register(widgetKind({ id: 'late' }))).toThrow(/too late/);
    expect(registry.has('early')).toBe(true);
    expect(registry.has('late')).toBe(false);
  });

  it('accepts ownership without remove for a kind not tied to a space', () => {
    const registry = new ResourceKindRegistry();
    const versions = async () => ({});
    registry.register({ ...widgetKind({ spaces: 'none' }), ownership: { versions } });

    expect(registry.get('widget')?.ownership).toEqual({ versions });
  });

  it('rejects ownership without remove for a kind that lives in one space', () => {
    const registry = new ResourceKindRegistry();

    expect(() =>
      registry.register({ ...widgetKind(), ownership: { versions: async () => ({}) } })
    ).toThrow(/needs `remove` to move a resource to another space/);
  });

  it('rejects a second registration of the same kind', () => {
    const registry = new ResourceKindRegistry();
    registry.register(widgetKind());

    expect(() => registry.register(widgetKind())).toThrow(/already registered/);
  });

  describe('space lookup', () => {
    it('gives the lookup of the kind that looks spaces up', () => {
      const registry = new ResourceKindRegistry();
      const spaceExists = async () => true;
      registry.register(widgetKind());
      registry.register({ ...widgetKind({ id: 'space', spaces: 'none' }), spaceExists });

      expect(registry.getSpaceExists()).toBe(spaceExists);
    });

    it('gives none when no kind looks spaces up', () => {
      const registry = new ResourceKindRegistry();
      registry.register(widgetKind());

      expect(registry.getSpaceExists()).toBeUndefined();
    });

    it('rejects a lookup from a kind tied to a space', () => {
      const registry = new ResourceKindRegistry();

      expect(() => registry.register({ ...widgetKind(), spaceExists: async () => true })).toThrow(
        /must not be tied to a space/
      );
    });

    it('rejects a second kind that looks spaces up, and keeps the first lookup', () => {
      const registry = new ResourceKindRegistry();
      const spaceExists = async () => true;
      registry.register({ ...widgetKind({ id: 'space', spaces: 'none' }), spaceExists });

      expect(() =>
        registry.register({
          ...widgetKind({ id: 'other_space', spaces: 'none' }),
          spaceExists: async () => false,
        })
      ).toThrow(/"space" already does/);
      expect(registry.getSpaceExists()).toBe(spaceExists);
    });
  });

  describe('ordering', () => {
    const orderOf = (registry: ResourceKindRegistry) => registry.getOrdered().map(({ id }) => id);

    it('orders kinds without dependencies by id', () => {
      const registry = new ResourceKindRegistry();
      registry.register(widgetKind({ id: 'b' }));
      registry.register(widgetKind({ id: 'c' }));
      registry.register(widgetKind({ id: 'a' }));

      expect(orderOf(registry)).toEqual(['a', 'b', 'c']);
    });

    it('puts every kind after the kinds it depends on, then orders by id', () => {
      const registry = new ResourceKindRegistry();
      registry.register(widgetKind({ id: 'dashboard', dependsOn: ['data_view', 'saved_search'] }));
      registry.register(widgetKind({ id: 'saved_search', dependsOn: ['data_view'] }));
      registry.register(widgetKind({ id: 'alpha' }));
      registry.register(widgetKind({ id: 'data_view' }));

      expect(orderOf(registry)).toEqual(['alpha', 'data_view', 'saved_search', 'dashboard']);
    });

    it('puts kinds that are not tied to a space before isolated ones', () => {
      const registry = new ResourceKindRegistry();
      registry.register(widgetKind({ id: 'a' }));
      registry.register(widgetKind({ id: 'space', spaces: 'none' }));

      expect(orderOf(registry)).toEqual(['space', 'a']);
    });

    it('freezes with a warning when a kind depends on one that is not registered', () => {
      const logger = loggerMock.create();
      const registry = new ResourceKindRegistry();
      registry.register(widgetKind({ id: 'b', dependsOn: ['missing', 'c'] }));
      registry.register(widgetKind({ id: 'c' }));
      registry.register(widgetKind({ id: 'a' }));

      registry.freeze(logger);

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('"b" depends on "missing", which is not registered')
      );
      // The missing kind drops out of the order; the registered dependency still counts.
      expect(orderOf(registry)).toEqual(['a', 'c', 'b']);
    });

    it('fails to freeze when the dependencies form a cycle', () => {
      const registry = new ResourceKindRegistry();
      registry.register(widgetKind({ id: 'a', dependsOn: ['b'] }));
      registry.register(widgetKind({ id: 'b', dependsOn: ['a'] }));

      expect(() => registry.freeze(loggerMock.create())).toThrow(/"a", "b" cannot be ordered/);
    });

    it('puts shared kinds with isolated ones, after the kinds not tied to a space', () => {
      const registry = new ResourceKindRegistry();
      registry.register(widgetKind({ id: 'b', spaces: 'shared' }));
      registry.register(widgetKind({ id: 'a' }));
      registry.register(widgetKind({ id: 'space', spaces: 'none' }));

      expect(orderOf(registry)).toEqual(['space', 'a', 'b']);
    });

    it('fails to freeze when a kind not tied to a space depends on a shared one', () => {
      const registry = new ResourceKindRegistry();
      registry.register(widgetKind({ id: 'a', spaces: 'shared' }));
      registry.register(widgetKind({ id: 'space', spaces: 'none', dependsOn: ['a'] }));

      expect(() => registry.freeze(loggerMock.create())).toThrow(/"space" is not tied to a space/);
    });

    it('fails to freeze when a kind not tied to a space depends on an isolated one', () => {
      const registry = new ResourceKindRegistry();
      registry.register(widgetKind({ id: 'a' }));
      registry.register(widgetKind({ id: 'space', spaces: 'none', dependsOn: ['a'] }));

      expect(() => registry.freeze(loggerMock.create())).toThrow(/"space" is not tied to a space/);
    });
  });

  describe('ownership', () => {
    const remove = jest.fn(async () => ({ removed: 0, errors: [] }));
    const versions = jest.fn(async () => ({}));

    const trackedKind = () => ({
      ...widgetKind(),
      apply: jest.fn(async () => ({
        applied: 1,
        errors: [{ id: 'bad', message: 'rejected' }],
      })),
      ownership: { remove, versions },
    });

    it('reports only resources that applied without error and were valid', async () => {
      const registry = new ResourceKindRegistry();
      registry.register(trackedKind());

      const [registered] = registry.getOrdered();
      const result = await prepareGroup(
        registered,
        declared({ name: 'good' }, { name: 'bad' }, { name: 7 }),
        prepareOptions
      ).apply(applyParams);

      expect(result.appliedIds).toEqual(['good']);
      expect(registered.ownership?.remove).toBe(remove);
      expect(registered.ownership?.versions).toBe(versions);
    });

    it('reports nothing as applied when an error does not name its resource', async () => {
      const registry = new ResourceKindRegistry();
      registry.register({
        ...trackedKind(),
        apply: jest.fn(async () => ({ applied: 1, errors: [{ message: 'one of them failed' }] })),
      });

      const [registered] = registry.getOrdered();
      const result = await prepareGroup(
        registered,
        declared({ name: 'a' }, { name: 'b' }),
        prepareOptions
      ).apply(applyParams);

      expect(result.appliedIds).toEqual([]);
      expect(result.errors).toEqual([{ message: 'one of them failed' }]);
    });

    it('rejects an id too long for the ledger as permanent, and applies the others', async () => {
      const registry = new ResourceKindRegistry();
      const kind = { ...trackedKind(), apply: widgetKind().apply };
      registry.register(kind);
      const longName = 'a'.repeat(MAX_OWNED_ID_LENGTH + 1);

      const [registered] = registry.getOrdered();
      const prepared = prepareGroup(
        registered,
        declared({ name: 'ok' }, { name: longName }),
        prepareOptions
      );
      const result = await prepared.apply(applyParams);

      expect(prepared.ids).toEqual(['ok']);
      expect(kind.apply).toHaveBeenCalledWith(
        expect.objectContaining({ resources: [{ name: 'ok' }] })
      );
      expect(prepared.invalid).toEqual([
        {
          message: `Invalid widget resource in widgets.widget.json entry 2: the id is ${
            MAX_OWNED_ID_LENGTH + 1
          } characters long; the most is ${MAX_OWNED_ID_LENGTH}`,
        },
      ]);
      expect(result.errors).toEqual([]);
    });

    it('accepts a long id for a kind without ownership, since nothing records it', async () => {
      const registry = new ResourceKindRegistry();
      registry.register(widgetKind());
      const longName = 'a'.repeat(MAX_OWNED_ID_LENGTH + 1);

      const [registered] = registry.getOrdered();
      const prepared = prepareGroup(registered, declared({ name: longName }), prepareOptions);

      expect(prepared.ids).toEqual([longName]);
    });

    it('does not track kinds that do not opt in', async () => {
      const registry = new ResourceKindRegistry();
      registry.register(widgetKind());

      const [registered] = registry.getOrdered();
      const result = await prepareGroup(registered, declared({ name: 'ok' }), prepareOptions).apply(
        applyParams
      );

      expect(result.appliedIds).toEqual(['ok']);
      expect(registered.ownership).toBeUndefined();
    });
  });

  it('validates documents and applies only the valid ones', async () => {
    const registry = new ResourceKindRegistry();
    const kind = widgetKind();
    registry.register(kind);

    const [registered] = registry.getOrdered();
    const prepared = prepareGroup(
      registered,
      declared({ name: 'ok' }, { name: 42 }),
      prepareOptions
    );
    const result = await prepared.apply(applyParams);

    expect(kind.apply).toHaveBeenCalledWith(
      expect.objectContaining({ resources: [{ name: 'ok' }] })
    );
    expect(result.applied).toBe(1);
    expect(result.errors).toEqual([]);
    expect(prepared.invalid).toHaveLength(1);
    expect(prepared.invalid[0].message).toMatch(
      /^Invalid widget resource in widgets\.widget\.json entry 2: /
    );
  });

  it('parses each document once for the plan and the apply', async () => {
    const registry = new ResourceKindRegistry();
    const parse = jest.fn((document: JsonValue) =>
      schema.object({ name: schema.string() }).validate(document)
    );
    registry.register({
      ...widgetKind(),
      parse,
      ownership: {
        remove: jest.fn(async () => ({ removed: 0, errors: [] })),
        versions: jest.fn(async () => ({})),
      },
    });

    const [registered] = registry.getOrdered();
    const prepared = prepareGroup(
      registered,
      declared({ name: 'ok' }, { name: 42 }),
      prepareOptions
    );
    expect([...prepared.hashes.keys()]).toEqual(['ok']);
    const result = await prepared.apply(applyParams);

    expect(parse).toHaveBeenCalledTimes(2);
    expect(prepared.invalid).toHaveLength(1);
    expect(result.appliedIds).toEqual(['ok']);
  });

  describe('an id declared more than once', () => {
    const ownedKind = () => ({
      ...widgetKind(),
      parse: (document: JsonValue) =>
        schema.object({ name: schema.string() }, { unknowns: 'allow' }).validate(document),
      apply: jest.fn(async ({ resources }: { resources: Array<{ name: string }> }) => ({
        applied: resources.length,
        errors: [],
      })),
      ownership: {
        remove: jest.fn(async () => ({ removed: 0, errors: [] })),
        versions: jest.fn(async () => ({})),
      },
    });

    it('applies none of its declarations and reports each as permanent', async () => {
      const registry = new ResourceKindRegistry();
      const kind = ownedKind();
      registry.register(kind);
      const [registered] = registry.getOrdered();

      const prepared = prepareGroup(
        registered,
        declared(
          { name: 'twice', color: 'red' },
          { name: 'once' },
          { name: 'twice', color: 'blue' }
        ),
        prepareOptions
      );
      const result = await prepared.apply(applyParams);

      expect([...prepared.hashes.keys()]).toEqual(['once']);
      expect(kind.apply).toHaveBeenCalledWith(
        expect.objectContaining({ resources: [{ name: 'once' }] })
      );
      expect(prepared.invalid).toEqual([
        {
          id: 'twice',
          message:
            'Invalid widget resource in widgets.widget.json entry 1: the id "twice" is declared in widgets.widget.json entry 1, widgets.widget.json entry 3; declare it once',
        },
        {
          id: 'twice',
          message:
            'Invalid widget resource in widgets.widget.json entry 3: the id "twice" is declared in widgets.widget.json entry 1, widgets.widget.json entry 3; declare it once',
        },
      ]);
      expect(result.errors).toEqual([]);
      expect(result.appliedIds).toEqual(['once']);
    });

    it('is rejected for kinds without ownership too', async () => {
      const registry = new ResourceKindRegistry();
      const kind = widgetKind({ spaces: 'none' });
      registry.register(kind);
      const [registered] = registry.getOrdered();

      const prepared = prepareGroup(
        registered,
        declared({ name: 'same' }, { name: 'other' }, { name: 'same' }),
        prepareOptions
      );
      await prepared.apply(applyParams);

      expect(prepared.ids).toEqual(['other']);
      expect(kind.apply).toHaveBeenCalledWith(
        expect.objectContaining({ resources: [{ name: 'other' }] })
      );
      expect(prepared.invalid).toEqual([
        expect.objectContaining({
          id: 'same',
          message: expect.stringContaining(
            'declared in widgets.widget.json entry 1, widgets.widget.json entry 3'
          ),
        }),
        expect.objectContaining({
          id: 'same',
          message: expect.stringContaining(
            'declared in widgets.widget.json entry 1, widgets.widget.json entry 3'
          ),
        }),
      ]);
    });
  });

  it('hands each apply every valid resource the groups of its kind declare', async () => {
    const registry = new ResourceKindRegistry();
    const kind = widgetKind({ spaces: 'shared' });
    registry.register(kind);
    const [registered] = registry.getOrdered();

    const [teamA] = registered.prepare(
      [
        { declarations: declared({ name: 'a' }, { name: 42 }), spaces: ['team-a'] },
        {
          declarations: declared({ name: 'b' }, { name: 'twice' }, { name: 'twice' }),
          spaces: ['team-b'],
        },
      ],
      { managed: false }
    );
    if (!('documents' in teamA)) {
      throw teamA.error;
    }
    await teamA.documents.apply(applyParams);

    // Neither the invalid document nor an id declared twice is applied, so neither is declared.
    expect(kind.apply).toHaveBeenCalledWith(
      expect.objectContaining({
        resources: [{ name: 'a' }],
        declared: [{ name: 'a' }, { name: 'b' }],
      })
    );
  });

  it('counts the errors the kind marks permanent, and leaves invalid documents to the preparation', async () => {
    const registry = new ResourceKindRegistry();
    registry.register({
      ...widgetKind(),
      apply: jest.fn(async () => ({
        applied: 0,
        errors: [
          { message: 'conflicts with an object only a person can change', permanent: true },
          { message: 'elasticsearch is down' },
        ],
      })),
    });
    const [registered] = registry.getOrdered();

    const prepared = prepareGroup(
      registered,
      declared({ name: 'a' }, { name: 'b' }, { name: 42 }),
      prepareOptions
    );
    const result = await prepared.apply(applyParams);

    expect(result.errors).toHaveLength(2);
    expect(result.permanent).toBe(1);
    expect(prepared.invalid).toHaveLength(1);
  });

  describe('planning', () => {
    const plannedKind = () => ({
      ...widgetKind(),
      // Accepts other fields, so the hash can be shown to cover all of them.
      parse: (document: JsonValue) =>
        schema.object({ name: schema.string() }, { unknowns: 'allow' }).validate(document),
      apply: jest.fn(async () => ({ applied: 1, errors: [] })),
      ownership: {
        remove: jest.fn(async () => ({ removed: 0, errors: [] })),
        versions: jest.fn(async () => ({})),
      },
    });
    const prepareOne = (
      document: JsonValue,
      managed = false,
      spaces = ['default'],
      supportsManaged = true
    ) => {
      const registry = new ResourceKindRegistry();
      registry.register({ ...plannedKind(), supportsManaged });
      const [registered] = registry.getOrdered();
      return prepareGroup(registered, declared(document), { managed, spaces });
    };

    it('hashes each declaration by content, whatever the order of its keys', () => {
      const { hashes } = prepareOne({ name: 'a', color: 'red' });

      expect(hashes.get('a')).toMatch(/^[0-9a-f]{64}$/);
      expect(prepareOne({ color: 'red', name: 'a' }).hashes.get('a')).toBe(hashes.get('a'));
      expect(prepareOne({ name: 'a', color: 'blue' }).hashes.get('a')).not.toBe(hashes.get('a'));
    });

    it('changes the hash when the managed setting changes, so the resource is written again', () => {
      expect(prepareOne({ name: 'a' }, true).hashes.get('a')).not.toBe(
        prepareOne({ name: 'a' }, false).hashes.get('a')
      );
    });

    it('keeps the hash when the managed setting changes for a kind that does not support it', () => {
      const spaces = ['default'];
      expect(prepareOne({ name: 'a' }, true, spaces, false).hashes.get('a')).toBe(
        prepareOne({ name: 'a' }, false, spaces, false).hashes.get('a')
      );
    });

    it('changes the hash when the spaces change, so the resource is moved into them', () => {
      expect(prepareOne({ name: 'a' }, false, ['team-a', 'team-b']).hashes.get('a')).not.toBe(
        prepareOne({ name: 'a' }, false, ['team-a']).hashes.get('a')
      );
    });

    it('keeps the hash when a declaration moves to another file, so it is not written again', () => {
      const registry = new ResourceKindRegistry();
      registry.register(plannedKind());
      const [registered] = registry.getOrdered();
      const hashIn = (source: string) =>
        prepareGroup(registered, [{ source, body: { name: 'a' } }], prepareOptions).hashes.get('a');

      expect(hashIn('one.widget.json entry 1')).toBe(hashIn('two.widget.json entry 7'));
    });

    it('passes the spaces of the group on to the kind', async () => {
      const registry = new ResourceKindRegistry();
      const kind = plannedKind();
      registry.register(kind);
      const [registered] = registry.getOrdered();

      await prepareGroup(registered, declared({ name: 'a' }), {
        managed: true,
        spaces: ['team-a', 'team-b'],
      }).apply(applyParams);

      expect(kind.apply).toHaveBeenCalledWith(
        expect.objectContaining({ spaces: ['team-a', 'team-b'], managed: true })
      );
    });

    it('does not hash kinds that do not track ownership', () => {
      const registry = new ResourceKindRegistry();
      registry.register(widgetKind());
      const [registered] = registry.getOrdered();

      expect(prepareGroup(registered, declared({ name: 'a' }), prepareOptions).hashes.size).toBe(0);
    });

    it('writes only the ids it is given, and reports only those as applied', async () => {
      const registry = new ResourceKindRegistry();
      const kind = plannedKind();
      registry.register(kind);
      const [registered] = registry.getOrdered();

      const result = await prepareGroup(
        registered,
        declared({ name: 'same' }, { name: 'new' }),
        prepareOptions
      ).apply({ ...applyParams, only: new Set(['new']) });

      expect(kind.apply).toHaveBeenCalledWith(
        expect.objectContaining({ resources: [{ name: 'new' }] })
      );
      expect(result.appliedIds).toEqual(['new']);
    });

    it('does not call the kind when there is nothing to write', async () => {
      const registry = new ResourceKindRegistry();
      const kind = plannedKind();
      registry.register(kind);
      const [registered] = registry.getOrdered();

      const result = await prepareGroup(
        registered,
        declared({ name: 'same' }, { name: 42 }),
        prepareOptions
      ).apply({ ...applyParams, only: new Set() });

      expect(kind.apply).not.toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({ applied: 0, appliedIds: [], errors: [], permanent: 0 })
      );
    });
  });
});
