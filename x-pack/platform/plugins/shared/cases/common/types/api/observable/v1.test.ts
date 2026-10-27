/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_OBSERVABLES_PER_CASE, OBSERVABLE_ID_MAX_LENGTH } from '../../../constants';
import { parseErrors } from '../../../test_helpers/zod_schema_test_utils';
import {
  AddObservableRequestSchema,
  BulkDeleteObservablesRequestSchema,
  UpdateObservableRequestSchema,
} from './v1';

describe('AddObservableRequestSchema', () => {
  it('has expected attributes in request', () => {
    const defaultRequest = {
      observable: {
        description: null,
        typeKey: 'ef528526-2af9-4345-9b78-046512c5bbd6',
        value: 'email@example.com',
      },
    };
    const result = AddObservableRequestSchema.safeParse(defaultRequest);
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(defaultRequest);
  });
});

describe('UpdateObservableRequestSchema', () => {
  it('has expected attributes in request', () => {
    const defaultRequest = {
      observable: {
        description: null,
        value: 'email@example.com',
      },
    };
    const result = UpdateObservableRequestSchema.safeParse(defaultRequest);
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(defaultRequest);
  });
});

describe('BulkDeleteObservablesRequestSchema', () => {
  const validRequest = {
    caseId: 'case-1',
    observableIds: ['obs-1', 'obs-2'],
  };

  it('has expected attributes in request', () => {
    const result = BulkDeleteObservablesRequestSchema.safeParse(validRequest);

    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(validRequest);
  });

  it('rejects an empty observableIds array', () => {
    expect(
      parseErrors(BulkDeleteObservablesRequestSchema, { caseId: 'case-1', observableIds: [] })
    ).toContain(
      'The length of the field observableIds is too short. Array must be of length >= 1.'
    );
  });

  it('rejects observableIds longer than MAX_OBSERVABLES_PER_CASE', () => {
    expect(
      parseErrors(BulkDeleteObservablesRequestSchema, {
        caseId: 'case-1',
        observableIds: new Array(MAX_OBSERVABLES_PER_CASE + 1).fill('obs-id'),
      })
    ).toContain(
      `The length of the field observableIds is too long. Array must be of length <= ${MAX_OBSERVABLES_PER_CASE}.`
    );
  });

  it('rejects empty strings in observableIds', () => {
    expect(
      parseErrors(BulkDeleteObservablesRequestSchema, { caseId: 'case-1', observableIds: [''] })
    ).toContain('The observableId field cannot be an empty string.');
  });

  it('rejects observableIds entries longer than OBSERVABLE_ID_MAX_LENGTH', () => {
    expect(
      parseErrors(BulkDeleteObservablesRequestSchema, {
        caseId: 'case-1',
        observableIds: ['a'.repeat(OBSERVABLE_ID_MAX_LENGTH + 1)],
      })
    ).toContain(
      `The length of the observableId is too long. The maximum length is ${OBSERVABLE_ID_MAX_LENGTH}.`
    );
  });

  it('rejects requests missing required fields', () => {
    expect(BulkDeleteObservablesRequestSchema.safeParse({ caseId: 'case-1' }).success).toBe(false);
    expect(BulkDeleteObservablesRequestSchema.safeParse({ observableIds: ['obs-1'] }).success).toBe(
      false
    );
  });
});
