/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { z } from '@kbn/zod/v4';
import {
  ALL_ENTITY_TYPES,
  entitySchema,
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

/** Built-in names (`user`, `host`, `service`, `generic`) in listing order. Only `registerBuiltIn` may use them. */
const RESERVED_TYPES: readonly EntityDefinitionType[] = ALL_ENTITY_TYPES;

/** A definition as accepted by the registry: the built-in shape with a wider type name. */
export type RegistrableEntityDefinition = Omit<EntityDefinitionWithoutId, 'type'> & {
  type: EntityDefinitionType;
};

/** Registered definitions are deep-frozen, so this shallow `Readonly` is backed at runtime. */
export type RegisteredEntityDefinition = Readonly<RegistrableEntityDefinition>;

export type RegisterResult = { ok: true } | { ok: false; reason: string };

export interface RegistrationRejection {
  type: string;
  reason: string;
}

type Provenance = 'builtIn' | 'other';

interface RegistryEntry {
  definition: RegisteredEntityDefinition;
  provenance: Provenance;
}

// Strict so unknown keys (notably a stale `id` from a full definition) are rejected, not kept.
const registrableEntityDefinitionSchema = entitySchema
  .omit({ id: true })
  .extend({
    // Any string here; the name pattern and reservation are checked separately.
    type: z.string(),
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

// Always recurses, so an object frozen only at the top level still has its children frozen.
const deepFreeze = <T>(value: T): T => {
  if (!isObject(value)) return value;
  Object.values(value).forEach(deepFreeze);
  if (!Object.isFrozen(value)) Object.freeze(value);
  return value;
};

/**
 * In-memory registry of entity definitions. Validates on registration, logs and records rejections
 * instead of throwing. It holds the passed-in objects themselves (built-ins stay shared with the
 * static lookup) and deep-freezes them in place at registration, so once registered nothing,
 * including the owner, can modify a definition. Reads return those same references.
 */
export class EntityDefinitionRegistry {
  private readonly entries = new Map<EntityDefinitionType, RegistryEntry>();
  private readonly rejections: RegistrationRejection[] = [];
  private frozen = false;

  constructor(private readonly logger: Logger) {}

  public register(definition: RegistrableEntityDefinition): RegisterResult {
    return this.add(definition, 'other');
  }

  public registerBuiltIn(definition: RegistrableEntityDefinition): RegisterResult {
    return this.add(definition, 'builtIn');
  }

  public freeze(): void {
    this.frozen = true;
  }

  public get(type: EntityDefinitionType): RegisteredEntityDefinition | undefined {
    return this.entries.get(type)?.definition;
  }

  public list(): RegisteredEntityDefinition[] {
    const entries = [...this.entries.values()];
    const builtIns = RESERVED_TYPES.flatMap((type) => {
      const entry = this.entries.get(type);
      return entry?.provenance === 'builtIn' ? [entry] : [];
    });
    const others = entries.filter(({ provenance }) => provenance === 'other');

    return [...builtIns, ...others].map(({ definition }) => definition);
  }

  public listMaterialized(): RegisteredEntityDefinition[] {
    return this.list().filter(({ materialization }) => materialization === 'extracted');
  }

  public rejected(): RegistrationRejection[] {
    return [...this.rejections];
  }

  private add(definition: RegistrableEntityDefinition, provenance: Provenance): RegisterResult {
    if (!isObject(definition)) {
      return this.reject(describeType(definition), 'definition is not an object');
    }

    const reason = this.validate(definition, provenance);
    if (reason) {
      return this.reject(describeType(definition.type), reason);
    }

    this.entries.set(definition.type, {
      definition: deepFreeze(definition),
      provenance,
    });
    return { ok: true };
  }

  private validate(
    definition: RegistrableEntityDefinition,
    provenance: Provenance
  ): string | undefined {
    if (this.frozen) {
      return 'registry is frozen, registrations are no longer accepted';
    }

    const parsed = registrableEntityDefinitionSchema.safeParse(definition);
    if (!parsed.success) {
      return `definition failed schema validation: ${formatSchemaIssues(parsed.error)}`;
    }

    const { type } = parsed.data;
    if (type.length > ENTITY_DEFINITION_TYPE_MAX_LENGTH) {
      return `type name exceeds the maximum length of ${ENTITY_DEFINITION_TYPE_MAX_LENGTH}`;
    }
    if (!ENTITY_DEFINITION_TYPE_PATTERN.test(type)) {
      return `type name does not match pattern ${ENTITY_DEFINITION_TYPE_PATTERN}`;
    }
    const isReserved = RESERVED_TYPES.includes(type);
    if (provenance === 'builtIn' && !isReserved) {
      return 'type name is not a built-in';
    }
    if (provenance !== 'builtIn' && isReserved) {
      return 'type name is reserved for built-in definitions';
    }
    if (this.entries.has(type)) {
      return 'type name is already registered';
    }

    return undefined;
  }

  private reject(type: string, reason: string): RegisterResult {
    this.rejections.push({ type, reason });
    this.logger.error(`Rejected entity definition '${type}': ${reason}`);
    return { ok: false, reason };
  }
}
