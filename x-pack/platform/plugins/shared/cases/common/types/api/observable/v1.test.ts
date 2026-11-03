/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_OBSERVABLE_DESCRIPTION_LENGTH,
  MAX_OBSERVABLE_VALUE_LENGTH,
  MAX_OBSERVABLES_PER_CASE,
  OBSERVABLE_ID_MAX_LENGTH,
} from '../../../constants';
import { parseErrors } from '../../../test_helpers/zod_schema_test_utils';
import {
  AddObservableRequestSchema,
  BulkAddObservablesRequestSchema,
  BulkDeleteObservablesRequestSchema,
  UpdateObservableRequestSchema,
} from './v1';

describe('observable value and description bounds', () => {
  const typeKey = 'ef528526-2af9-4345-9b78-046512c5bbd6';
  const withValue = (value: string) => ({ typeKey, value, description: null });
  const withDescription = (description: string) => ({ typeKey, value: 'a', description });

  it.each([
    [
      'AddObservableRequestSchema',
      (observable: object) => AddObservableRequestSchema.safeParse({ observable }),
    ],
    [
      'BulkAddObservablesRequestSchema',
      (observable: object) =>
        BulkAddObservablesRequestSchema.safeParse({ caseId: 'case-1', observables: [observable] }),
    ],
  ])('%s accepts a value and description at the maximum length', (_name, parse) => {
    expect(parse(withValue('a'.repeat(MAX_OBSERVABLE_VALUE_LENGTH))).success).toBe(true);
    expect(parse(withDescription('a'.repeat(MAX_OBSERVABLE_DESCRIPTION_LENGTH))).success).toBe(
      true
    );
  });

  it.each([
    [
      'AddObservableRequestSchema',
      (observable: object) => AddObservableRequestSchema.safeParse({ observable }),
    ],
    [
      'BulkAddObservablesRequestSchema',
      (observable: object) =>
        BulkAddObservablesRequestSchema.safeParse({ caseId: 'case-1', observables: [observable] }),
    ],
  ])('%s rejects a value or description one character over the maximum', (_name, parse) => {
    expect(parse(withValue('a'.repeat(MAX_OBSERVABLE_VALUE_LENGTH + 1))).success).toBe(false);
    expect(parse(withDescription('a'.repeat(MAX_OBSERVABLE_DESCRIPTION_LENGTH + 1))).success).toBe(
      false
    );
  });

  it('UpdateObservableRequestSchema accepts the maximum length and rejects one over', () => {
    const parse = (value: string, description: string | null) =>
      UpdateObservableRequestSchema.safeParse({ observable: { value, description } });

    expect(
      parse('a'.repeat(MAX_OBSERVABLE_VALUE_LENGTH), 'a'.repeat(MAX_OBSERVABLE_DESCRIPTION_LENGTH))
        .success
    ).toBe(true);
    expect(parse('a'.repeat(MAX_OBSERVABLE_VALUE_LENGTH + 1), null).success).toBe(false);
    expect(parse('a', 'a'.repeat(MAX_OBSERVABLE_DESCRIPTION_LENGTH + 1)).success).toBe(false);
  });
});

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
