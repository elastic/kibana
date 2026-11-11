/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_TYPE_PREFIX, FACT_TYPE_PREFIX, OCCURRENCES_ATTRIBUTE } from '../../common/dreaming';
import type { KiReferenceRelation } from '../../common/step_types/ki';
import type { StoredKi } from '../ai_indices/ki_revision';
import { memoryIdFromUri } from './ids';
import type { KiPermissions } from './permissions';

export type DreamedKiAttributes = Record<string, string | number | boolean | string[]>;

export interface DreamedKiReference {
  uri: string;
  relation?: KiReferenceRelation;
  /** The relationship type, or `about`, on a `relates_to` reference stored before relationships were removed. */
  description?: string;
}

/** A fact or entity as dreaming reads and writes it. */
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

export type DreamedKiKind = 'entity' | 'fact';

export const kindOf = (ki: Pick<DreamedKi, 'type'>): DreamedKiKind | undefined => {
  if (ki.type.startsWith(ENTITY_TYPE_PREFIX)) {
    return 'entity';
  }
  if (ki.type.startsWith(FACT_TYPE_PREFIX)) {
    return 'fact';
  }
  return undefined;
};

/** The memories a fact or entity was derived from. */
export const citedMemoryIds = (ki: DreamedKi): string[] =>
  (ki.references ?? []).flatMap(({ uri, relation }) => {
    const memoryId = relation === 'derived_from' ? memoryIdFromUri(uri) : undefined;
    return memoryId !== undefined ? [memoryId] : [];
  });

/** How many memories a fact or entity was seen in. */
export const occurrencesOf = (ki: DreamedKi | undefined): number => {
  const stored = ki?.attributes?.[OCCURRENCES_ATTRIBUTE];
  return typeof stored === 'number' ? stored : ki ? citedMemoryIds(ki).length : 0;
};
