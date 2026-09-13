/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Characterization tests for builder_resolution.ts.
 *
 * These tests pin the behavior of `resolveCreateRuleBuilder` and
 * `resolveUpdateRuleBuilder` as they stand before later phases change them.
 * They are the safety net for every subsequent edit.  They deliberately do
 * NOT fix bugs — they pin buggy behavior when it exists, with a comment
 * naming the bug.
 *
 * `resolveCreateRuleBuilder` is used by:
 *   - createRule  (create path)
 *   - resolveReplaceRuleBuilder (which delegates to it after its own guard)
 *
 * `resolveUpdateRuleBuilder` is used by:
 *   - updateRule  (PATCH path)
 *
 * `resolveReplaceRuleBuilder` is used by:
 *   - upsertRule's "replace" branch (PUT path)
 *
 * Step 5.4 introduced `resolveReplaceRuleBuilder` and deliberately changed the
 * characterisation: the PUT path no longer calls `resolveCreateRuleBuilder`
 * directly, so tests that implicitly relied on the create path's permissiveness
 * on PUT have been migrated to the new `resolveReplaceRuleBuilder` suite.
 *
 * Mocking strategy: BuilderTypeRegistry is given a minimal jest mock because
 * the resolution functions need only `generate()`.  Registry-level validation
 * (bounded schema, duplicate registration) is covered separately in the
 * builder_type_registry tests.
 */

import type { CreateRuleData, ReplaceRuleData, UpdateRuleData } from '@kbn/alerting-v2-schemas';
import { z } from '@kbn/zod/v4';
import type { RuleSavedObjectAttributes } from '../../saved_objects';
import type {
  BuilderTypeRegistry,
  DerivedRuleFields,
  GeneratedQuery,
  RegisteredBuilderType,
} from '../builder_types';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';
import { createRuleSoAttributes } from '../test_utils';
import {
  resolveCreateRuleBuilder,
  resolveReplaceRuleBuilder,
  resolveUpdateRuleBuilder,
} from './builder_resolution';

// ---------------------------------------------------------------------------
// Registry mock
// ---------------------------------------------------------------------------

/**
 * Creates a minimal BuilderTypeRegistry mock for write-time (default)
 * builder types. Only `generate` and `get` are consulted by the resolution
 * functions under test. `get()` returns `undefined` by default, so the
 * resolution falls through to the write-time path.
 */
function createMockRegistry(generateFn: jest.Mock = jest.fn()): BuilderTypeRegistry {
  return {
    generate: generateFn,
    get: (_type: string) => undefined,
  } as unknown as BuilderTypeRegistry;
}

/**
 * Creates a registry mock where specific types are registered by the caller.
 * Used for execution-time type tests where `get()` must return a definition.
 */
function createMockRegistryWithTypes(
  typeMap: Map<string, Partial<RegisteredBuilderType>>,
  generateFn: jest.Mock = jest.fn()
): BuilderTypeRegistry {
  return {
    generate: generateFn,
    get: (type: string) => typeMap.get(type) as RegisteredBuilderType | undefined,
  } as unknown as BuilderTypeRegistry;
}

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const BUILDER_TYPE = 'test.builder';
const OTHER_BUILDER_TYPE = 'test.other-builder';
const RULE_ID = 'rule-abc-123';

/**
 * Raw fields as they arrive in the request body.  These are intentionally
 * NOT a parsed/transformed copy — the raw-persistence tests rely on object
 * identity.
 */
const RAW_FIELDS: Record<string, unknown> = { query: 'host.name: *', threshold: 5 };

// Minimal CreateRuleData for the plain (non-builder) path.
const baseCreateData = {
  kind: 'alert',
  metadata: { name: 'test-rule' },
  time_field: '@timestamp',
  schedule: { every: '5m' },
  query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 10' } },
} as CreateRuleData;

// CreateRuleData that carries builder fields instead of a query.
const builderCreateData = {
  kind: 'alert',
  metadata: { name: 'test-rule', builder_type: BUILDER_TYPE, builder_fields: RAW_FIELDS },
  time_field: '@timestamp',
  schedule: { every: '5m' },
} as unknown as CreateRuleData;

// Signal-kind variant of builderCreateData.
const signalBuilderCreateData = {
  ...builderCreateData,
  kind: 'signal',
} as unknown as CreateRuleData;

// ---------------------------------------------------------------------------
// Managed/unmanaged fixture builder types (for BUILDER_TYPE_IS_MANAGED tests)
// ---------------------------------------------------------------------------

/**
 * A fixture managed builder type. Its registration declares `ownership` so
 * the registry check treats it as managed.
 */
const MANAGED_BUILDER_TYPE = 'test.managed';
const UNMANAGED_EXPLICIT_BUILDER_TYPE = 'test.unmanaged-explicit';

const managedTypeDefinition: Partial<RegisteredBuilderType> = {
  type: MANAGED_BUILDER_TYPE,
  // No `compilation` field — write-time (default). Tests that need to call
  // generate() on this type pass a generate mock to the registry helper.
  ownership: { solution: 'security', domain: 'detection' },
  builderFieldsSchema: z.object({}) as unknown as RegisteredBuilderType['builderFieldsSchema'],
};

const unmanagedExplicitTypeDefinition: Partial<RegisteredBuilderType> = {
  type: UNMANAGED_EXPLICIT_BUILDER_TYPE,
  ownership: undefined,
  builderFieldsSchema: z.object({}) as unknown as RegisteredBuilderType['builderFieldsSchema'],
};

/**
 * Creates a registry that knows about both the managed and the unmanaged
 * fixture types. The unregistered test types (BUILDER_TYPE, OTHER_BUILDER_TYPE)
 * still return `undefined` from `get()`.
 */
function createRegistryWithManagedTypes(generateFn: jest.Mock = jest.fn()): BuilderTypeRegistry {
  const typeMap = new Map<string, Partial<RegisteredBuilderType>>([
    [MANAGED_BUILDER_TYPE, managedTypeDefinition],
    [UNMANAGED_EXPLICIT_BUILDER_TYPE, unmanagedExplicitTypeDefinition],
  ]);
  return createMockRegistryWithTypes(typeMap, generateFn);
}

// Existing SO attributes for a plain (non-builder) rule.
const plainExisting: RuleSavedObjectAttributes = createRuleSoAttributes({
  metadata: { name: 'test-rule' },
  query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 10' } },
});

// Existing SO attributes for a rule that carries a builder type.
const builderExisting: RuleSavedObjectAttributes = createRuleSoAttributes({
  metadata: { name: 'test-rule', builder_type: BUILDER_TYPE },
  query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 10' } },
});

// A simple standalone GeneratedQuery — no overrides for time_field or grouping.
const standaloneGenerated: GeneratedQuery = {
  query: { format: 'standalone', breach: { query: 'FROM metrics-* | LIMIT 10' } },
};

// A composed GeneratedQuery without a recovery segment.
const composedGenerated: GeneratedQuery = {
  query: {
    format: 'composed',
    base: 'FROM metrics-*',
    breach: { segment: '| WHERE cpu > 0.9' },
  },
};

// A composed GeneratedQuery that includes a recovery segment.
const composedWithRecoveryGenerated: GeneratedQuery = {
  query: {
    format: 'composed',
    base: 'FROM metrics-*',
    breach: { segment: '| WHERE cpu > 0.9' },
    recovery: { segment: '| WHERE cpu <= 0.9' },
  },
};

// ---------------------------------------------------------------------------
// resolveCreateRuleBuilder
// ---------------------------------------------------------------------------

