/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolSchemaType } from '@kbn/inference-common';
import { MEMORY_ATTRIBUTES } from '../../../common/memory';
import type { LongTermMemoryType } from '../../../common/memory';
import type { MemoryReference, MemoryWriter, StoredMemoryDocument } from '../memory_document';
import { updateMemoryProvenance } from '../memory_document';

/** Operations every long-term memory type supports. */
export const SHARED_DREAM_OPERATIONS = ['create', 'reinforce', 'supersede', 'outdate'] as const;

export const VERIFICATION_DREAM_OPERATIONS = ['confirm', 'refute'] as const;

export const ENTITY_DREAM_OPERATIONS = ['add_aliases'] as const;

export type DreamOperationName =
  | (typeof SHARED_DREAM_OPERATIONS)[number]
  | (typeof VERIFICATION_DREAM_OPERATIONS)[number]
  | (typeof ENTITY_DREAM_OPERATIONS)[number];

export interface DreamOperation {
  op: DreamOperationName;
  /** The long-term memory the operation acts on. Required except for `create`. */
  target_id?: string;
  /** Identifies what the memory is about, so two memories never cover the same thing. */
  key?: string;
  title?: string;
  description?: string;
  content?: string;
  tags?: string[];
  /** Entities: what kind of thing the entity is. */
  kind?: string;
  /** Entities: other names the entity goes by. */
  aliases?: string[];
  /** Relationships: the long-term memories the relationship links, and how. */
  from_id?: string;
  to_id?: string;
  relation?: string;
  /** The short-term memories that support the operation. */
  source_ids: string[];
  reason?: string;
}

export interface DreamApplyContext {
  now: string;
  writer: MemoryWriter;
}

/** The fields a `create` or `supersede` writes, once the type has checked the operation. */
export interface PreparedMemory {
  key: string;
  title: string;
  description: string;
  content: string;
  attributes?: Record<string, string | string[]>;
  references?: MemoryReference[];
}

export type PrepareResult = { ok: true; memory: PreparedMemory } | { ok: false; reason: string };

export interface PrepareContext {
  /** The memory a `supersede` replaces. */
  target?: StoredMemoryDocument;
  /** Reads a live long-term memory of any type in this space. */
  getLiveMemory: (id: string) => Promise<StoredMemoryDocument | undefined>;
}

/** The result of a type-specific operation: a new revision, a tombstone of the target, or a skip. */
export type TypeOperationResult =
  | { kind: 'update'; document: StoredMemoryDocument }
  | { kind: 'tombstone'; document: StoredMemoryDocument }
  | { kind: 'skip'; reason: string };

export interface LongTermMemoryTypeDefinition {
  type: LongTermMemoryType;
  /** Plural label used in prompts and logs. */
  label: string;
  /** Tells the model what belongs in this type and when to use each operation. */
  instructions: string;
  operations: readonly DreamOperationName[];
  /** Type-specific properties the model may return in an operation. */
  outputProperties?: Record<string, ToolSchemaType>;
  /** The types this type links. It is dreamed after them, and its candidates include them. */
  endpointTypes?: readonly LongTermMemoryType[];
  /** Type-specific attributes for a newly created memory. */
  initialAttributes: (context: DreamApplyContext) => Record<string, string>;
  /** Checks a `create` or `supersede` and builds the memory to write. */
  prepare: (
    operation: DreamOperation,
    context: PrepareContext
  ) => PrepareResult | Promise<PrepareResult>;
  /** Type-specific lines shown to the model for an existing memory. */
  describe?: (memory: StoredMemoryDocument) => string[];
  /** Applies an operation outside {@link SHARED_DREAM_OPERATIONS}. */
  applyOperation?: (
    operation: DreamOperation,
    existing: StoredMemoryDocument,
    context: DreamApplyContext
  ) => TypeOperationResult | undefined;
}

export const readAttribute = (
  memory: StoredMemoryDocument | undefined,
  name: string
): string | undefined => {
  const value = memory?.attributes?.[name];
  return typeof value === 'string' ? value : undefined;
};

export const readListAttribute = (
  memory: StoredMemoryDocument | undefined,
  name: string
): string[] => {
  const value = memory?.attributes?.[name];
  return Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
};

/** Prepares a memory whose key the model supplies. A `supersede` keeps the target's key. */
export const prepareWithModelKey = (
  operation: DreamOperation,
  { target }: PrepareContext
): PrepareResult => {
  const key = operation.key ?? readAttribute(target, MEMORY_ATTRIBUTES.key);
  const { title, description, content } = operation;
  if (!(key && title && description && content)) {
    return { ok: false, reason: 'it is missing key, title, description or content' };
  }
  return { ok: true, memory: { key, title, description, content } };
};

interface VerificationAttributes {
  status: string;
  updatedAt: string;
  by: string;
}

/** `confirm` and `refute` for a type that tracks whether sessions proved its memories right. */
export const withVerification = ({
  status,
  updatedAt,
  by,
}: VerificationAttributes): Pick<
  LongTermMemoryTypeDefinition,
  'initialAttributes' | 'describe' | 'applyOperation'
> => {
  const setVerification = (
    existing: StoredMemoryDocument,
    value: 'confirmed' | 'refuted',
    { now, writer }: DreamApplyContext
  ): StoredMemoryDocument => ({
    ...existing,
    updated_at: now,
    attributes: { ...existing.attributes, [status]: value, [updatedAt]: now, [by]: writer.uri },
    governance: updateMemoryProvenance(existing.governance, writer, false),
  });

  return {
    initialAttributes: ({ now, writer }) => ({
      [status]: 'unverified',
      [updatedAt]: now,
      [by]: writer.uri,
    }),
    describe: (memory) => {
      const value = readAttribute(memory, status);
      return value === undefined ? [] : [`verification: ${value}`];
    },
    applyOperation: (operation, existing, context) => {
      if (operation.op === 'confirm') {
        return { kind: 'update', document: setVerification(existing, 'confirmed', context) };
      }
      if (operation.op === 'refute') {
        return { kind: 'tombstone', document: setVerification(existing, 'refuted', context) };
      }
      return undefined;
    },
  };
};
