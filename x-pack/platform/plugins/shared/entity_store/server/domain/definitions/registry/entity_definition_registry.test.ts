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
import type { ExtractionBlock } from '../../../../common/domain/definitions/entity_schema';
import {
  DYNAMIC_DEFINITION_FIXTURES,
  hostDynamicFixture,
  k8sPodDynamicFixture,
  userShapedDynamicFixture,
} from '../../../../common/domain/definitions/dynamic/__fixtures__/dynamic_definition_fixtures';
import {
  NO_IDENTITY_ATTRIBUTE_RULE,
  SERVABLE_IDENTITY_RULE,
} from '../../../../common/domain/definitions/dynamic/dynamic_definition_rules';
import {
  EntityDefinitionRegistry,
  ENTITY_DEFINITION_TYPE_PATTERN,
  type RegistrableEntityDefinition,
  type RegisterResult,
} from '.';

type TestDefinition = RegistrableEntityDefinition & { extraction: ExtractionBlock };

const makeDefinition = (
  type: string,
  overrides: Partial<RegistrableEntityDefinition> = {}
): TestDefinition => ({
  type,
  name: `Test '${type}' definition`,
  identityField: { singleField: `${type}.name` },
  managedBy: { kind: 'plugin', id: 'testPlugin' },
  extraction: {
    fields: [
      {
        source: `${type}.name`,
        destination: `${type}.name`,
        retention: { operation: 'prefer_newest_value' },
      },
    ],
  },
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
        extraction: { fields: 'host.name' as unknown as ExtractionBlock['fields'] },
      });

      const result = registry.register(definition);

      expect(result.ok).toBe(false);
      expectRejected('bad_schema', /failed schema validation: extraction\.fields/);
    });

    // The two identity variants are told apart at runtime by key presence (`isSingleFieldIdentity`),
    // and the registry keeps the object it was given, not the parsed copy. An identity carrying
    // keys of both variants must be rejected outright: if the schema merely stripped the stray
    // keys, the EUID helpers would read a `singleField` that was never validated.
    describe('mixed identity variants', () => {
      const ranking = { branches: [{ ranking: [[{ field: 'mixed.id' }]] }] };

      it('rejects a calculated identity that also carries a single field', () => {
        const { identityField } = hostEntityDefinition;
        const result = registry.register({
          ...hostEntityDefinition,
          identityField: { ...identityField, singleField: 'host.*' },
        });

        expect(result.ok).toBe(false);
        expectRejected('host', /failed schema validation: identityField/);
      });

      it('rejects a single-field identity that also carries a ranking', () => {
        const result = registry.register(
          makeDefinition('mixed', {
            identityField: { singleField: 'mixed.name', euidRanking: ranking },
          })
        );

        expect(result.ok).toBe(false);
        expectRejected('mixed', /failed schema validation: identityField/);
      });

      it('rejects an unknown key inside identityField', () => {
        const result = registry.register(
          makeDefinition('typo', {
            identityField: {
              singleField: 'typo.name',
              skipTypePrepend: true,
              skipTypePrefix: true,
            },
          } as unknown as Partial<RegistrableEntityDefinition>)
        );

        expect(result.ok).toBe(false);
        expectRejected('typo', /failed schema validation: identityField/);
      });
    });

    it('accepts a definition with only the identity core', () => {
      const { extraction, ...coreOnly } = makeDefinition('core_only');

      expect(registry.register(coreOnly)).toEqual({ ok: true });
      expect(registry.get('core_only')?.extraction).toBeUndefined();
    });

    it.each(['indexPatterns', 'filter'])('rejects the removed top-level key %p', (key) => {
      const definition = { ...makeDefinition('removed_key'), [key]: [] };

      expect(registry.register(definition).ok).toBe(false);
      expectRejected('removed_key', new RegExp(`failed schema validation: .*${key}`));
    });

    it('rejects unknown keys in the extraction block', () => {
      const base = makeDefinition('extra_extraction_key');
      const definition = { ...base, extraction: { ...base.extraction, indexPatterns: [] } };

      expect(registry.register(definition).ok).toBe(false);
      expectRejected('extra_extraction_key', /failed schema validation: extraction.*indexPatterns/);
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
      definition.extraction.fields = [{ ...definition.extraction.fields[0], mapping }];

      let result: RegisterResult | undefined;
      expect(() => {
        result = registry.register(definition);
      }).not.toThrow();

      expect(result).toEqual({
        ok: false,
        reason: expect.stringContaining("circular reference at 'extraction.fields.0.mapping.self'"),
      });
      expect(registry.get('cyclic')).toBeUndefined();
      expect(Object.isFrozen(definition)).toBe(false);
      expect(Object.isFrozen(mapping)).toBe(false);
    });

    it('accepts the same object referenced from two places and freezes it once', () => {
      const shared = { type: 'keyword' };
      const definition = makeDefinition('shared');
      definition.extraction.fields = [
        { ...definition.extraction.fields[0], mapping: shared },
        { ...definition.extraction.fields[0], destination: 'other.field', mapping: shared },
      ];

      expect(registry.register(definition).ok).toBe(true);
      expect(Object.isFrozen(shared)).toBe(true);
    });

    it('turns an unexpected exception during validation into a rejection', () => {
      const definition = makeDefinition('throws');
      Object.defineProperty(definition.extraction, 'fields', {
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
      expect(Object.isFrozen(input.extraction.fields[0])).toBe(true);
    });

    it('freezes nested values of a definition frozen only at the top level', () => {
      const input = Object.freeze(makeDefinition('top_frozen'));
      registry.register(input);

      expect(Object.isFrozen(input.extraction)).toBe(true);
      expect(Object.isFrozen(input.extraction.fields)).toBe(true);
      expect(Object.isFrozen(input.extraction.fields[0])).toBe(true);
    });

    it('prevents mutation of returned definitions, including nested values', () => {
      registry.register(makeDefinition('locked'));
      const definition = registry.get('locked') as TestDefinition;

      expect(() => {
        definition.name = 'changed';
      }).toThrow(TypeError);
      expect(() => {
        definition.extraction.fields.push(definition.extraction.fields[0]);
      }).toThrow(TypeError);
      expect(() => {
        definition.extraction.fields[0].source = 'changed';
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
  // The registry parses with a schema derived from the unrefined object shape, so these prove the
  // whole-definition rules are applied there too and not only by `entitySchema`.
  describe('dynamic definitions', () => {
    it.each(DYNAMIC_DEFINITION_FIXTURES.map((definition) => [definition.type, definition]))(
      'registers the %s fixture',
      (type, definition) => {
        expect(registry.register(definition)).toEqual({ ok: true });
        expect(registry.get(type)?.dynamic).toEqual(definition.dynamic);
        expect(registry.rejected()).toEqual([]);
      }
    );

    it('rejects the user-shaped definition with the servable identity rule', () => {
      const result = registry.register(userShapedDynamicFixture);

      expect(result.ok).toBe(false);
      expect(result.ok === false && result.reason).toContain(
        `identityField.euidRanking.branches: ${SERVABLE_IDENTITY_RULE}:`
      );
      expect(registry.get('user')).toBeUndefined();
    });

    it('rejects a documentsFilter that is not the derived presence filter', () => {
      const { identityField } = hostDynamicFixture;
      const result = registry.register({
        ...hostDynamicFixture,
        identityField: {
          ...identityField,
          documentsFilter: { field: 'host.id', exists: true },
        },
      });

      expect(result.ok === false && result.reason).toContain(
        `identityField.documentsFilter: ${SERVABLE_IDENTITY_RULE}:`
      );
    });

    it('rejects an identity carrying both variants rather than validating only the ranking', () => {
      // `host.*` is not a literal field path, so the servable identity rule would reject it as a
      // `singleField`; it must not slip past the rule by riding on a valid ranking.
      const { identityField } = hostDynamicFixture;
      const result = registry.register({
        ...hostDynamicFixture,
        identityField: { ...identityField, singleField: 'host.*' },
      });

      expect(result.ok).toBe(false);
      expect(result.ok === false && result.reason).toContain('identityField');
      expect(registry.get('host')).toBeUndefined();
    });

    it('rejects an attribute that reads the identity field', () => {
      const [source] = k8sPodDynamicFixture.dynamic?.sources ?? [];
      const result = registry.register({
        ...k8sPodDynamicFixture,
        dynamic: { sources: [{ ...source, attributes: [{ name: 'uid', field: 'k8s.pod.uid' }] }] },
      });

      expect(result.ok === false && result.reason).toContain(
        `dynamic.sources.0.attributes.0.field: ${NO_IDENTITY_ATTRIBUTE_RULE}:`
      );
    });

    it('still rejects unknown keys alongside a dynamic block', () => {
      const withStaleId = {
        ...k8sPodDynamicFixture,
        id: 'k8s.pod-default',
      } as unknown as RegistrableEntityDefinition;

      expect(registry.register(withStaleId).ok).toBe(false);
    });

    it('registers the built-ins', () => {
      const builtIns: RegistrableEntityDefinition[] = [
        userEntityDefinition,
        hostEntityDefinition,
        serviceEntityDefinition,
        genericEntityDefinition,
      ];

      builtIns.forEach((definition) => {
        expect(registry.register(definition)).toEqual({ ok: true });
      });
    });
  });
});
