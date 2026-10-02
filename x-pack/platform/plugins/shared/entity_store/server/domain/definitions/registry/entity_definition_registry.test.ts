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

    it('rejects an unknown materialization value', () => {
      const definition = makeDefinition('bad_materialization', {
        materialization: 'virtual' as unknown as 'extracted',
      });

      expect(registry.register(definition).ok).toBe(false);
      expectRejected('bad_materialization', /failed schema validation: materialization/);
    });

    it.each(['Host', '1host', 'host..pod', 'host-', '_host', 'host pod', 'hôst', ''])(
      'rejects type name %p that does not match the pattern',
      (type) => {
        expect(registry.register(makeDefinition(type)).ok).toBe(false);
        expectRejected(type, /does not match pattern/);
      }
    );

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

    it.each(['user', 'host', 'service', 'generic'])(
      'reserves built-in name %p for registerBuiltIn',
      (type) => {
        expect(registry.register(makeDefinition(type))).toEqual({
          ok: false,
          reason: 'type name is reserved for built-in definitions',
        });
        expectRejected(type, /reserved for built-in/);

        expect(registry.registerBuiltIn(makeDefinition(type))).toEqual({ ok: true });
        expect(registry.get(type)).toBeDefined();
      }
    );

    it('rejects a duplicate built-in registration', () => {
      registry.registerBuiltIn(makeDefinition('host'));

      expect(registry.registerBuiltIn(makeDefinition('host'))).toEqual({
        ok: false,
        reason: 'type name is already registered',
      });
      expect(types(registry.list())).toEqual(['host']);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    it('rejects registerBuiltIn for a non-built-in type name', () => {
      expect(registry.registerBuiltIn(makeDefinition('k8s.pod'))).toEqual({
        ok: false,
        reason: 'type name is not a built-in',
      });
      expectRejected('k8s.pod', /not a built-in/);
    });

    it('never throws, even for a non-object definition', () => {
      const invalid = 'not a definition' as unknown as RegistrableEntityDefinition;

      expect(() => registry.register(invalid)).not.toThrow();
      expect(registry.rejected()).toEqual([
        { type: '<undefined>', reason: expect.stringContaining('failed schema validation') },
      ]);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('freeze', () => {
    it('rejects register and registerBuiltIn after freezing', () => {
      registry.register(makeDefinition('before'));
      registry.freeze();

      expect(registry.register(makeDefinition('after')).ok).toBe(false);
      expect(registry.registerBuiltIn(makeDefinition('host')).ok).toBe(false);

      expect(types(registry.list())).toEqual(['before']);
      expect(registry.rejected()).toEqual([
        { type: 'after', reason: expect.stringContaining('frozen') },
        { type: 'host', reason: expect.stringContaining('frozen') },
      ]);
      expect(logger.error).toHaveBeenCalledTimes(2);
    });
  });

  describe('ordering', () => {
    it('lists built-ins first in fixed order, then others in registration order', () => {
      registry.register(makeDefinition('zeta'));
      registry.registerBuiltIn(makeDefinition('generic'));
      registry.register(makeDefinition('alpha'));
      registry.registerBuiltIn(makeDefinition('host'));
      registry.registerBuiltIn(makeDefinition('service'));
      registry.register(makeDefinition('middle'));
      registry.registerBuiltIn(makeDefinition('user'));

      expect(types(registry.list())).toEqual([
        'user',
        'host',
        'service',
        'generic',
        'zeta',
        'alpha',
        'middle',
      ]);
    });

    it('filters listMaterialized to extracted definitions, preserving order', () => {
      registry.register(makeDefinition('not_extracted'));
      registry.register(makeDefinition('extracted_custom', { materialization: 'extracted' }));
      registry.registerBuiltIn(makeDefinition('service'));
      registry.registerBuiltIn(makeDefinition('host', { materialization: 'extracted' }));

      expect(types(registry.list())).toEqual([
        'host',
        'service',
        'not_extracted',
        'extracted_custom',
      ]);
      expect(types(registry.listMaterialized())).toEqual(['host', 'extracted_custom']);
    });

    it('treats a definition without materialization as not extracted', () => {
      registry.register(makeDefinition('plain'));

      expect(registry.get('plain')?.materialization).toBeUndefined();
      expect(registry.listMaterialized()).toEqual([]);
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
    it('registers all four built-ins and lists them as materialized', () => {
      const builtIns = [
        hostEntityDefinition,
        genericEntityDefinition,
        userEntityDefinition,
        serviceEntityDefinition,
      ];

      const results = builtIns.map((definition) => registry.registerBuiltIn(definition));

      expect(results).toEqual(builtIns.map(() => ({ ok: true })));
      expect(registry.rejected()).toEqual([]);
      expect(types(registry.listMaterialized())).toEqual(['user', 'host', 'service', 'generic']);
      expect(registry.get('host')).toBe(hostEntityDefinition);
      expect(Object.isFrozen(hostEntityDefinition)).toBe(true);
    });
  });
});
