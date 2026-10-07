/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { hostEntityDefinition } from '../../../../common/domain/definitions/host';
import { userEntityDefinition } from '../../../../common/domain/definitions/user';
import { serviceEntityDefinition } from '../../../../common/domain/definitions/service';
import { genericEntityDefinition } from '../../../../common/domain/definitions/generic';
import {
  EntityDefinitionRegistry,
  ENTITY_DEFINITION_TYPE_PATTERN,
  type RegistrableEntityDefinition,
  type RegisterResult,
} from '.';

const makeDefinition = (
  type: string,
  overrides: Partial<RegistrableEntityDefinition> = {}
): RegistrableEntityDefinition => ({
  type,
  name: `Test '${type}' definition`,
  fields: [
    {
      source: `${type}.name`,
      destination: `${type}.name`,
      retention: { operation: 'prefer_newest_value' },
    },
  ],
  identityField: { singleField: `${type}.name` },
  indexPatterns: ['logs-*'],
  managedBy: { kind: 'plugin', id: 'testPlugin' },
  ...overrides,
});

const types = (definitions: ReadonlyArray<{ type: string }>): string[] =>
  definitions.map(({ type }) => type);

describe('EntityDefinitionRegistry', () => {
  let logger: MockedLogger;
  let registry: EntityDefinitionRegistry;

  beforeEach(() => {
    logger = loggerMock.create();
    registry = new EntityDefinitionRegistry(logger);
  });

  it('registers a valid definition', () => {
    const result = registry.register(makeDefinition('k8s.pod'));

    expect(result).toEqual({ ok: true });
    expect(registry.get('k8s.pod')?.name).toBe(`Test 'k8s.pod' definition`);
    expect(registry.get('k8s.pod')?.managedBy).toEqual({ kind: 'plugin', id: 'testPlugin' });
    expect(registry.rejected()).toEqual([]);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('returns undefined for an unknown type', () => {
    expect(registry.get('unknown')).toBeUndefined();
  });

  describe('validation', () => {
    const expectRejected = (type: string, reasonPattern: RegExp) => {
      expect(types(registry.list())).not.toContain(type);
      const [rejection] = registry.rejected().slice(-1);
      expect(rejection.type).toBe(type);
      expect(rejection.reason).toMatch(reasonPattern);
      expect(logger.error).toHaveBeenLastCalledWith(
        expect.stringContaining(`Rejected entity definition '${type}'`)
      );
    };

    it('rejects a definition that fails the schema', () => {
      const definition = makeDefinition('bad_schema', {
        indexPatterns: 'logs-*' as unknown as string[],
      });

      const result = registry.register(definition);

      expect(result.ok).toBe(false);
      expectRejected('bad_schema', /failed schema validation: indexPatterns/);
    });

    // `"` and `\` would break the double-quoted `<type>:` prefix the id compiler emits verbatim
    // into ES|QL and Painless string literals, so the pattern must keep rejecting them. `'` is
    // included for symmetry; it is simply outside the allowed character set.
    it.each([
      'Host',
      '1host',
      'host..pod',
      'host-',
      '_host',
      'host pod',
      'hôst',
      '',
      'a"b',
      'a\\b',
      "a'b",
    ])('rejects type name %p that does not match the pattern', (type) => {
      expect(registry.register(makeDefinition(type)).ok).toBe(false);
      expectRejected(type, /does not match pattern/);
    });

    it.each(['a', 'k8s.pod', 'aws_s3-bucket', 'a1.b2_c3-d4'])('accepts type name %p', (type) => {
      expect(ENTITY_DEFINITION_TYPE_PATTERN.test(type)).toBe(true);
      expect(registry.register(makeDefinition(type))).toEqual({ ok: true });
    });

    it('enforces the maximum type name length', () => {
      const atLimit = 'a'.repeat(64);
      const overLimit = 'a'.repeat(65);

      expect(registry.register(makeDefinition(atLimit))).toEqual({ ok: true });
      expect(registry.register(makeDefinition(overLimit)).ok).toBe(false);
      expectRejected(overLimit, /exceeds the maximum length of 64/);
    });

    it('rejects a definition with a circular reference without throwing or freezing it', () => {
      const mapping: Record<string, unknown> = { type: 'keyword' };
      mapping.self = mapping;
      const definition = makeDefinition('cyclic');
      definition.fields = [{ ...definition.fields[0], mapping }];

      let result: RegisterResult | undefined;
      expect(() => {
        result = registry.register(definition);
      }).not.toThrow();

      expect(result).toEqual({
        ok: false,
        reason: expect.stringContaining("circular reference at 'fields.0.mapping.self'"),
      });
      expect(registry.get('cyclic')).toBeUndefined();
      expect(Object.isFrozen(definition)).toBe(false);
      expect(Object.isFrozen(mapping)).toBe(false);
    });

    it('accepts the same object referenced from two places and freezes it once', () => {
      const shared = { type: 'keyword' };
      const definition = makeDefinition('shared');
      definition.fields = [
        { ...definition.fields[0], mapping: shared },
        { ...definition.fields[0], destination: 'other.field', mapping: shared },
      ];

      expect(registry.register(definition).ok).toBe(true);
      expect(Object.isFrozen(shared)).toBe(true);
    });

    it('turns an unexpected exception during validation into a rejection', () => {
      const definition = makeDefinition('throws');
      Object.defineProperty(definition, 'fields', {
        enumerable: true,
        get: () => {
          throw new Error('boom');
        },
      });

      let result: RegisterResult | undefined;
      expect(() => {
        result = registry.register(definition);
      }).not.toThrow();
      expect(result).toEqual({
        ok: false,
        reason: 'unexpected error during registration: boom',
      });
    });

    it('rejects a definition whose type and managedBy getters throw, without throwing', () => {
      const definition = makeDefinition('throwing_accessors');
      for (const key of ['type', 'managedBy'] as const) {
        Object.defineProperty(definition, key, {
          enumerable: true,
          get: () => {
            throw new Error(`${key} getter`);
          },
        });
      }

      let result: RegisterResult | undefined;
      expect(() => {
        result = registry.register(definition);
      }).not.toThrow();
      expect(result).toEqual({
        ok: false,
        reason: 'unexpected error during registration: type getter',
      });
      expect(registry.rejected()).toEqual([
        { type: '<unreadable>', reason: 'unexpected error during registration: type getter' },
      ]);
    });

    it('names the managing plugin in the rejection log', () => {
      registry.register(makeDefinition('host'));
      registry.register(makeDefinition('host'));

      expect(logger.error).toHaveBeenLastCalledWith(
        expect.stringMatching(/^Rejected entity definition 'host' \(plugin [^)]+\): /)
      );
    });

    it('rejects a duplicate type name and keeps the first definition', () => {
      registry.register(makeDefinition('dup', { name: 'first' }));

      const result = registry.register(makeDefinition('dup', { name: 'second' }));

      expect(result).toEqual({ ok: false, reason: 'type name is already registered' });
      expect(registry.get('dup')?.name).toBe('first');
      expect(registry.list()).toHaveLength(1);
      expect(registry.rejected()).toEqual([
        { type: 'dup', reason: 'type name is already registered' },
      ]);
    });

    it.each([
      [{ kind: 'integration', package: 'aws' }],
      [{ kind: 'user', id: 'u_123' }],
      [{ kind: 'user' }],
    ] as const)('rejects a non-plugin managedBy %p at setup', (managedBy) => {
      expect(registry.register(makeDefinition('not_plugin', { managedBy }))).toEqual({
        ok: false,
        reason: 'only plugin-managed definitions can be registered at setup',
      });
      expectRejected('not_plugin', /only plugin-managed definitions/);
    });

    it('rejects a definition missing managedBy', () => {
      const withoutManagedBy: Partial<RegistrableEntityDefinition> = makeDefinition('unmanaged');
      delete withoutManagedBy.managedBy;

      const result = registry.register(withoutManagedBy as RegistrableEntityDefinition);

      expect(result.ok).toBe(false);
      expectRejected('unmanaged', /failed schema validation: managedBy/);
    });

    it('rejects an unknown managedBy kind and over-long managedBy strings', () => {
      const unknownKind = makeDefinition('unknown_kind', {
        managedBy: { kind: 'space' } as unknown as RegistrableEntityDefinition['managedBy'],
      });
      const longId = makeDefinition('long_id', {
        managedBy: { kind: 'plugin', id: 'a'.repeat(257) },
      });

      expect(registry.register(unknownKind).ok).toBe(false);
      expectRejected('unknown_kind', /failed schema validation: managedBy/);
      expect(registry.register(longId).ok).toBe(false);
      expectRejected('long_id', /failed schema validation: managedBy\.id/);
    });

    it.each([
      [null, '<null>'],
      [undefined, '<undefined>'],
      ['not a definition', 'not a definition'],
    ])('rejects non-object input %p without throwing', (input, type) => {
      const invalid = input as unknown as RegistrableEntityDefinition;

      let result: RegisterResult | undefined;
      expect(() => {
        result = registry.register(invalid);
      }).not.toThrow();

      expect(result).toEqual({ ok: false, reason: 'definition is not an object' });
      expect(registry.rejected()).toEqual([{ type, reason: 'definition is not an object' }]);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    it('rejects unknown keys, including a stale id', () => {
      const withId = { ...makeDefinition('with_id'), id: 'stale' };
      const withExtra = { ...makeDefinition('with_extra'), extra: true };

      expect(registry.register(withId).ok).toBe(false);
      expectRejected('with_id', /failed schema validation: .*id/);
      expect(registry.register(withExtra).ok).toBe(false);
      expectRejected('with_extra', /failed schema validation: .*extra/);
    });
  });

  describe('closeSetupRegistration', () => {
    it('rejects code registrations after setup has closed', () => {
      registry.register(makeDefinition('before'));
      registry.closeSetupRegistration();

      expect(registry.register(makeDefinition('after')).ok).toBe(false);

      expect(types(registry.list())).toEqual(['before']);
      expect(registry.rejected()).toEqual([
        { type: 'after', reason: expect.stringContaining('setup has finished') },
      ]);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('ordering', () => {
    it('lists definitions in registration order', () => {
      ['zeta', 'generic', 'alpha', 'host', 'middle'].forEach((type) =>
        registry.register(makeDefinition(type))
      );

      expect(types(registry.list())).toEqual(['zeta', 'generic', 'alpha', 'host', 'middle']);
    });
  });

  describe('immutability', () => {
    it('returns the registered reference, frozen in place', () => {
      const input = makeDefinition('stable');
      registry.register(input);

      const fromGet = registry.get('stable');
      const [fromList] = registry.list();

      expect(fromGet).toBe(input);
      expect(fromList).toBe(input);
      expect(Object.isFrozen(input)).toBe(true);
      expect(Object.isFrozen(input.fields[0])).toBe(true);
    });

    it('freezes nested values of a definition frozen only at the top level', () => {
      const input = Object.freeze(makeDefinition('top_frozen'));
      registry.register(input);

      expect(Object.isFrozen(input.fields)).toBe(true);
      expect(Object.isFrozen(input.fields[0])).toBe(true);
      expect(Object.isFrozen(input.indexPatterns)).toBe(true);
    });

    it('prevents mutation of returned definitions, including nested values', () => {
      registry.register(makeDefinition('locked'));
      const definition = registry.get('locked') as RegistrableEntityDefinition;

      expect(() => {
        definition.name = 'changed';
      }).toThrow(TypeError);
      expect(() => {
        definition.indexPatterns.push('other-*');
      }).toThrow(TypeError);
      expect(() => {
        definition.fields[0].source = 'changed';
      }).toThrow(TypeError);
      expect(registry.get('locked')).toEqual(makeDefinition('locked'));
    });

    it('prevents the owner from mutating the registered input', () => {
      const input = makeDefinition('input');
      registry.register(input);

      expect(() => {
        input.name = 'changed';
      }).toThrow(TypeError);
      expect(registry.get('input')).toEqual(makeDefinition('input'));
    });

    it('does not freeze a rejected definition', () => {
      const input = makeDefinition('Bad');
      registry.register(input);

      expect(Object.isFrozen(input)).toBe(false);
    });

    it('does not let callers mutate the rejection list', () => {
      registry.register(makeDefinition('Bad'));
      registry.rejected().pop();

      expect(registry.rejected()).toHaveLength(1);
    });
  });

  describe('built-in definitions', () => {
    const builtIns = [
      userEntityDefinition,
      hostEntityDefinition,
      serviceEntityDefinition,
      genericEntityDefinition,
    ];

    it('registers all four built-ins and lists them', () => {
      const results = builtIns.map((definition) => registry.register(definition));

      expect(results).toEqual(builtIns.map(() => ({ ok: true })));
      expect(registry.rejected()).toEqual([]);
      expect(types(registry.list())).toEqual(['user', 'host', 'service', 'generic']);
      expect(registry.get('host')).toBe(hostEntityDefinition);
      expect(Object.isFrozen(hostEntityDefinition)).toBe(true);
    });

    it('lists the built-ins first when they are registered first', () => {
      builtIns.forEach((definition) => registry.register(definition));
      registry.register(makeDefinition('k8s.pod'));

      expect(types(registry.list())).toEqual(['user', 'host', 'service', 'generic', 'k8s.pod']);
    });

    it('returns managedBy on each built-in', () => {
      builtIns.forEach((definition) => registry.register(definition));

      builtIns.forEach(({ type }) => {
        expect(registry.get(type)?.managedBy).toEqual({ kind: 'plugin', id: 'entityStore' });
      });
    });

    it('rejects a second registration of a built-in name', () => {
      registry.register(hostEntityDefinition);

      expect(registry.register(makeDefinition('host'))).toEqual({
        ok: false,
        reason: 'type name is already registered',
      });
      expect(registry.get('host')).toBe(hostEntityDefinition);
    });
  });
});
