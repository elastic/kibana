/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DREAMING_TYPE_PATTERN,
  ENTITY_TYPE_PREFIX,
  FACT_TYPE_PREFIX,
  MEMORY_ATTRIBUTE_PREFIX,
  PROCEDURE_TYPE_PREFIX,
  dreamingTypesOf,
  type AiIndexDreamingConfig,
} from '../../common/dreaming';
import type { AccessPattern, DreamChangeSet } from '../../common/step_types/apply_dream_changes';
import { baseContent } from './access_patterns';
import { citedMemoryIds, kindOf, type DreamedKi, type DreamedKiKind } from './dreamed_ki';
import { batchKeyOf, entityId, factId, procedureId } from './ids';

const NEW_REF_PREFIX = 'new:';

/** The fact, entity and procedure types the model may write. */
export interface DreamingVocabulary {
  factTypes: ReadonlySet<string>;
  /** Each entity type with its attribute keys. */
  entityTypes: ReadonlyMap<string, ReadonlySet<string>>;
  procedureTypes: ReadonlySet<string>;
}

export const vocabularyOf = (config: AiIndexDreamingConfig): DreamingVocabulary => {
  const { facts, entities, procedures } = dreamingTypesOf(config);
  return {
    factTypes: new Set(facts.map(({ type }) => type)),
    entityTypes: new Map(entities.map(({ type, attributes }) => [type, new Set(attributes ?? [])])),
    procedureTypes: new Set(procedures.map(({ type }) => type)),
  };
};

export interface ResolveContext {
  executionId: string;
  vocabulary: DreamingVocabulary;
  /** When each memory the model was shown was recorded, by id. */
  memories: ReadonlyMap<string, string | undefined>;
  /** The current facts, entities and procedures the change set refers to, by id. */
  existing: ReadonlyMap<string, DreamedKi>;
}

export interface UpsertEntityOperation {
  op: 'upsert_entity';
  id: string;
  type: string;
  title: string;
  description?: string;
  content?: string;
  attributes: Record<string, string>;
  /** Replaces the entity's access patterns. `undefined` keeps them. */
  accessPatterns?: AccessPattern[];
  sourceMemoryIds: string[];
  /** When the latest of its sources was recorded. */
  lastSeenAt?: string;
}

export interface UpsertFactOperation {
  op: 'upsert_fact';
  id: string;
  type: string;
  title: string;
  content: string;
  /** Replaces the fact's access patterns. `undefined` keeps them. */
  accessPatterns?: AccessPattern[];
  sourceMemoryIds: string[];
  lastSeenAt?: string;
}

export interface UpsertProcedureOperation {
  op: 'upsert_procedure';
  id: string;
  type: string;
  /** The task the procedure does. */
  title: string;
  /** When to use it. */
  description?: string;
  /** The numbered steps. */
  content: string;
  sourceMemoryIds: string[];
  lastSeenAt?: string;
}

export interface DeleteOperation {
  op: 'delete';
  id: string;
}

export type DreamingOperation =
  | UpsertEntityOperation
  | UpsertFactOperation
  | UpsertProcedureOperation
  | DeleteOperation;

export interface ResolvedChangeSet {
  operations: DreamingOperation[];
  rejected: Array<{ item: string; reason: string }>;
}

/** The ids of the existing KIs a change set refers to. */
export const referencedIds = ({ entities, facts, procedures }: DreamChangeSet): string[] => {
  const refs = [...entities, ...facts, ...procedures].map(({ ref }) => ref);
  return [...new Set(refs.filter((ref) => !ref.startsWith(NEW_REF_PREFIX)))];
};

const withoutPrefix = (type: string | undefined, prefix: string): string | undefined =>
  type?.startsWith(prefix) ? type.slice(prefix.length) : type;

class RejectedItemError extends Error {}

const reject: (reason: string) => never = (reason) => {
  throw new RejectedItemError(reason);
};

