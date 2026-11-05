/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_OBSERVABLES_PER_CASE,
  MAX_OBSERVABLE_METADATA_ENTRIES,
  MAX_OBSERVABLE_METADATA_KEY_LENGTH,
  MAX_OBSERVABLE_METADATA_VALUE_LENGTH,
  OBSERVABLE_ID_MAX_LENGTH,
} from '../../../constants';
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

  it('accepts metadata', () => {
    const request = {
      observable: {
        description: null,
        typeKey: 'observable-type-ipv4',
        value: '10.0.0.1',
        metadata: {
          verdict: 'malicious',
          virustotal: 'https://www.virustotal.com/gui/ip/10.0.0.1',
        },
      },
    };
    const result = AddObservableRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(request);
  });

  it(`rejects more than ${MAX_OBSERVABLE_METADATA_ENTRIES} metadata entries`, () => {
    const metadata = Object.fromEntries(
      Array.from({ length: MAX_OBSERVABLE_METADATA_ENTRIES + 1 }, (_, index) => [`k${index}`, 'v'])
    );
    const result = AddObservableRequestSchema.safeParse({
      observable: {
        description: null,
        typeKey: 'observable-type-ipv4',
        value: '10.0.0.1',
        metadata,
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects metadata keys and values over their bounds', () => {
    const parse = (metadata: Record<string, string>) =>
      AddObservableRequestSchema.safeParse({
        observable: { description: null, typeKey: 'observable-type-ipv4', value: 'v', metadata },
      }).success;
    expect(parse({ ['k'.repeat(MAX_OBSERVABLE_METADATA_KEY_LENGTH + 1)]: 'v' })).toBe(false);
    expect(parse({ '': 'v' })).toBe(false);
    expect(parse({ k: 'v'.repeat(MAX_OBSERVABLE_METADATA_VALUE_LENGTH + 1) })).toBe(false);
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

  it('accepts metadata to replace and null to clear it', () => {
    for (const metadata of [{ verdict: 'benign' }, null]) {
      const request = { observable: { description: null, value: '10.0.0.1', metadata } };
      const result = UpdateObservableRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(request);
    }
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
