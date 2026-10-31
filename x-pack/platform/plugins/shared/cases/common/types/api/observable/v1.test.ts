/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_OBSERVABLES_PER_PAGE,
  MAX_OBSERVABLE_TYPE_KEY_LENGTH,
  MAX_OBSERVABLES_CURSOR_LENGTH,
  MAX_OBSERVABLES_FIND_TYPE_KEYS,
  MAX_OBSERVABLES_PER_CASE,
  MAX_OBSERVABLES_PER_PAGE,
  OBSERVABLE_ID_MAX_LENGTH,
} from '../../../constants';
import { parseErrors } from '../../../test_helpers/zod_schema_test_utils';
import {
  AddObservableRequestSchema,
  BulkDeleteObservablesRequestSchema,
  FindObservablesRequestSchema,
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

describe('FindObservablesRequestSchema', () => {
  it('defaults to the oldest observables first, one default page at a time', () => {
    const result = FindObservablesRequestSchema.safeParse({});

    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual({
      sortField: 'created',
      sortOrder: 'asc',
      perPage: DEFAULT_OBSERVABLES_PER_PAGE,
    });
  });

  it('accepts every filter, sort and paging attribute', () => {
    const request = {
      typeKeys: ['ef528526-2af9-4345-9b78-046512c5bbd6'],
      sortField: 'value',
      sortOrder: 'desc',
      perPage: MAX_OBSERVABLES_PER_PAGE,
      cursor: 'abc',
    };

    expect(FindObservablesRequestSchema.safeParse(request).data).toStrictEqual(request);
  });

  it.each(['created', 'updated', 'value', 'type'])('accepts sorting by %s', (sortField) => {
    expect(FindObservablesRequestSchema.safeParse({ sortField }).success).toBe(true);
  });

  it('rejects an unknown sort field and an unknown sort order', () => {
    expect(FindObservablesRequestSchema.safeParse({ sortField: 'description' }).success).toBe(
      false
    );
    expect(FindObservablesRequestSchema.safeParse({ sortOrder: 'up' }).success).toBe(false);
  });

  it('rejects a page size outside of 1 to the maximum', () => {
    expect(parseErrors(FindObservablesRequestSchema, { perPage: 0 })).toContain(
      'The perPage field cannot be less than 1.'
    );
    expect(
      parseErrors(FindObservablesRequestSchema, { perPage: MAX_OBSERVABLES_PER_PAGE + 1 })
    ).toContain(`The perPage field cannot be more than ${MAX_OBSERVABLES_PER_PAGE}.`);
  });

  it('rejects more type keys than the maximum', () => {
    expect(
      parseErrors(FindObservablesRequestSchema, {
        typeKeys: Array.from({ length: MAX_OBSERVABLES_FIND_TYPE_KEYS + 1 }, () => 'key'),
      })
    ).toContain(
      `The length of the field typeKeys is too long. Array must be of length <= ${MAX_OBSERVABLES_FIND_TYPE_KEYS}.`
    );
  });

  it('rejects type keys that are empty or longer than a type key can be', () => {
    expect(parseErrors(FindObservablesRequestSchema, { typeKeys: [''] })).toContain(
      'The typeKeys field cannot be an empty string.'
    );
    expect(
      parseErrors(FindObservablesRequestSchema, {
        typeKeys: ['a'.repeat(MAX_OBSERVABLE_TYPE_KEY_LENGTH + 1)],
      })
    ).toContain(
      `The length of the typeKeys is too long. The maximum length is ${MAX_OBSERVABLE_TYPE_KEY_LENGTH}.`
    );
  });

  it('rejects a cursor longer than a cursor can be', () => {
    expect(
      parseErrors(FindObservablesRequestSchema, {
        cursor: 'a'.repeat(MAX_OBSERVABLES_CURSOR_LENGTH + 1),
      })
    ).toContain(
      `The length of the cursor is too long. The maximum length is ${MAX_OBSERVABLES_CURSOR_LENGTH}.`
    );
  });
});