/** Validates a change set and resolves its refs to KI ids, rejecting invalid items. */
export const resolveChangeSet = (
  changeSet: DreamChangeSet,
  { executionId, vocabulary, memories, existing }: ResolveContext
): ResolvedChangeSet => {
  const operations: DreamingOperation[] = [];
  const rejected: ResolvedChangeSet['rejected'] = [];
  const batchKey = batchKeyOf(memories.keys());

  const attempt = (item: string, run: () => void) => {
    try {
      run();
    } catch (error) {
      if (!(error instanceof RejectedItemError)) {
        throw error;
      }
      rejected.push({ item, reason: error.message });
    }
  };

  const resolveSources = (ids: readonly string[] | undefined, current?: DreamedKi): string[] => {
    const allowed = new Set([...memories.keys(), ...(current ? citedMemoryIds(current) : [])]);
    const cited = [...new Set(ids ?? [])];
    if (cited.length === 0) {
      reject('cites no source memories');
    }
    const sources = cited.filter((id) => allowed.has(id));
    if (sources.length === 0) {
      reject(`cites memories it was not shown: ${cited.join(', ')}`);
    }
    return sources;
  };

  const lastSeenAtOf = (sourceIds: readonly string[]): { lastSeenAt?: string } => {
    const recordedAt = sourceIds
      .flatMap((id) => memories.get(id) ?? [])
      .filter((date) => !Number.isNaN(Date.parse(date)))
      .sort((a, b) => Date.parse(a) - Date.parse(b));
    const lastSeenAt = recordedAt[recordedAt.length - 1];
    return lastSeenAt !== undefined ? { lastSeenAt } : {};
  };

  const existingOfKind = (ref: string, kind: DreamedKiKind): DreamedKi | undefined => {
    const ki = existing.get(ref);
    if (ki && kindOf(ki) !== kind) {
      reject(`'${ref}' is not an existing ${kind}`);
    }
    return ki;
  };

  for (const entity of changeSet.entities) {
    attempt(`entity ${entity.ref}`, () => {
      if (vocabulary.entityTypes.size === 0) {
        reject('this AI index does not build entities');
      }
      const current = existingOfKind(entity.ref, 'entity');
      if (entity.delete) {
        if (!current) {
          reject('only an existing entity can be deleted');
        }
        operations.push({ op: 'delete', id: entity.ref });
        return;
      }
      const type =
        withoutPrefix(entity.type, ENTITY_TYPE_PREFIX) ??
        current?.type.slice(ENTITY_TYPE_PREFIX.length);
      const title = entity.title ?? current?.title;
      if (!type || !title) {
        reject('a new entity needs a type and a title');
      }
      if (!DREAMING_TYPE_PATTERN.test(type)) {
        reject(`type '${type}' must be lowercase letters, digits, and underscores`);
      }
      const allowedAttributes = vocabulary.entityTypes.get(type);
      if (!allowedAttributes) {
        reject(`entity type '${type}' is not configured`);
      }
      const attributes: Record<string, string> = {};
      for (const { key, value } of entity.attributes ?? []) {
        if (key.startsWith(MEMORY_ATTRIBUTE_PREFIX)) {
          continue;
        }
        if (!allowedAttributes.has(key)) {
          reject(`attribute '${key}' is not configured for entity type '${type}'`);
        }
        attributes[key] = value;
      }
      const sourceMemoryIds = resolveSources(entity.source_memory_ids, current);
      operations.push({
        op: 'upsert_entity',
        id: current?.id ?? entityId(type, title),
        type,
        title,
        ...(entity.description !== undefined && { description: entity.description }),
        ...(entity.content !== undefined && { content: entity.content }),
        attributes,
        ...(entity.access_patterns && { accessPatterns: entity.access_patterns }),
        sourceMemoryIds,
        ...lastSeenAtOf(sourceMemoryIds),
      });
    });
  }

  for (const fact of changeSet.facts) {
    attempt(`fact ${fact.ref}`, () => {
      if (vocabulary.factTypes.size === 0) {
        reject('this AI index does not build facts');
      }
      const current = existingOfKind(fact.ref, 'fact');
      if (fact.delete) {
        if (!current) {
          reject('only an existing fact can be deleted');
        }
        operations.push({ op: 'delete', id: fact.ref });
        return;
      }
      if (!current && !fact.ref.startsWith(NEW_REF_PREFIX)) {
        reject(`'${fact.ref}' is neither an existing fact nor a new key`);
      }
      const type =
        withoutPrefix(fact.type, FACT_TYPE_PREFIX) ?? current?.type.slice(FACT_TYPE_PREFIX.length);
      const title = fact.title ?? current?.title;
      const content = fact.content ?? baseContent(current?.content);
      if (!type || !title || !content) {
        reject('a fact needs a type, a title, and content');
      }
      if (!vocabulary.factTypes.has(type)) {
        reject(`fact type '${type}' is not configured`);
      }
      const sourceMemoryIds = resolveSources(fact.source_memory_ids, current);
      operations.push({
        op: 'upsert_fact',
        id: current?.id ?? factId(executionId, batchKey, fact.ref),
        type,
        title,
        content,
        ...(fact.access_patterns && { accessPatterns: fact.access_patterns }),
        sourceMemoryIds,
        ...lastSeenAtOf(sourceMemoryIds),
      });
    });
  }

  for (const procedure of changeSet.procedures) {
    attempt(`procedure ${procedure.ref}`, () => {
      if (vocabulary.procedureTypes.size === 0) {
        reject('this AI index does not build procedures');
      }
      const current = existingOfKind(procedure.ref, 'procedure');
      if (procedure.delete) {
        if (!current) {
          reject('only an existing procedure can be deleted');
        }
        operations.push({ op: 'delete', id: procedure.ref });
        return;
      }
      if (!current && !procedure.ref.startsWith(NEW_REF_PREFIX)) {
        reject(`'${procedure.ref}' is neither an existing procedure nor a new key`);
      }
      const type =
        withoutPrefix(procedure.type, PROCEDURE_TYPE_PREFIX) ??
        current?.type.slice(PROCEDURE_TYPE_PREFIX.length);
      const title = procedure.title ?? current?.title;
      const content = procedure.content ?? current?.content;
      if (!type || !title || !content) {
        reject('a procedure needs a type, a title, and content');
      }
      if (!vocabulary.procedureTypes.has(type)) {
        reject(`procedure type '${type}' is not configured`);
      }
      const sourceMemoryIds = resolveSources(procedure.source_memory_ids, current);
      operations.push({
        op: 'upsert_procedure',
        id: current?.id ?? procedureId(executionId, batchKey, procedure.ref),
        type,
        title,
        ...(procedure.description !== undefined && { description: procedure.description }),
        content,
        sourceMemoryIds,
        ...lastSeenAtOf(sourceMemoryIds),
      });
    });
  }

  return { operations, rejected };
};
