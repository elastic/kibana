/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { deepFreeze } from '@kbn/std';
import { z } from '@kbn/zod/v4';
import {
  entitySchema,
  EntityDefinitionManagedBy,
  type EntityDefinitionType,
  type EntityDefinitionWithoutId,
} from '../../../../common/domain/definitions/entity_schema';

/**
 * Registry type names: lowercase alphanumeric segments separated by `.`, `_` or `-`, starting with
 * a letter. Separators cannot lead, trail or repeat. Examples: `host`, `k8s.pod`, `aws_s3-bucket`.
 * Length is capped separately by `ENTITY_DEFINITION_TYPE_MAX_LENGTH`.
 */
export const ENTITY_DEFINITION_TYPE_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
export const ENTITY_DEFINITION_TYPE_MAX_LENGTH = 64;

/** A definition as accepted by the registry: the built-in shape with a wider type name and a required `managedBy`. */
export type RegistrableEntityDefinition = Omit<EntityDefinitionWithoutId, 'type' | 'managedBy'> & {
  type: EntityDefinitionType;
  managedBy: EntityDefinitionManagedBy;
};

/** Registered definitions are deep-frozen, so this shallow `Readonly` is backed at runtime. */
export type RegisteredEntityDefinition = Readonly<RegistrableEntityDefinition>;

export type RegisterResult = { ok: true } | { ok: false; reason: string };

export interface RegistrationRejection {
  type: string;
  reason: string;
}

// Strict so unknown keys (notably a stale `id` from a full definition) are rejected, not kept.
const registrableEntityDefinitionSchema = entitySchema
  .omit({ id: true })
  .extend({
    // Any string here; the name pattern is checked separately.
    type: z.string(),
    managedBy: EntityDefinitionManagedBy,
  })
  .strict();

const formatSchemaIssues = (error: z.ZodError): string =>
  error.issues
    .map(({ path, message }) => (path.length ? `${path.join('.')}: ${message}` : message))
    .join('; ');

const describeType = (value: unknown): string => {
  if (typeof value === 'string') return value;
  return value === null ? '<null>' : `<${typeof value}>`;
};

const isObject = (value: unknown): value is object => typeof value === 'object' && value !== null;

/** Runs `read` and returns `fallback` if it throws. For diagnostics read from untrusted input. */
const safely = <T>(read: () => T, fallback: T): T => {
  try {
    return read();
  } catch {
    return fallback;
  }
};

/** Best-effort "who registered this" for the rejection log, read before validation. */
const describeManager = (definition: object): string | undefined => {
  const managedBy = (definition as { managedBy?: unknown }).managedBy;
  if (!isObject(managedBy)) return undefined;
  const { kind, id } = managedBy as { kind?: unknown; id?: unknown };
  if (typeof kind !== 'string') return undefined;
  return typeof id === 'string' ? `${kind} ${id}` : kind;
};

/**
 * Returns the path of the first circular reference in `value`, or `undefined`. Only an object that
 * is its own ancestor counts; the same object referenced from two places (a shared mapping
 * constant, say) is fine. Read-only, so it can run before anything is frozen.
 */
const findCycle = (
  value: unknown,
  path: string[] = [],
  ancestors = new Set<object>()
): string | undefined => {
  if (!isObject(value)) return undefined;
  if (ancestors.has(value)) return path.join('.') || '<root>';
  ancestors.add(value);
  for (const [key, child] of Object.entries(value)) {
    const found = findCycle(child, [...path, key], ancestors);
    if (found) return found;
  }
  ancestors.delete(value);
  return undefined;
};

/**
 * In-memory registry of entity definitions. Validates on registration, logs and records rejections
 * instead of throwing. Only plugin-managed definitions are accepted at setup, and type name
 * uniqueness is the only name protection. `list()` returns definitions in registration order; the
 * entity store registers its built-ins during its own setup, before dependent plugins can, so they
 * come first. It holds the passed-in objects themselves (built-ins stay shared with the
 * static lookup) and deep-freezes them in place at registration, so once registered nothing,
 * including the owner, can modify a definition. Reads return those same references.
 */
