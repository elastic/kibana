/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
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

/** Best-effort "who registered this" for the rejection log, read before validation. */
const describeManager = (definition: object): string | undefined => {
  const managedBy = (definition as { managedBy?: unknown }).managedBy;
  if (!isObject(managedBy)) return undefined;
  const { kind, id } = managedBy as { kind?: unknown; id?: unknown };
  if (typeof kind !== 'string') return undefined;
  return typeof id === 'string' ? `${kind} ${id}` : kind;
};

// Always recurses, so an object frozen only at the top level still has its children frozen.
const deepFreeze = <T>(value: T): T => {
  if (!isObject(value)) return value;
  Object.values(value).forEach(deepFreeze);
  if (!Object.isFrozen(value)) Object.freeze(value);
  return value;
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

    const reason = this.validate(definition);
    if (reason) {
      return this.reject(describeType(definition.type), reason, describeManager(definition));
    }

    this.entries.set(definition.type, deepFreeze(definition));
    return { ok: true };
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
