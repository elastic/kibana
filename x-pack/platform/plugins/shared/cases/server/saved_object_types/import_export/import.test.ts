/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseSavedObjectTransformed } from '../../common/types/case';
import { mockCases } from '../../mocks';
import { handleImport } from './import';

describe('case import', () => {
  it('should raise a warning when import contains a case with `incremental_id`', () => {
    const testCases: CaseSavedObjectTransformed[] = mockCases.map((_case, idx) => ({
      ..._case,
      attributes: {
        ..._case.attributes,
        incremental_id: idx + 1,
      },
    }));
    // @ts-ignore: cases attribtue types are not correct
    expect(handleImport({ objects: testCases })).toEqual(
      expect.objectContaining({
        warnings: expect.arrayContaining([
          { message: 'The `incremental_id` field is not supported on importing.', type: 'simple' },
        ]),
      })
    );
  });

  it('should raise a warning when import contains a case with `incremental_id` set to 0', () => {
    const testCases: CaseSavedObjectTransformed[] = mockCases.map((_case) => ({
      ..._case,
      attributes: {
        ..._case.attributes,
        incremental_id: 0,
      },
    }));
    // @ts-ignore: cases attribtue types are not correct
    expect(handleImport({ objects: testCases })).toEqual(
      expect.objectContaining({
        warnings: expect.arrayContaining([
          { message: 'The `incremental_id` field is not supported on importing.', type: 'simple' },
        ]),
      })
    );
  });

  it('should raise a warning when import contains a case with `incremental_id` set to a negative value', () => {
    const testCases: CaseSavedObjectTransformed[] = mockCases.map((_case) => ({
      ..._case,
      attributes: {
        ..._case.attributes,
        incremental_id: -1,
      },
    }));
    // @ts-ignore: cases attribtue types are not correct
    expect(handleImport({ objects: testCases })).toEqual(
      expect.objectContaining({
        warnings: expect.arrayContaining([
          { message: 'The `incremental_id` field is not supported on importing.', type: 'simple' },
        ]),
      })
    );
  });

  it('should not raise a warning when import contains no case with `incremental_id`', () => {
    const testCases: CaseSavedObjectTransformed[] = mockCases.map((_case) => ({
      ..._case,
      attributes: {
        ..._case.attributes,
        incremental_id: undefined,
      },
    }));
    // @ts-ignore: cases attribtue types are not correct
    expect(handleImport({ objects: testCases })).not.toEqual(
      expect.objectContaining({
        warnings: expect.arrayContaining([
          { message: 'The `incremental_id` field is not supported on importing.', type: 'simple' },
        ]),
      })
    );
  });
});