describe('resolveCreateRuleBuilder', () => {
  // -------------------------------------------------------------------------
  // Plain query path — no builder_type / builder_fields in the request
  // -------------------------------------------------------------------------

  describe('plain query path', () => {
    it('returns the data unchanged (with its own query) when no builder fields are present', () => {
      const registry = createMockRegistry();

      const result = resolveCreateRuleBuilder(registry, baseCreateData);

      expect(result.query).toEqual(baseCreateData.query);
      expect(result).toMatchObject({ kind: 'alert', metadata: { name: 'test-rule' } });
    });

    it('does not call registry.generate on the plain query path', () => {
      const generate = jest.fn();
      const registry = createMockRegistry(generate);

      resolveCreateRuleBuilder(registry, baseCreateData);

      expect(generate).not.toHaveBeenCalled();
    });

    it('throws INVALID_RULE_DATA when neither builder fields nor a query is supplied', () => {
      const registry = createMockRegistry();
      const noQueryData = { ...baseCreateData, query: undefined } as CreateRuleData;

      expect(() => resolveCreateRuleBuilder(registry, noQueryData)).toThrow(
        expect.objectContaining({
          output: expect.objectContaining({ statusCode: 400 }),
          data: expect.objectContaining({ code: ALERTING_ERROR_CODES.INVALID_RULE_DATA }),
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // Builder path — builder_type and builder_fields both present
  // -------------------------------------------------------------------------

  describe('builder path', () => {
    it('calls registry.generate with the exact builder_type, builder_fields, and write-time rule context', () => {
      // Step 2.1: generate() now takes a third argument — the write-time rule context
      // (kind, schedule, time_field) derived from the create data. No id at create time.
      const generate = jest.fn().mockReturnValue(standaloneGenerated);
      const registry = createMockRegistry(generate);

      resolveCreateRuleBuilder(registry, builderCreateData);

      expect(generate).toHaveBeenCalledWith(BUILDER_TYPE, RAW_FIELDS, {
        kind: 'alert',
        schedule: { every: '5m' },
        time_field: '@timestamp',
      });
    });

    it('replaces the query in the result with the generated query', () => {
      const registry = createMockRegistry(jest.fn().mockReturnValue(standaloneGenerated));

      const result = resolveCreateRuleBuilder(registry, builderCreateData);

      expect(result.query).toEqual(standaloneGenerated.query);
    });

    // -----------------------------------------------------------------------
    // withGenerated override semantics
    // -----------------------------------------------------------------------

    describe('withGenerated override semantics', () => {
      it('overrides time_field from the generated output when generated.time_field is defined', () => {
        const generated: GeneratedQuery = { ...standaloneGenerated, time_field: 'event.created' };
        const registry = createMockRegistry(jest.fn().mockReturnValue(generated));
        const data = { ...builderCreateData, time_field: '@timestamp' } as CreateRuleData;

        const result = resolveCreateRuleBuilder(registry, data);

        expect(result.time_field).toBe('event.created');
      });

      it('keeps the caller time_field when generated.time_field is undefined', () => {
        // Confirm no time_field override is present on standaloneGenerated.
        expect(standaloneGenerated.time_field).toBeUndefined();
        const registry = createMockRegistry(jest.fn().mockReturnValue(standaloneGenerated));
        const data = { ...builderCreateData, time_field: '@timestamp' } as CreateRuleData;

        const result = resolveCreateRuleBuilder(registry, data);

        expect(result.time_field).toBe('@timestamp');
      });

      it('overrides grouping from the generated output when generated.grouping is defined', () => {
        const generated: GeneratedQuery = {
          ...standaloneGenerated,
          grouping: { fields: ['host.name'] },
        };
        const registry = createMockRegistry(jest.fn().mockReturnValue(generated));

        const result = resolveCreateRuleBuilder(registry, builderCreateData);

        expect(result.grouping).toEqual({ fields: ['host.name'] });
      });

      it('keeps the caller grouping when generated.grouping is undefined', () => {
        const registry = createMockRegistry(jest.fn().mockReturnValue(standaloneGenerated));
        const data = {
          ...builderCreateData,
          grouping: { fields: ['service.name'] },
        } as unknown as CreateRuleData;

        const result = resolveCreateRuleBuilder(registry, data);

        expect(result.grouping).toEqual({ fields: ['service.name'] });
      });
    });

    // -----------------------------------------------------------------------
    // Raw request body persistence
    // -----------------------------------------------------------------------

    describe('raw request body persistence', () => {
      it('stores the raw builder_fields object from the request body, not a parsed copy', () => {
        // The review found: "The stored value is also the raw request body, not
        // the schema's parse result."  This test pins that invariant.
        const rawFields: Record<string, unknown> = { query: 'host.name: *', extra: 'raw-value' };
        const data = {
          ...builderCreateData,
          metadata: { ...builderCreateData.metadata, builder_fields: rawFields },
        } as unknown as CreateRuleData;
        const registry = createMockRegistry(jest.fn().mockReturnValue(standaloneGenerated));

        const result = resolveCreateRuleBuilder(registry, data);

        // Strict identity: the same object reference, not a transformed copy.
        expect(result.metadata.builder_fields).toBe(rawFields);
      });
    });

    // -----------------------------------------------------------------------
    // Signal kind adaptation (adaptToKind)
    // -----------------------------------------------------------------------

    describe('signal kind adaptation', () => {
      it('converts a composed query to standalone format for a signal rule', () => {
        const registry = createMockRegistry(jest.fn().mockReturnValue(composedGenerated));

        const result = resolveCreateRuleBuilder(registry, signalBuilderCreateData);

        // Write-time path always produces a query; non-null assertion is safe.
        expect(result.query!.format).toBe('standalone');
      });

      it('produces the full composed query (base + breach) as the standalone breach query for a signal rule', () => {
        // getBreachEsqlQuery assembles "base | breach_segment", not just the segment.
        const registry = createMockRegistry(jest.fn().mockReturnValue(composedGenerated));

        const result = resolveCreateRuleBuilder(registry, signalBuilderCreateData);

        const q = result.query as { breach: { query: string } };
        expect(q.breach.query).toBe('FROM metrics-* | WHERE cpu > 0.9');
      });

      it('throws BUILDER_QUERY_GENERATION_FAILED when a composed query carries a recovery segment for a signal rule', () => {
        const registry = createMockRegistry(
          jest.fn().mockReturnValue(composedWithRecoveryGenerated)
        );

        expect(() => resolveCreateRuleBuilder(registry, signalBuilderCreateData)).toThrow(
          expect.objectContaining({
            output: expect.objectContaining({ statusCode: 400 }),
            data: expect.objectContaining({
              code: ALERTING_ERROR_CODES.BUILDER_QUERY_GENERATION_FAILED,
            }),
          })
        );
      });

      it('passes a standalone query through unchanged for a signal rule', () => {
        const registry = createMockRegistry(jest.fn().mockReturnValue(standaloneGenerated));

        const result = resolveCreateRuleBuilder(registry, signalBuilderCreateData);

        expect(result.query).toEqual(standaloneGenerated.query);
      });
    });

    // -----------------------------------------------------------------------
    // Recovery strategy auto-resolution
    // -----------------------------------------------------------------------

    describe('recovery strategy auto-resolution', () => {
      it('auto-sets recovery_strategy to "query" when the builder generates a recovery segment and recovery_strategy is undefined', () => {
        const registry = createMockRegistry(
          jest.fn().mockReturnValue(composedWithRecoveryGenerated)
        );
        const data = {
          ...builderCreateData,
          recovery_strategy: undefined,
        } as unknown as CreateRuleData;

        const result = resolveCreateRuleBuilder(registry, data);

        expect(result.recovery_strategy).toBe('query');
        const q = result.query as { recovery?: unknown };
        expect(q.recovery).toBeDefined();
      });

      it('keeps recovery_strategy "query" and preserves the recovery segment when the strategy already matches', () => {
        const registry = createMockRegistry(
          jest.fn().mockReturnValue(composedWithRecoveryGenerated)
        );
        const data = {
          ...builderCreateData,
          recovery_strategy: 'query',
        } as unknown as CreateRuleData;

        const result = resolveCreateRuleBuilder(registry, data);

        expect(result.recovery_strategy).toBe('query');
        const q = result.query as { recovery?: unknown };
        expect(q.recovery).toBeDefined();
      });

      it('strips the recovery segment from the generated query when recovery_strategy is "no_breach"', () => {
        const registry = createMockRegistry(
          jest.fn().mockReturnValue(composedWithRecoveryGenerated)
        );
        const data = {
          ...builderCreateData,
          recovery_strategy: 'no_breach',
        } as unknown as CreateRuleData;

        const result = resolveCreateRuleBuilder(registry, data);

        expect(result.recovery_strategy).toBe('no_breach');
        const q = result.query as { recovery?: unknown };
        expect(q.recovery).toBeUndefined();
      });

      it('does not alter recovery_strategy when the builder generates no recovery segment', () => {
        const registry = createMockRegistry(jest.fn().mockReturnValue(composedGenerated));
        const data = {
          ...builderCreateData,
          recovery_strategy: 'no_breach',
        } as unknown as CreateRuleData;

        const result = resolveCreateRuleBuilder(registry, data);

        expect(result.recovery_strategy).toBe('no_breach');
      });
    });

    // -----------------------------------------------------------------------
    // GENERATED_QUERY_INVARIANTS checks
    // -----------------------------------------------------------------------

    describe('GENERATED_QUERY_INVARIANTS', () => {
      it('throws BUILDER_QUERY_GENERATION_FAILED when recovery_strategy is "query" but the builder generates no recovery', () => {
        // isRecoveryQueryProvidedForStrategy fails: strategy is 'query' but the
        // generated composed query has no recovery segment.
        const registry = createMockRegistry(jest.fn().mockReturnValue(composedGenerated));
        const data = {
          ...builderCreateData,
          recovery_strategy: 'query',
        } as unknown as CreateRuleData;

        expect(() => resolveCreateRuleBuilder(registry, data)).toThrow(
          expect.objectContaining({
            output: expect.objectContaining({ statusCode: 400 }),
            data: expect.objectContaining({
              code: ALERTING_ERROR_CODES.BUILDER_QUERY_GENERATION_FAILED,
            }),
          })
        );
      });

      it('throws BUILDER_QUERY_GENERATION_FAILED when no_data_strategy requires a no_data block but none is generated', () => {
        // isNoDataQueryProvidedForStrategy fails: standalone format + non-none
        // no_data_strategy, but the generated query has no no_data block.
        const standaloneWithoutNoData: GeneratedQuery = {
          query: { format: 'standalone', breach: { query: 'FROM metrics-* | LIMIT 10' } },
        };
        const registry = createMockRegistry(jest.fn().mockReturnValue(standaloneWithoutNoData));
        const data = {
          ...builderCreateData,
          no_data_strategy: 'last_known_status',
        } as unknown as CreateRuleData;

        expect(() => resolveCreateRuleBuilder(registry, data)).toThrow(
          expect.objectContaining({
            output: expect.objectContaining({ statusCode: 400 }),
            data: expect.objectContaining({
              code: ALERTING_ERROR_CODES.BUILDER_QUERY_GENERATION_FAILED,
            }),
          })
        );
      });
    });
  });
});

// ---------------------------------------------------------------------------
// resolveUpdateRuleBuilder
// ---------------------------------------------------------------------------

describe('resolveUpdateRuleBuilder', () => {
  // -------------------------------------------------------------------------
  // Clearing the builder with builder_type: null
  // -------------------------------------------------------------------------

  describe('clearing the builder (builder_type: null)', () => {
    it('sets both builder_type and builder_fields to null when builder_type: null', () => {
      const registry = createMockRegistry();
      const data: UpdateRuleData = { metadata: { builder_type: null } };

      const result = resolveUpdateRuleBuilder(registry, RULE_ID, data, builderExisting);

      expect(result.metadata?.builder_type).toBeNull();
      expect(result.metadata?.builder_fields).toBeNull();
    });

    it('does not call registry.generate when builder_type: null', () => {
      const generate = jest.fn();
      const registry = createMockRegistry(generate);
      const data: UpdateRuleData = { metadata: { builder_type: null } };

      resolveUpdateRuleBuilder(registry, RULE_ID, data, builderExisting);

      expect(generate).not.toHaveBeenCalled();
    });

    it('throws INVALID_BUILDER_FIELDS when builder_type: null but builder_fields is also set', () => {
      const registry = createMockRegistry();
      const data: UpdateRuleData = {
        metadata: { builder_type: null, builder_fields: RAW_FIELDS },
      };

      expect(() => resolveUpdateRuleBuilder(registry, RULE_ID, data, builderExisting)).toThrow(
        expect.objectContaining({
          output: expect.objectContaining({ statusCode: 400 }),
          data: expect.objectContaining({ code: ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS }),
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // Clearing builder_fields alone
  // -------------------------------------------------------------------------

  describe('clearing builder_fields alone', () => {
    it('throws INVALID_BUILDER_FIELDS when builder_fields: null and the effective type is the stored type', () => {
      const registry = createMockRegistry();
      const data: UpdateRuleData = { metadata: { builder_fields: null } };

      expect(() => resolveUpdateRuleBuilder(registry, RULE_ID, data, builderExisting)).toThrow(
        expect.objectContaining({
          output: expect.objectContaining({ statusCode: 400 }),
          data: expect.objectContaining({ code: ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS }),
        })
      );
    });

    it('throws INVALID_BUILDER_FIELDS when builder_fields: null and requestedType locks in an effective type', () => {
      const registry = createMockRegistry();
      const data: UpdateRuleData = {
        metadata: { builder_type: BUILDER_TYPE, builder_fields: null },
      };

      expect(() => resolveUpdateRuleBuilder(registry, RULE_ID, data, plainExisting)).toThrow(
        expect.objectContaining({
          output: expect.objectContaining({ statusCode: 400 }),
          data: expect.objectContaining({ code: ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS }),
        })
      );
    });

    it('returns data unchanged when builder_fields: null and there is no effective type', () => {
      // effectiveType = requestedType ?? existingType = undefined ?? undefined = undefined
      // The null-fields guard only fires when effectiveType is truthy.
      const registry = createMockRegistry();
      const data: UpdateRuleData = { metadata: { builder_fields: null } };

      const result = resolveUpdateRuleBuilder(registry, RULE_ID, data, plainExisting);

      expect(result).toBe(data);
    });
  });

  // -------------------------------------------------------------------------
  // BUILDER_TYPE_IS_MANAGED guard
  // -------------------------------------------------------------------------

  describe('BUILDER_TYPE_IS_MANAGED guard', () => {
    // Existing SO attributes for a managed builder rule.
    const managedBuilderExisting: RuleSavedObjectAttributes = createRuleSoAttributes({
      metadata: {
        name: 'detection-rule',
        builder_type: MANAGED_BUILDER_TYPE,
        ownership: { managed: true, solution: 'security', domain: 'detection' },
      },
      query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 10' } },
    });

    // Existing SO attributes for an unmanaged-explicit builder rule.
    const unmanagedExplicitBuilderExisting: RuleSavedObjectAttributes = createRuleSoAttributes({
      metadata: {
        name: 'unmanaged-rule',
        builder_type: UNMANAGED_EXPLICIT_BUILDER_TYPE,
        ownership: { managed: false },
      },
      query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 10' } },
    });

    // Existing SO attributes for a rule whose stored ownership is managed but
    // whose builder_type is no longer registered (plugin disabled).
    const orphanManagedExisting: RuleSavedObjectAttributes = createRuleSoAttributes({
      metadata: {
        name: 'orphan-rule',
        builder_type: 'test.plugin-disabled-type',
        ownership: { managed: true, solution: 'security', domain: 'detection' },
      },
      query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 10' } },
    });

    it('rejects a plain rule adopting a managed type with builder_fields (without onBehalfOf identity)', () => {
      // A plain rule requesting a managed builder_type + fields must be rejected
      // before any query compilation runs.
      const registry = createRegistryWithManagedTypes();
      const data: UpdateRuleData = {
        metadata: { builder_type: MANAGED_BUILDER_TYPE, builder_fields: RAW_FIELDS },
      };

      expect(() => resolveUpdateRuleBuilder(registry, RULE_ID, data, plainExisting)).toThrow(
        expect.objectContaining({
          output: expect.objectContaining({ statusCode: 400 }),
          data: expect.objectContaining({
            code: ALERTING_ERROR_CODES.BUILDER_TYPE_IS_MANAGED,
            details: expect.objectContaining({
              rule_id: RULE_ID,
              builder_type: MANAGED_BUILDER_TYPE,
              solution: 'security',
              domain: 'detection',
            }),
          }),
        })
      );
    });

    it('rejects a plain rule adopting a managed type even when a matching onBehalfOf identity would pass the write gate', () => {
      // Caller identity does NOT bypass the managed-type transition check.
      // The gate here is on type change, not on write permission.
      const registry = createRegistryWithManagedTypes();
      const data: UpdateRuleData = {
        metadata: { builder_type: MANAGED_BUILDER_TYPE, builder_fields: RAW_FIELDS },
      };

      // Same call — identity is not part of resolveUpdateRuleBuilder's
      // signature, so there is no bypass path.
      expect(() => resolveUpdateRuleBuilder(registry, RULE_ID, data, plainExisting)).toThrow(
        expect.objectContaining({
          data: expect.objectContaining({ code: ALERTING_ERROR_CODES.BUILDER_TYPE_IS_MANAGED }),
        })
      );
    });

    it('rejects an unmanaged builder rule switching to a managed type', () => {
      const registry = createRegistryWithManagedTypes();
      const data: UpdateRuleData = {
        metadata: { builder_type: MANAGED_BUILDER_TYPE, builder_fields: RAW_FIELDS },
      };

      expect(() =>
        resolveUpdateRuleBuilder(registry, RULE_ID, data, unmanagedExplicitBuilderExisting)
      ).toThrow(
        expect.objectContaining({
          data: expect.objectContaining({ code: ALERTING_ERROR_CODES.BUILDER_TYPE_IS_MANAGED }),
        })
      );
    });

    it('rejects a managed rule switching to an unmanaged type', () => {
      // The stored rule is managed (ownership.managed === true and type is registered
      // as managed), so any transition away from it is rejected.
      const registry = createRegistryWithManagedTypes(
        jest.fn().mockReturnValue(standaloneGenerated)
      );
      const data: UpdateRuleData = {
        metadata: { builder_type: UNMANAGED_EXPLICIT_BUILDER_TYPE, builder_fields: RAW_FIELDS },
      };

      expect(() =>
        resolveUpdateRuleBuilder(registry, RULE_ID, data, managedBuilderExisting)
      ).toThrow(
        expect.objectContaining({
          data: expect.objectContaining({ code: ALERTING_ERROR_CODES.BUILDER_TYPE_IS_MANAGED }),
        })
      );
    });

    it('rejects clearing a managed builder type via builder_type: null', () => {
      const registry = createRegistryWithManagedTypes();
      const data: UpdateRuleData = { metadata: { builder_type: null } };

      expect(() =>
        resolveUpdateRuleBuilder(registry, RULE_ID, data, managedBuilderExisting)
      ).toThrow(
        expect.objectContaining({
          data: expect.objectContaining({ code: ALERTING_ERROR_CODES.BUILDER_TYPE_IS_MANAGED }),
        })
      );
    });

    it('passes when restating the same managed type with new builder_fields', () => {
      // Restatement (requested === stored) is always allowed; the existing
      // builder regeneration path takes over.
      const generate = jest.fn().mockReturnValue(standaloneGenerated);
      const registry = createRegistryWithManagedTypes(generate);
      const data: UpdateRuleData = {
        metadata: { builder_type: MANAGED_BUILDER_TYPE, builder_fields: RAW_FIELDS },
      };

      // Must not throw BUILDER_TYPE_IS_MANAGED. The write-time compilation path
      // runs next and succeeds with the mocked generate().
      expect(() =>
        resolveUpdateRuleBuilder(registry, RULE_ID, data, managedBuilderExisting)
      ).not.toThrow();
    });

    it('rejects transitions from a managed rule even when the type is unregistered (stored-mark half of the predicate)', () => {
      // The stored ownership.managed === true covers plugin-disabled states.
      // BUILDER_TYPE_IS_MANAGED must fire even when the type is no longer in
      // the registry.
      const registry = createRegistryWithManagedTypes();
      const data: UpdateRuleData = { metadata: { builder_type: null } };

      expect(() =>
        resolveUpdateRuleBuilder(registry, RULE_ID, data, orphanManagedExisting)
      ).toThrow(
        expect.objectContaining({
          data: expect.objectContaining({ code: ALERTING_ERROR_CODES.BUILDER_TYPE_IS_MANAGED }),
        })
      );
    });

    it('does not interfere with an unmanaged type adoption (plain rule adopting an unmanaged type without fields stays INVALID_BUILDER_FIELDS)', () => {
      // BUILDER_TYPE_IS_MANAGED does not fire for unmanaged transitions. The
      // existing INVALID_BUILDER_FIELDS guard (missing fields) takes over.
      const registry = createRegistryWithManagedTypes();
      const data: UpdateRuleData = { metadata: { builder_type: UNMANAGED_EXPLICIT_BUILDER_TYPE } };

      expect(() => resolveUpdateRuleBuilder(registry, RULE_ID, data, plainExisting)).toThrow(
        expect.objectContaining({
          data: expect.objectContaining({ code: ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS }),
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // Providing new builder_fields
  // -------------------------------------------------------------------------

  describe('providing new builder_fields', () => {
    it('calls registry.generate with the post-write schedule and time_field when no update is provided', () => {
      // When the request carries no schedule or time_field update, the effective
      // values equal the existing stored values.
      const generate = jest.fn().mockReturnValue(standaloneGenerated);
      const registry = createMockRegistry(generate);
      const data: UpdateRuleData = {
        metadata: { builder_type: BUILDER_TYPE, builder_fields: RAW_FIELDS },
      };

      resolveUpdateRuleBuilder(registry, RULE_ID, data, plainExisting);

      expect(generate).toHaveBeenCalledWith(BUILDER_TYPE, RAW_FIELDS, {
        id: RULE_ID,
        kind: 'alert',
        schedule: { every: '1m', lookback: '5m' },
        time_field: '@timestamp',
      });
    });

    it('merges the requested schedule into the compile context (post-write value)', () => {
      // A request that updates schedule.every must pass the updated schedule to
      // generate(), not the pre-update stored schedule. Otherwise the query is
      // compiled against a schedule that the stored rule will not have.
      //
      // Ref: rule-execution-logic.md "The compilation contract"
      const generate = jest.fn().mockReturnValue(standaloneGenerated);
      const registry = createMockRegistry(generate);
      const data: UpdateRuleData = {
        metadata: { builder_type: BUILDER_TYPE, builder_fields: RAW_FIELDS },
        schedule: { every: '10m' },
      };

      resolveUpdateRuleBuilder(registry, RULE_ID, data, plainExisting);

      // Effective schedule = { ...existing.schedule, ...data.schedule }
      // = { every: '1m', lookback: '5m', ...{ every: '10m' } }
      // = { every: '10m', lookback: '5m' }
      expect(generate).toHaveBeenCalledWith(
        BUILDER_TYPE,
        RAW_FIELDS,
        expect.objectContaining({ schedule: { every: '10m', lookback: '5m' } })
      );
    });

    it('uses the requested time_field in the compile context (post-write value)', () => {
      // A request that changes time_field must pass the new time_field to
      // generate(), not the pre-update stored time_field.
      //
      // Ref: rule-execution-logic.md "The compilation contract"
      const generate = jest.fn().mockReturnValue(standaloneGenerated);
      const registry = createMockRegistry(generate);
      const data: UpdateRuleData = {
        metadata: { builder_type: BUILDER_TYPE, builder_fields: RAW_FIELDS },
        time_field: 'event.created',
      };

      resolveUpdateRuleBuilder(registry, RULE_ID, data, plainExisting);

      expect(generate).toHaveBeenCalledWith(
        BUILDER_TYPE,
        RAW_FIELDS,
        expect.objectContaining({ time_field: 'event.created' })
      );
    });

    it('falls back to the existing builder_type when no requestedType is supplied', () => {
      // Even without a requestedType, the compile context uses the post-write
      // (effective) schedule and time_field. Here no update is present, so the
      // effective values equal the existing stored values.
      const generate = jest.fn().mockReturnValue(standaloneGenerated);
      const registry = createMockRegistry(generate);
      const data: UpdateRuleData = { metadata: { builder_fields: RAW_FIELDS } };

      resolveUpdateRuleBuilder(registry, RULE_ID, data, builderExisting);

      expect(generate).toHaveBeenCalledWith(BUILDER_TYPE, RAW_FIELDS, {
        id: RULE_ID,
        kind: 'alert',
        schedule: { every: '1m', lookback: '5m' },
        time_field: '@timestamp',
      });
    });

    it('throws INVALID_BUILDER_FIELDS when builder_fields are provided but there is no effective type', () => {
      const registry = createMockRegistry();
      const data: UpdateRuleData = { metadata: { builder_fields: RAW_FIELDS } };

      expect(() => resolveUpdateRuleBuilder(registry, RULE_ID, data, plainExisting)).toThrow(
        expect.objectContaining({
          output: expect.objectContaining({ statusCode: 400 }),
          data: expect.objectContaining({ code: ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS }),
        })
      );
    });

    it('replaces query in the result with the generated query', () => {
      const generate = jest.fn().mockReturnValue(standaloneGenerated);
      const registry = createMockRegistry(generate);
      const data: UpdateRuleData = {
        metadata: { builder_type: BUILDER_TYPE, builder_fields: RAW_FIELDS },
      };

      const result = resolveUpdateRuleBuilder(registry, RULE_ID, data, plainExisting);

      expect(result.query).toEqual(standaloneGenerated.query);
    });

    it('stamps the effective builder_type onto the result metadata', () => {
      const generate = jest.fn().mockReturnValue(standaloneGenerated);
      const registry = createMockRegistry(generate);
      // No requestedType — falls back to existingType.
      const data: UpdateRuleData = { metadata: { builder_fields: RAW_FIELDS } };

      const result = resolveUpdateRuleBuilder(registry, RULE_ID, data, builderExisting);

      expect(result.metadata?.builder_type).toBe(BUILDER_TYPE);
    });

    // -----------------------------------------------------------------------
    // withGenerated override semantics on the update path
    // -----------------------------------------------------------------------

    describe('withGenerated override semantics', () => {
      it('overrides time_field from the generated output when generated.time_field is defined', () => {
        const generated: GeneratedQuery = { ...standaloneGenerated, time_field: 'event.created' };
        const registry = createMockRegistry(jest.fn().mockReturnValue(generated));
        const data: UpdateRuleData = {
          metadata: { builder_type: BUILDER_TYPE, builder_fields: RAW_FIELDS },
          time_field: '@timestamp',
        };

        const result = resolveUpdateRuleBuilder(registry, RULE_ID, data, plainExisting);

        expect(result.time_field).toBe('event.created');
      });

      it('keeps the caller time_field when generated.time_field is undefined', () => {
        const registry = createMockRegistry(jest.fn().mockReturnValue(standaloneGenerated));
        const data: UpdateRuleData = {
          metadata: { builder_type: BUILDER_TYPE, builder_fields: RAW_FIELDS },
          time_field: '@timestamp',
        };

        const result = resolveUpdateRuleBuilder(registry, RULE_ID, data, plainExisting);

        expect(result.time_field).toBe('@timestamp');
      });

      it('overrides grouping from the generated output when generated.grouping is defined', () => {
        const generated: GeneratedQuery = {
          ...standaloneGenerated,
          grouping: { fields: ['host.name'] },
        };
        const registry = createMockRegistry(jest.fn().mockReturnValue(generated));
        const data: UpdateRuleData = {
          metadata: { builder_type: BUILDER_TYPE, builder_fields: RAW_FIELDS },
        };

        const result = resolveUpdateRuleBuilder(registry, RULE_ID, data, plainExisting);

        expect(result.grouping).toEqual({ fields: ['host.name'] });
      });
    });

    // -----------------------------------------------------------------------
    // Raw request body persistence on the update path
    // -----------------------------------------------------------------------

    describe('raw request body persistence', () => {
      it('stores the raw builder_fields object from the request, not a parsed copy', () => {
        const rawFields: Record<string, unknown> = { query: 'host: *', extra: 'raw-value' };
        const generate = jest.fn().mockReturnValue(standaloneGenerated);
        const registry = createMockRegistry(generate);
        const data: UpdateRuleData = {
          metadata: { builder_type: BUILDER_TYPE, builder_fields: rawFields },
        };

        const result = resolveUpdateRuleBuilder(registry, RULE_ID, data, plainExisting);

        // Strict identity: same raw object, not transformed.
        expect(result.metadata?.builder_fields).toBe(rawFields);
      });
    });

    // -----------------------------------------------------------------------
    // Recovery strategy on the update path
    // -----------------------------------------------------------------------

    describe('recovery strategy resolution', () => {
      it('auto-sets recovery_strategy to "query" when the builder generates a recovery segment and no strategy is in effect', () => {
        const generate = jest.fn().mockReturnValue(composedWithRecoveryGenerated);
        const registry = createMockRegistry(generate);
        const existingNoStrategy = createRuleSoAttributes({
          metadata: { name: 'test-rule', builder_type: BUILDER_TYPE },
          recovery_strategy: undefined,
        });
        const data: UpdateRuleData = { metadata: { builder_fields: RAW_FIELDS } };

        const result = resolveUpdateRuleBuilder(
          registry,
          RULE_ID,
          data,
          existingNoStrategy as unknown as RuleSavedObjectAttributes
        );

        expect(result.recovery_strategy).toBe('query');
      });

      it('strips the recovery segment when the effective strategy is not "query"', () => {
        const generate = jest.fn().mockReturnValue(composedWithRecoveryGenerated);
        const registry = createMockRegistry(generate);
        const existingNoBreach = createRuleSoAttributes({
          metadata: { name: 'test-rule', builder_type: BUILDER_TYPE },
          recovery_strategy: 'no_breach',
        });
        const data: UpdateRuleData = { metadata: { builder_fields: RAW_FIELDS } };

        const result = resolveUpdateRuleBuilder(registry, RULE_ID, data, existingNoBreach);

        const q = result.query as { recovery?: unknown } | undefined;
        expect(q?.recovery).toBeUndefined();
      });
    });

    // -----------------------------------------------------------------------
    // GENERATED_QUERY_INVARIANTS are checked on the update path (step 6.4 fix)
    // -----------------------------------------------------------------------

    describe('GENERATED_QUERY_INVARIANTS are now asserted on the update path', () => {
      /**
       * Step 6.4 adds assertGeneratedQueryIsValid to the update path.
       * Previously (characterised as a bug in the step 1.3a tests) a builder
       * could return a query that violated the invariants on update without
       * being rejected. These tests confirm the fix: the same scenarios that
       * throw on create now also throw on update.
       */
      it('throws BUILDER_QUERY_GENERATION_FAILED when recovery_strategy is "query" but the builder generates no recovery', () => {
        // The same scenario no longer passes silently on the update path.
        const generate = jest.fn().mockReturnValue(standaloneGenerated);
        const registry = createMockRegistry(generate);
        const data: UpdateRuleData = {
          metadata: { builder_fields: RAW_FIELDS },
          recovery_strategy: 'query',
        };

        expect(() => resolveUpdateRuleBuilder(registry, RULE_ID, data, builderExisting)).toThrow(
          expect.objectContaining({
            output: expect.objectContaining({ statusCode: 400 }),
            data: expect.objectContaining({
              code: ALERTING_ERROR_CODES.BUILDER_QUERY_GENERATION_FAILED,
            }),
          })
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // BUILDER_TYPE_NOT_CLEARED guard
  // -------------------------------------------------------------------------

  describe('BUILDER_TYPE_NOT_CLEARED guard', () => {
    it('throws BUILDER_TYPE_NOT_CLEARED when the query is changed on a builder rule', () => {
      const registry = createMockRegistry();
      // Different from the stored query in builderExisting.
      const data: UpdateRuleData = {
        query: { format: 'standalone', breach: { query: 'FROM new-index-* | LIMIT 5' } },
      };

      expect(() => resolveUpdateRuleBuilder(registry, RULE_ID, data, builderExisting)).toThrow(
        expect.objectContaining({
          output: expect.objectContaining({ statusCode: 400 }),
          data: expect.objectContaining({
            code: ALERTING_ERROR_CODES.BUILDER_TYPE_NOT_CLEARED,
            details: expect.objectContaining({ rule_id: RULE_ID }),
          }),
        })
      );
    });

    it('includes the builder_type in the BUILDER_TYPE_NOT_CLEARED error details', () => {
      const registry = createMockRegistry();
      const data: UpdateRuleData = {
        query: { format: 'standalone', breach: { query: 'FROM new-index-* | LIMIT 5' } },
      };

      let caught: unknown;
      try {
        resolveUpdateRuleBuilder(registry, RULE_ID, data, builderExisting);
      } catch (error) {
        caught = error;
      }

      expect(caught).toMatchObject({
        data: expect.objectContaining({
          details: expect.objectContaining({ builder_type: BUILDER_TYPE }),
        }),
      });
    });

    it('does not throw when the query sent equals the stored query', () => {
      const registry = createMockRegistry();
      // Exact same query as in builderExisting.
      const data: UpdateRuleData = {
        query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 10' } },
      };

      expect(() =>
        resolveUpdateRuleBuilder(registry, RULE_ID, data, builderExisting)
      ).not.toThrow();
    });

    it('does not throw when query is absent from the update', () => {
      const registry = createMockRegistry();
      const data: UpdateRuleData = { metadata: { tags: ['updated-tag'] } };

      expect(() =>
        resolveUpdateRuleBuilder(registry, RULE_ID, data, builderExisting)
      ).not.toThrow();
    });

    it('allows a query change on a plain (non-builder) rule', () => {
      const registry = createMockRegistry();
      const data: UpdateRuleData = {
        query: { format: 'standalone', breach: { query: 'FROM new-index-* | LIMIT 5' } },
      };

      expect(() => resolveUpdateRuleBuilder(registry, RULE_ID, data, plainExisting)).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Builder type change without new fields
  // -------------------------------------------------------------------------

  describe('builder type change without new fields', () => {
    it('throws INVALID_BUILDER_FIELDS when switching from one builder type to another without supplying new fields', () => {
      const registry = createMockRegistry();
      const data: UpdateRuleData = { metadata: { builder_type: OTHER_BUILDER_TYPE } };

      expect(() => resolveUpdateRuleBuilder(registry, RULE_ID, data, builderExisting)).toThrow(
        expect.objectContaining({
          output: expect.objectContaining({ statusCode: 400 }),
          data: expect.objectContaining({
            code: ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS,
            details: expect.objectContaining({
              builder_type: OTHER_BUILDER_TYPE,
              previous_builder_type: BUILDER_TYPE,
            }),
          }),
        })
      );
    });

    it('throws INVALID_BUILDER_FIELDS when adopting a builder type on a plain rule without supplying fields', () => {
      const registry = createMockRegistry();
      const data: UpdateRuleData = { metadata: { builder_type: BUILDER_TYPE } };

      expect(() => resolveUpdateRuleBuilder(registry, RULE_ID, data, plainExisting)).toThrow(
        expect.objectContaining({
          output: expect.objectContaining({ statusCode: 400 }),
          data: expect.objectContaining({
            code: ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS,
            details: expect.objectContaining({ builder_type: BUILDER_TYPE }),
          }),
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // No builder-related changes — pass-through
  // -------------------------------------------------------------------------

  describe('no builder-related changes', () => {
    it('returns the data object unchanged when no builder type or field changes are made', () => {
      const registry = createMockRegistry();
      const data: UpdateRuleData = { metadata: { tags: ['tag-1'] } };

      const result = resolveUpdateRuleBuilder(registry, RULE_ID, data, plainExisting);

      expect(result).toBe(data);
    });

    it('returns the data object unchanged when updating a builder rule with no query or field changes', () => {
      const registry = createMockRegistry();
      const data: UpdateRuleData = { metadata: { tags: ['tag-1'] } };

      const result = resolveUpdateRuleBuilder(registry, RULE_ID, data, builderExisting);

      expect(result).toBe(data);
    });
  });
});

// ---------------------------------------------------------------------------
// resolveReplaceRuleBuilder
// ---------------------------------------------------------------------------

describe('resolveReplaceRuleBuilder', () => {
  // -------------------------------------------------------------------------
  // Plain (non-builder) stored rule — delegates to resolveCreateRuleBuilder
  // -------------------------------------------------------------------------

  describe('stored rule has no builder type', () => {
    it('delegates to resolveCreateRuleBuilder unchanged when the stored rule is a plain rule', () => {
      // For a plain rule, replace is a full create-shaped resolution with no
      // extra checks. The stored rule has no builder_type, so the guard is a no-op.
      const registry = createMockRegistry();

      const result = resolveReplaceRuleBuilder(registry, RULE_ID, baseCreateData, plainExisting);

      expect(result.query).toEqual(baseCreateData.query);
    });

    it('does not call registry.generate when the stored rule is plain', () => {
      const generate = jest.fn();
      const registry = createMockRegistry(generate);

      resolveReplaceRuleBuilder(registry, RULE_ID, baseCreateData, plainExisting);

      expect(generate).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Stored rule has a builder type — guard paths
  // -------------------------------------------------------------------------

  describe('stored rule has a builder type', () => {
    // -----------------------------------------------------------------------
    // Path 1: PUT body carries builder_fields → builder regeneration
    // -----------------------------------------------------------------------

    describe('PUT body sends builder_fields (path 1: regeneration)', () => {
      it('calls registry.generate with the provided builder_fields', () => {
        // A PUT that carries builder_fields regenerates the query through the
        // builder, preserving the builder relationship.
        const generate = jest.fn().mockReturnValue(standaloneGenerated);
        const registry = createMockRegistry(generate);

        resolveReplaceRuleBuilder(registry, RULE_ID, builderCreateData, builderExisting);

        expect(generate).toHaveBeenCalledWith(
          BUILDER_TYPE,
          RAW_FIELDS,
          expect.objectContaining({ kind: 'alert' })
        );
      });

      it('returns the generated query in the result', () => {
        const registry = createMockRegistry(jest.fn().mockReturnValue(standaloneGenerated));

        const result = resolveReplaceRuleBuilder(
          registry,
          RULE_ID,
          builderCreateData,
          builderExisting
        );

        expect(result.query).toEqual(standaloneGenerated.query);
      });
    });

    // -----------------------------------------------------------------------
    // Path 2: PUT body sends builder_type: null → explicit clear
    // -----------------------------------------------------------------------

    describe('PUT body sends builder_type: null (path 2: explicit clear)', () => {
      // `null` is the escape hatch that explicitly transitions a builder rule
      // to plain ES|QL mode. resolveReplaceRuleBuilder normalises it to
      // undefined before delegating to resolveCreateRuleBuilder, so null
      // never reaches storage.

      it('succeeds and returns the body query when builder_type is null', () => {
        const registry = createMockRegistry();
        // ReplaceRuleData accepts builder_type: null as the explicit escape hatch.
        const data: ReplaceRuleData = {
          ...baseCreateData,
          metadata: { ...baseCreateData.metadata, builder_type: null },
        };

        // Should not throw.
        const result = resolveReplaceRuleBuilder(registry, RULE_ID, data, builderExisting);

        expect(result.query).toEqual(baseCreateData.query);
      });

      it('produces a result whose metadata.builder_type is not null (normalised away)', () => {
        const registry = createMockRegistry();
        const data: ReplaceRuleData = {
          ...baseCreateData,
          metadata: { ...baseCreateData.metadata, builder_type: null },
        };

        const result = resolveReplaceRuleBuilder(registry, RULE_ID, data, builderExisting);

        // null must not propagate to storage. resolveCreateRuleBuilder receives
        // the data with builder_type: undefined, so the result has no null.
        expect(result.metadata.builder_type).not.toBe(null);
      });

      it('does not call registry.generate when builder_type is null (explicit clear path)', () => {
        const generate = jest.fn();
        const registry = createMockRegistry(generate);
        const data: ReplaceRuleData = {
          ...baseCreateData,
          metadata: { ...baseCreateData.metadata, builder_type: null },
        };

        resolveReplaceRuleBuilder(registry, RULE_ID, data, builderExisting);

        expect(generate).not.toHaveBeenCalled();
      });
    });

    // -----------------------------------------------------------------------
    // Path 3: PUT body carries a plain query without an explicit clear → reject
    // -----------------------------------------------------------------------

    describe('PUT body carries a plain query without builder_type: null (path 3: reject)', () => {
      // Step 5.4: closes the PUT bypass of the builder-query protection.
      // Before this step, the replace branch called resolveCreateRuleBuilder
      // directly, which had no access to the stored rule and allowed any PUT
      // body to silently strip the builder relationship.

      it('throws BUILDER_TYPE_NOT_CLEARED when a plain query is PUT over a builder rule', () => {
        const registry = createMockRegistry();

        expect(() =>
          resolveReplaceRuleBuilder(registry, RULE_ID, baseCreateData, builderExisting)
        ).toThrow(
          expect.objectContaining({
            output: expect.objectContaining({ statusCode: 400 }),
            data: expect.objectContaining({
              code: ALERTING_ERROR_CODES.BUILDER_TYPE_NOT_CLEARED,
            }),
          })
        );
      });

      it('includes the rule_id and builder_type in the BUILDER_TYPE_NOT_CLEARED error details', () => {
        const registry = createMockRegistry();

        let caught: unknown;
        try {
          resolveReplaceRuleBuilder(registry, RULE_ID, baseCreateData, builderExisting);
        } catch (error) {
          caught = error;
        }

        expect(caught).toMatchObject({
          data: expect.objectContaining({
            details: expect.objectContaining({
              rule_id: RULE_ID,
              builder_type: BUILDER_TYPE,
            }),
          }),
        });
      });

      it('throws BUILDER_TYPE_NOT_CLEARED when the body omits builder_type even if the query is identical', () => {
        // `baseCreateData` has no metadata.builder_type (undefined), so the
        // body would strip builder_type from storage. The query being identical
        // is not enough to make the PUT safe — the builder_type must be
        // preserved too.
        const registry = createMockRegistry();
        // Same query as in builderExisting.
        const data: CreateRuleData = {
          ...baseCreateData,
          query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 10' } },
        };

        expect(() => resolveReplaceRuleBuilder(registry, RULE_ID, data, builderExisting)).toThrow(
          expect.objectContaining({
            data: expect.objectContaining({
              code: ALERTING_ERROR_CODES.BUILDER_TYPE_NOT_CLEARED,
            }),
          })
        );
      });

      it('accepts a faithful round-trip that carries the same builder_type and an unchanged query', () => {
        // A PUT that preserves the stored builder_type and sends an identical
        // query is a round-trip (e.g. only metadata.name changed). The stored
        // rule has no builder_fields, so nothing is dropped. This mirrors
        // PATCH's queryChanged check.
        //
        // Ref: rule-types.md "What this design needs from the framework"
        const registry = createMockRegistry();
        // Carry the same builder_type and the same query as in builderExisting.
        const data = {
          ...baseCreateData,
          metadata: { ...baseCreateData.metadata, builder_type: BUILDER_TYPE, name: 'renamed' },
          query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 10' } },
        } as ReplaceRuleData;

        let result: ReturnType<typeof resolveReplaceRuleBuilder>;
        expect(
          () => (result = resolveReplaceRuleBuilder(registry, RULE_ID, data, builderExisting))
        ).not.toThrow();
        expect(result!.metadata.builder_type).toBe(BUILDER_TYPE);
        expect(result!.query).toEqual(data.query);
      });

      it('throws when the round-trip body changes the query even with the same builder_type', () => {
        const registry = createMockRegistry();
        const data = {
          ...baseCreateData,
          metadata: { ...baseCreateData.metadata, builder_type: BUILDER_TYPE },
          query: { format: 'standalone', breach: { query: 'FROM metrics-* | LIMIT 1' } }, // different
        } as ReplaceRuleData;

        expect(() => resolveReplaceRuleBuilder(registry, RULE_ID, data, builderExisting)).toThrow(
          expect.objectContaining({
            data: expect.objectContaining({
              code: ALERTING_ERROR_CODES.BUILDER_TYPE_NOT_CLEARED,
            }),
          })
        );
      });

      it('does not throw for a plain query PUT over a non-builder rule', () => {
        // The guard only fires when the stored rule has a builder_type.
        const registry = createMockRegistry();

        expect(() =>
          resolveReplaceRuleBuilder(registry, RULE_ID, baseCreateData, plainExisting)
        ).not.toThrow();
      });
    });

    // -----------------------------------------------------------------------
    // BUILDER_TYPE_IS_MANAGED guard — upsert replace branch
    // -----------------------------------------------------------------------

    describe('BUILDER_TYPE_IS_MANAGED guard on the replace branch', () => {
      // A plain (non-managed) stored rule to test adoption of a managed type.
      const plainExistingForReplace: RuleSavedObjectAttributes = createRuleSoAttributes({
        metadata: { name: 'test-rule', ownership: { managed: false } },
        query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 10' } },
      });

      // A managed stored rule to test same-type restatement.
      const managedBuilderExistingForReplace: RuleSavedObjectAttributes = createRuleSoAttributes({
        metadata: {
          name: 'managed-rule',
          builder_type: MANAGED_BUILDER_TYPE,
          ownership: { managed: true, solution: 'security', domain: 'detection' },
        },
        query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 10' } },
      });

      it('rejects a plain rule adopting a managed type via PUT with builder_fields', () => {
        // PUT body supplies builder_type (managed) + builder_fields: the
        // managed-type transition guard fires before builder regeneration.
        const registry = createRegistryWithManagedTypes(
          jest.fn().mockReturnValue(standaloneGenerated)
        );
        const data = {
          ...baseCreateData,
          metadata: {
            ...baseCreateData.metadata,
            builder_type: MANAGED_BUILDER_TYPE,
            builder_fields: RAW_FIELDS,
          },
        } as unknown as ReplaceRuleData;

        expect(() =>
          resolveReplaceRuleBuilder(registry, RULE_ID, data, plainExistingForReplace)
        ).toThrow(
          expect.objectContaining({
            output: expect.objectContaining({ statusCode: 400 }),
            data: expect.objectContaining({
              code: ALERTING_ERROR_CODES.BUILDER_TYPE_IS_MANAGED,
            }),
          })
        );
      });

      it('passes when restating the same managed type on the replace branch', () => {
        // Carrying the same builder_type as stored (restatement) is always
        // allowed. The existing faithful-round-trip path (Path 3) takes over.
        const registry = createRegistryWithManagedTypes();
        const data = {
          ...baseCreateData,
          metadata: {
            ...baseCreateData.metadata,
            builder_type: MANAGED_BUILDER_TYPE,
          },
          query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 10' } },
        } as ReplaceRuleData;

        // The round-trip check (Path 3) accepts this because:
        //   - builder_type matches stored
        //   - stored rule has no builder_fields
        //   - query is unchanged
        expect(() =>
          resolveReplaceRuleBuilder(registry, RULE_ID, data, managedBuilderExistingForReplace)
        ).not.toThrow();
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Execution-time builder types (step 6.4)
//
// Execution-time types declare `compilation: 'execution_time'`. On the write
// path the framework must NOT call generateQuery; instead it:
//   1. Parses the builder fields (or skips the parse under the validation opt-out).
//   2. Calls deriveRuleFields if the type declares one, and applies the result
//      with withDerived override semantics (undefined keeps the caller value).
//   3. Returns data WITHOUT a `query` field.
//
// Ref: rule-execution-logic.md "Two compilation modes"
//      rule-execution-logic.md "Derived rule fields at write time"
// ---------------------------------------------------------------------------

describe('execution-time builder types', () => {
  // Minimal execution-time type that derives grouping from threshold.field.
  const EXECUTION_TYPE = 'test.execution';

  // Zod schema for the execution-time type's fields.
  const executionFieldsSchema = z.object({
    index: z.string(),
    threshold_field: z.array(z.string()),
  });

  /** Build a RegisteredBuilderType-shaped object for the execution-time type. */
  function makeExecutionDefinition(
    opts: {
      deriveRuleFields?: (fields: z.infer<typeof executionFieldsSchema>) => DerivedRuleFields;
    } = {}
  ): Partial<RegisteredBuilderType> {
    return {
      type: EXECUTION_TYPE,
      compilation: 'execution_time',
      builderFieldsSchema:
        executionFieldsSchema as unknown as RegisteredBuilderType['builderFieldsSchema'],
      deriveRuleFields: opts.deriveRuleFields as RegisteredBuilderType['deriveRuleFields'],
    };
  }

  const RAW_EXECUTION_FIELDS = { index: 'logs-*', threshold_field: ['user.name'] };

  // CreateRuleData carrying execution-time builder fields.
  const executionCreateData = {
    kind: 'signal',
    metadata: {
      name: 'detection-rule',
      builder_type: EXECUTION_TYPE,
      builder_fields: RAW_EXECUTION_FIELDS,
    },
    time_field: '@timestamp',
    schedule: { every: '5m' },
  } as unknown as CreateRuleData;

  // Existing SO attributes for a stored execution-time rule (no query stored).
  const executionExisting: RuleSavedObjectAttributes = createRuleSoAttributes({
    kind: 'signal',
    metadata: {
      name: 'detection-rule',
      builder_type: EXECUTION_TYPE,
      builder_fields: RAW_EXECUTION_FIELDS,
      ownership: { managed: true, solution: 'security', domain: 'detection' },
    },
    // No `query` — execution-time rules persist none.
  } as Partial<RuleSavedObjectAttributes>);
  // Clear the query the helper defaults to.
  (executionExisting as unknown as { query: undefined }).query = undefined;

  // -------------------------------------------------------------------------
  // resolveCreateRuleBuilder — execution-time create
  // -------------------------------------------------------------------------

  describe('resolveCreateRuleBuilder — execution-time type', () => {
    it('does NOT call registry.generate for an execution-time type', () => {
      const generate = jest.fn();
      const typeMap = new Map([[EXECUTION_TYPE, makeExecutionDefinition()]]);
      const registry = createMockRegistryWithTypes(typeMap, generate);

      resolveCreateRuleBuilder(registry, executionCreateData);

      expect(generate).not.toHaveBeenCalled();
    });

    it('returns result with NO query field for an execution-time type', () => {
      const typeMap = new Map([[EXECUTION_TYPE, makeExecutionDefinition()]]);
      const registry = createMockRegistryWithTypes(typeMap);

      const result = resolveCreateRuleBuilder(registry, executionCreateData);

      // Explicitly assert absence — execution-time rules must persist no query.
      expect(result.query).toBeUndefined();
    });

    it('preserves builder_fields in the result (raw, not a parsed copy)', () => {
      const typeMap = new Map([[EXECUTION_TYPE, makeExecutionDefinition()]]);
      const registry = createMockRegistryWithTypes(typeMap);

      const result = resolveCreateRuleBuilder(registry, executionCreateData);

      // Same object reference as the request — raw, unparsed.
      expect(result.metadata.builder_fields).toBe(RAW_EXECUTION_FIELDS);
    });

    it('calls deriveRuleFields with the parsed fields and applies the result', () => {
      const derive = jest.fn<DerivedRuleFields, [unknown]>().mockReturnValue({
        grouping: { fields: ['user.name'] },
      });
      const typeMap = new Map([
        [
          EXECUTION_TYPE,
          makeExecutionDefinition({
            deriveRuleFields: derive as unknown as (
              fields: z.infer<typeof executionFieldsSchema>
            ) => DerivedRuleFields,
          }),
        ],
      ]);
      const registry = createMockRegistryWithTypes(typeMap);

      const result = resolveCreateRuleBuilder(registry, executionCreateData);

      // Derived grouping is persisted.
      expect(result.grouping).toEqual({ fields: ['user.name'] });
      // No query persisted.
      expect(result.query).toBeUndefined();
    });

    it('keeps the caller-sent grouping when deriveRuleFields returns undefined for grouping', () => {
      const derive = jest.fn<DerivedRuleFields, [unknown]>().mockReturnValue({});
      const typeMap = new Map([
        [
          EXECUTION_TYPE,
          makeExecutionDefinition({
            deriveRuleFields: derive as unknown as (
              fields: z.infer<typeof executionFieldsSchema>
            ) => DerivedRuleFields,
          }),
        ],
      ]);
      const registry = createMockRegistryWithTypes(typeMap);
      const data = {
        ...executionCreateData,
        grouping: { fields: ['source.ip'] },
      } as unknown as CreateRuleData;

      const result = resolveCreateRuleBuilder(registry, data);

      expect(result.grouping).toEqual({ fields: ['source.ip'] });
    });

    it('skips derivation and returns data as-is when validateBuilderFields is false and fields do not parse', () => {
      const derive = jest.fn<DerivedRuleFields, [unknown]>().mockReturnValue({
        grouping: { fields: ['user.name'] },
      });
      const typeMap = new Map([
        [
          EXECUTION_TYPE,
          makeExecutionDefinition({
            deriveRuleFields: derive as unknown as (
              fields: z.infer<typeof executionFieldsSchema>
            ) => DerivedRuleFields,
          }),
        ],
      ]);
      const registry = createMockRegistryWithTypes(typeMap);
      const badFieldsData = {
        ...executionCreateData,
        // Missing required 'index' field — will fail the Zod schema.
        metadata: {
          ...executionCreateData.metadata,
          builder_fields: { threshold_field: ['user.name'] },
        },
      } as unknown as CreateRuleData;

      // Under the validation opt-out, unparseable fields silently skip derivation.
      const result = resolveCreateRuleBuilder(registry, badFieldsData, {
        validateBuilderFields: false,
      });

      // Derivation skipped — no derived grouping, no query.
      expect(derive).not.toHaveBeenCalled();
      expect(result.query).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // resolveUpdateRuleBuilder — execution-time update
  // -------------------------------------------------------------------------

  describe('resolveUpdateRuleBuilder — execution-time type', () => {
    it('does NOT call registry.generate for an execution-time type update', () => {
      const generate = jest.fn();
      const typeMap = new Map([[EXECUTION_TYPE, makeExecutionDefinition()]]);
      const registry = createMockRegistryWithTypes(typeMap, generate);
      const data: UpdateRuleData = {
        metadata: { builder_type: EXECUTION_TYPE, builder_fields: RAW_EXECUTION_FIELDS },
      };

      resolveUpdateRuleBuilder(registry, RULE_ID, data, executionExisting);

      expect(generate).not.toHaveBeenCalled();
    });

    it('returns result with NO stored query for an execution-time type update (null signals clearance)', () => {
      // Execution-time types always set query: null so buildUpdateRuleAttributes
      // clears any stale stored query. The null sentinel is intentional —
      // undefined would be silently treated as "preserve" by buildUpdateRuleAttributes.
      const typeMap = new Map([[EXECUTION_TYPE, makeExecutionDefinition()]]);
      const registry = createMockRegistryWithTypes(typeMap);
      const data: UpdateRuleData = {
        metadata: { builder_fields: RAW_EXECUTION_FIELDS },
      };

      const result = resolveUpdateRuleBuilder(registry, RULE_ID, data, executionExisting);

      expect(result.query).toBeNull();
    });

    it('returns query: null to clear a stale stored query when switching from write-time to execution-time type', () => {
      // When a PATCH changes a rule's builder type from write-time to execution-time,
      // the stored query compiled by the old type must not survive. The resolver
      // signals buildUpdateRuleAttributes to clear it by returning query: null.
      //
      // Without this, "omitted = preserve" semantics in buildUpdateRuleAttributes
      // would keep the old compiled query in the saved object even though every
      // run now ignores it and compiles fresh from builder_fields.
      //
      // Ref: rule-execution-logic.md "A rule without a persisted query"
      //   ("no saved-object attribute, no cached last-compiled copy")
      const typeMap = new Map([[EXECUTION_TYPE, makeExecutionDefinition()]]);
      const registry = createMockRegistryWithTypes(typeMap);

      // Existing rule has a stored query from a write-time builder type.
      const writeTimeExisting: RuleSavedObjectAttributes = createRuleSoAttributes({
        kind: 'alert',
        metadata: {
          name: 'rule',
          builder_type: 'old.write_time_type',
          builder_fields: { q: 'old-fields' },
          ownership: { managed: false },
        },
        query: { format: 'standalone', breach: { query: 'FROM old-index | LIMIT 10' } },
      });

      const data: UpdateRuleData = {
        metadata: { builder_type: EXECUTION_TYPE, builder_fields: RAW_EXECUTION_FIELDS },
      };

      const result = resolveUpdateRuleBuilder(registry, RULE_ID, data, writeTimeExisting);

      // The resolver must return null, not undefined, so buildUpdateRuleAttributes
      // clears the stored query instead of preserving the old one.
      expect(result.query).toBeNull();
    });

    it('re-derives grouping on update when threshold_field changes', () => {
      // An update that changes `threshold_field` re-derives `grouping` in the
      // same write, keeping the stored grouping consistent with the fields.
      //
      // Ref: rule-execution-logic.md "Derived rule fields at write time"
      const derive = jest.fn<DerivedRuleFields, [{ index: string; threshold_field: string[] }]>(
        (fields) => ({ grouping: { fields: fields.threshold_field } })
      );
      const typeMap = new Map([
        [
          EXECUTION_TYPE,
          makeExecutionDefinition({
            deriveRuleFields: derive as unknown as (
              fields: z.infer<typeof executionFieldsSchema>
            ) => DerivedRuleFields,
          }),
        ],
      ]);
      const registry = createMockRegistryWithTypes(typeMap);
      const updatedFields = { index: 'logs-*', threshold_field: ['source.ip'] };
      const data: UpdateRuleData = {
        metadata: { builder_fields: updatedFields },
      };

      const result = resolveUpdateRuleBuilder(registry, RULE_ID, data, executionExisting);

      expect(result.grouping).toEqual({ fields: ['source.ip'] });
      expect(result.query).toBeNull(); // null clears any stale stored query
    });

    it('stamps the effective builder_type onto the result metadata', () => {
      const typeMap = new Map([[EXECUTION_TYPE, makeExecutionDefinition()]]);
      const registry = createMockRegistryWithTypes(typeMap);
      // Omit builder_type — should fall back to the stored type.
      const data: UpdateRuleData = { metadata: { builder_fields: RAW_EXECUTION_FIELDS } };

      const result = resolveUpdateRuleBuilder(registry, RULE_ID, data, executionExisting);

      expect(result.metadata?.builder_type).toBe(EXECUTION_TYPE);
    });

    it('skips derivation under the validation opt-out when fields do not parse', () => {
      const derive = jest.fn<DerivedRuleFields, [unknown]>().mockReturnValue({
        grouping: { fields: ['user.name'] },
      });
      const typeMap = new Map([
        [
          EXECUTION_TYPE,
          makeExecutionDefinition({
            deriveRuleFields: derive as unknown as (
              fields: z.infer<typeof executionFieldsSchema>
            ) => DerivedRuleFields,
          }),
        ],
      ]);
      const registry = createMockRegistryWithTypes(typeMap);
      const data: UpdateRuleData = {
        // Missing required 'index' field — fails the schema.
        metadata: { builder_fields: { threshold_field: ['user.name'] } },
      };

      const result = resolveUpdateRuleBuilder(registry, RULE_ID, data, executionExisting, {
        validateBuilderFields: false,
      });

      expect(derive).not.toHaveBeenCalled();
      expect(result.query).toBeNull(); // null clears any stale stored query
    });
  });
});
