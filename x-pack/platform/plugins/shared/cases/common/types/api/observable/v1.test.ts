/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
import { MAX_OBSERVABLES_PER_CASE, OBSERVABLE_ID_MAX_LENGTH } from '../../../constants';
import {
  AddObservableRequestRt,
  BulkDeleteObservablesRequestRt,
  UpdateObservableRequestRt,
} from './v1';
import {
  AddObservableRequestSchema,
  UpdateObservableRequestSchema,
} from '../../api_zod/observable/v1';

describe('AddObservableRequestRT', () => {
  it('has expected attributes in request', () => {
    const defaultRequest = {
      observable: {
        description: null,
        typeKey: 'ef528526-2af9-4345-9b78-046512c5bbd6',
        value: 'email@example.com',
      },
    };

    const query = AddObservableRequestRt.decode(defaultRequest);

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: defaultRequest,
    });
  });

  it('zod: has expected attributes in request', () => {
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

describe('UpdateObservableRequestRT', () => {
  it('has expected attributes in request', () => {
    const defaultRequest = {
      observable: {
        description: null,
        value: 'email@example.com',
      },
    };

    const query = UpdateObservableRequestRt.decode(defaultRequest);

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: defaultRequest,
    });
  });

  it('zod: has expected attributes in request', () => {
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

describe('BulkDeleteObservablesRequestRt', () => {
  const validRequest = {
    caseId: 'case-1',
    observableIds: ['obs-1', 'obs-2'],
  };

  it('has expected attributes in request', () => {
    const query = BulkDeleteObservablesRequestRt.decode(validRequest);

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: validRequest,
    });
  });

  it('rejects an empty observableIds array', () => {
    const query = BulkDeleteObservablesRequestRt.decode({
      caseId: 'case-1',
      observableIds: [],
    });

    expect(query._tag).toBe('Left');
    expect(PathReporter.report(query)).toContain(
      'The length of the field observableIds is too short. Array must be of length >= 1.'
    );
  });

  it('rejects observableIds longer than MAX_OBSERVABLES_PER_CASE', () => {
    const query = BulkDeleteObservablesRequestRt.decode({
      caseId: 'case-1',
      observableIds: new Array(MAX_OBSERVABLES_PER_CASE + 1).fill('obs-id'),
    });

    expect(query._tag).toBe('Left');
    expect(PathReporter.report(query)).toContain(
      `The length of the field observableIds is too long. Array must be of length <= ${MAX_OBSERVABLES_PER_CASE}.`
    );
  });

  it('rejects empty strings in observableIds', () => {
    const query = BulkDeleteObservablesRequestRt.decode({
      caseId: 'case-1',
      observableIds: [''],
    });

    expect(query._tag).toBe('Left');
    expect(PathReporter.report(query)).toContain(
      'The observableId field cannot be an empty string.'
    );
  });

  it('rejects observableIds entries longer than OBSERVABLE_ID_MAX_LENGTH', () => {
    const query = BulkDeleteObservablesRequestRt.decode({
      caseId: 'case-1',
      observableIds: ['a'.repeat(OBSERVABLE_ID_MAX_LENGTH + 1)],
    });

    expect(query._tag).toBe('Left');
    expect(PathReporter.report(query)).toContain(
      `The length of the observableId is too long. The maximum length is ${OBSERVABLE_ID_MAX_LENGTH}.`
    );
  });

  it('rejects requests missing required fields', () => {
    expect(BulkDeleteObservablesRequestRt.decode({ caseId: 'case-1' })._tag).toBe('Left');
    expect(BulkDeleteObservablesRequestRt.decode({ observableIds: ['obs-1'] })._tag).toBe('Left');
  });
});
