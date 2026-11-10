/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENTITY_TYPE_PREFIX,
  FACT_TYPE_PREFIX,
  OCCURRENCES_ATTRIBUTE,
  PROCEDURE_TYPE_PREFIX,
} from '../../common/dreaming';
import type { KiReferenceRelation } from '../../common/step_types/ki';
import type { StoredKi } from '../ai_indices/ki_revision';
import { kiIdFromUri } from './ids';
import type { KiPermissions } from './permissions';

export type DreamedKiAttributes = Record<string, string | number | boolean | string[]>;

export interface DreamedKiReference {
  uri: string;
  relation?: KiReferenceRelation;
}

/** A fact, entity or procedure as dreaming reads and writes it. */
export interface DreamedKi extends StoredKi {
  id: string;
  type: string;
  title: string;
  description?: string;
  content?: string;
  attributes?: DreamedKiAttributes;
  references?: DreamedKiReference[];
  permissions?: KiPermissions;
}

export type DreamedKiKind = 'entity' | 'fact' | 'procedure';

export const kindOf = (ki: Pick<DreamedKi, 'type'>): DreamedKiKind | undefined => {
  if (ki.type.startsWith(ENTITY_TYPE_PREFIX)) {
    return 'entity';
  }
  if (ki.type.startsWith(FACT_TYPE_PREFIX)) {
    return 'fact';
  }
  if (ki.type.startsWith(PROCEDURE_TYPE_PREFIX)) {
    return 'procedure';
  }
  return undefined;
};

/** The memories a fact, entity or procedure was derived from. */
export const citedMemoryIds = (ki: DreamedKi): string[] =>
  (ki.references ?? []).flatMap(({ uri, relation }) => {
    const memoryId = relation === 'derived_from' ? kiIdFromUri(uri) : undefined;
    return memoryId !== undefined ? [memoryId] : [];
  });

/** How many memories a fact, entity or procedure was seen in. */
export const occurrencesOf = (ki: DreamedKi | undefined): number => {
  const stored = ki?.attributes?.[OCCURRENCES_ATTRIBUTE];
  return typeof stored === 'number' ? stored : ki ? citedMemoryIds(ki).length : 0;
};
