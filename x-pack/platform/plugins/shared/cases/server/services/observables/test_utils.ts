/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsBulkResponse } from '@kbn/core/server';
import { CASE_OBSERVABLE_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../../common/constants';
import { CASE_REF_NAME } from '../../common/constants';
import type { ObservablePersistedAttributes } from '../../common/types/observable';

export const NAMESPACE = 'space-1';
export const CASE_ID = 'case-1';
export const user = { username: 'analyst', full_name: 'Analyst', email: null };

export const attributes = (
  overrides: Partial<ObservablePersistedAttributes> = {}
): ObservablePersistedAttributes => ({
  owner: 'securitySolution',
  type_key: 'observable-type-ipv4',
  value: '10.0.0.8',
  description: null,
  source_attachment_id: null,
  created_at: '2026-11-06T09:30:00.000Z',
  created_by: user,
  updated_at: null,
  updated_by: null,
  ...overrides,
});

export const savedObject = (id: string, caseId = CASE_ID) => ({
  id,
  type: CASE_OBSERVABLE_SAVED_OBJECT,
  attributes: attributes(),
  references: [{ type: CASE_SAVED_OBJECT, name: CASE_REF_NAME, id: caseId }],
});

export const errorResult = (id: string, statusCode: number, message: string) => ({
  id,
  type: CASE_OBSERVABLE_SAVED_OBJECT,
  error: { statusCode, error: 'Error', message },
});

export const bulkResponse = (
  savedObjects: Array<ReturnType<typeof savedObject> | ReturnType<typeof errorResult>>
) => ({ saved_objects: savedObjects } as SavedObjectsBulkResponse<ObservablePersistedAttributes>);
