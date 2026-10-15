/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getCombinedProperties,
  isLinkedProjectScopedSourceIndexUnavailableError,
  isProjectScopedSourceIndexUnavailableError,
  isSourceIndexUnavailableError,
} from './use_transform_config_data';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { PROJECT_ROUTING } from '@kbn/cps-common';

describe('getCombinedProperties', () => {
  test('extracts missing mappings from docs', () => {
    const mappingProps = {
      testProp: {
        type: ES_FIELD_TYPES.STRING,
      },
    };

    const docs = [
      {
        testProp: 'test_value1',
        scriptProp: 1,
      },
      {
        testProp: 'test_value2',
        scriptProp: 2,
      },
      {
        testProp: 'test_value3',
        scriptProp: 3,
      },
    ];

    expect(getCombinedProperties(mappingProps, docs)).toEqual({
      testProp: {
        type: 'string',
      },
      scriptProp: {
        type: 'number',
      },
    });
  });

  test('does not override defined mappings', () => {
    const mappingProps = {
      testProp: {
        type: ES_FIELD_TYPES.STRING,
      },
      scriptProp: {
        type: ES_FIELD_TYPES.LONG,
      },
    };

    const docs = [
      {
        testProp: 'test_value1',
        scriptProp: 1,
      },
      {
        testProp: 'test_value2',
        scriptProp: 2,
      },
      {
        testProp: 'test_value3',
        scriptProp: 3,
      },
    ];

    expect(getCombinedProperties(mappingProps, docs)).toEqual({
      testProp: {
        type: 'string',
      },
      scriptProp: {
        type: 'long',
      },
    });
  });
});

describe('isSourceIndexUnavailableError', () => {
  const sourceIndexUnavailableError = {
    body: {
      message:
        'Bad Request: [[status_exception] Source indices have been deleted or closed.]: Source indices have been deleted or closed.',
    },
  };

  test('matches transform preview source index status errors', () => {
    expect(isSourceIndexUnavailableError(sourceIndexUnavailableError)).toBe(true);
  });

  test('does not match other preview errors', () => {
    expect(
      isSourceIndexUnavailableError({
        body: {
          message: 'Bad Request: some other transform preview error',
        },
      })
    ).toBe(false);
  });

  test('treats source index unavailable errors as project-scoped only for custom routing', () => {
    expect(
      isProjectScopedSourceIndexUnavailableError(sourceIndexUnavailableError, '_id:linked-id')
    ).toBe(true);
    expect(
      isProjectScopedSourceIndexUnavailableError(sourceIndexUnavailableError, PROJECT_ROUTING.ALL)
    ).toBe(false);
    expect(
      isProjectScopedSourceIndexUnavailableError(
        sourceIndexUnavailableError,
        PROJECT_ROUTING.ORIGIN
      )
    ).toBe(true);
    expect(isProjectScopedSourceIndexUnavailableError(sourceIndexUnavailableError)).toBe(false);
  });

  test('treats source index unavailable errors as linked-project-scoped only outside origin routing', () => {
    expect(
      isLinkedProjectScopedSourceIndexUnavailableError(
        sourceIndexUnavailableError,
        '_id:linked-id',
        'origin-id'
      )
    ).toBe(true);
    expect(
      isLinkedProjectScopedSourceIndexUnavailableError(
        sourceIndexUnavailableError,
        PROJECT_ROUTING.ORIGIN,
        'origin-id'
      )
    ).toBe(false);
    expect(
      isLinkedProjectScopedSourceIndexUnavailableError(
        sourceIndexUnavailableError,
        '_id:origin-id',
        'origin-id'
      )
    ).toBe(false);
    expect(
      isLinkedProjectScopedSourceIndexUnavailableError(
        sourceIndexUnavailableError,
        PROJECT_ROUTING.ALL,
        'origin-id'
      )
    ).toBe(false);
  });
});
