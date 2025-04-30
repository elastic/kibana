/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { CaseSavedObjectTransformed } from '../../common/types/case';
import { mockCases } from '../../mocks';
import { handleImport } from './import';

const logger = loggingSystemMock.createLogger();

describe('case import', () => {
  it('should throw when import contains a case with `incremental_id`', () => {
    const testCases: CaseSavedObjectTransformed[] = mockCases.map((_case, idx) => ({
      ..._case,
      attributes: {
        ..._case.attributes,
        incremental_id: {
          numerical_id: idx + 1,
          space_id: 'default',
        },
      },
    }));
    expect(() => {
      // @ts-ignore: cases attribtue types are not correct
      handleImport({ objects: testCases, logger });
    }).toThrow();
  });

  it('should not throw when import contains no case with `incremental_id`', () => {
    const testCases: CaseSavedObjectTransformed[] = mockCases.map((_case, idx) => ({
      ..._case,
      attributes: {
        ..._case.attributes,
        incremental_id: undefined,
      },
    }));
    expect(() => {
      // @ts-ignore: cases attribtue types are not correct
      handleImport({ objects: testCases, logger });
    }).not.toThrow();
  });
});