export class EntityDefinitionRegistry {
  private readonly entries = new Map<EntityDefinitionType, RegisteredEntityDefinition>();
  private readonly rejections: RegistrationRejection[] = [];
  private setupClosed = false;

  constructor(private readonly logger: Logger) {}

  public register(definition: RegistrableEntityDefinition): RegisterResult {
    if (!isObject(definition)) {
      return this.reject(describeType(definition), 'definition is not an object');
    }

    // Nothing in here may throw out to the caller: a bad definition from one plugin must not take
    // down that plugin's setup, let alone Kibana. Anything unexpected becomes a logged rejection.
    try {
      const reason = this.validate(definition);
      if (reason) {
        return this.reject(describeType(definition.type), reason, describeManager(definition));
      }

      // `@kbn/std`'s deepFreeze, as core's saved objects type registry uses. It recurses into
      // already-frozen objects too, so a top-level-only freeze by the caller is completed, and it
      // relies on the cycle check above. Its deep-readonly return type is deliberately not used.
      deepFreeze(definition);
      this.entries.set(definition.type, definition);
      return { ok: true };
    } catch (error) {
      // Reading `type` or `managedBy` here could throw again (an accessor-backed input), so both
      // are read through `safely`; the rejection must be reached whatever the input does.
      return this.reject(
        safely(() => describeType(definition.type), '<unreadable>'),
        `unexpected error during registration: ${
          error instanceof Error ? error.message : String(error)
        }`,
        safely(() => describeManager(definition), undefined)
      );
    }
  }

  /**
   * Closes code registration. Called when plugin setup has finished.
   *
   * Kibana already orders setup correctly: a plugin that depends on the entity store sets up after
   * it and before any plugin starts, so a well-formed plugin never hits this. The guard catches a
   * plugin that keeps the setup contract and calls `register` later, from `start`, a request
   * handler or a task. Such a definition would exist only on the node that made the call, so it is
   * logged and ignored rather than accepted or thrown.
   *
   * Definitions managed by integrations or users will arrive later through storage, not through
   * `register`, so this does not close the registry in general.
   */
  public closeSetupRegistration(): void {
    this.setupClosed = true;
  }

  public get(type: EntityDefinitionType): RegisteredEntityDefinition | undefined {
    return this.entries.get(type);
  }

  public list(): RegisteredEntityDefinition[] {
    return [...this.entries.values()];
  }

  public rejected(): RegistrationRejection[] {
    return [...this.rejections];
  }

  private validate(definition: RegistrableEntityDefinition): string | undefined {
    if (this.setupClosed) {
      return 'plugin setup has finished, definitions can no longer be registered in code';
    }

    const cycle = findCycle(definition);
    if (cycle) {
      return `definition contains a circular reference at '${cycle}'`;
    }

    const parsed = registrableEntityDefinitionSchema.safeParse(definition);
    if (!parsed.success) {
      return `definition failed schema validation: ${formatSchemaIssues(parsed.error)}`;
    }

    const { type, managedBy } = parsed.data;
    if (managedBy.kind !== 'plugin') {
      return 'only plugin-managed definitions can be registered at setup';
    }
    if (type.length > ENTITY_DEFINITION_TYPE_MAX_LENGTH) {
      return `type name exceeds the maximum length of ${ENTITY_DEFINITION_TYPE_MAX_LENGTH}`;
    }
    if (!ENTITY_DEFINITION_TYPE_PATTERN.test(type)) {
      return `type name does not match pattern ${ENTITY_DEFINITION_TYPE_PATTERN}`;
    }
    if (this.entries.has(type)) {
      return 'type name is already registered';
    }

    return undefined;
  }

  /** The single place every rejection is logged; callers must not log it again. */
  private reject(type: string, reason: string, manager?: string): RegisterResult {
    this.rejections.push({ type, reason });
    const who = manager ? ` (${manager})` : '';
    this.logger.error(`Rejected entity definition '${type}'${who}: ${reason}`);
    return { ok: false, reason };
  }
}
