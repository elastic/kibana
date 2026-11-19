/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNoMatchingProjectError } from './is_no_matching_project_error';

describe('isNoMatchingProjectError', () => {
  it('returns true for error with caused_by.type = no_matching_project_exception', () => {
    const error = {
      attributes: {
        caused_by: {
          type: 'no_matching_project_exception',
        },
      },
    };
    expect(isNoMatchingProjectError(error)).toBe(true);
  });

  it('returns true for error with error.caused_by.type = no_matching_project_exception', () => {
    const error = {
      attributes: {
        error: {
          caused_by: {
            type: 'no_matching_project_exception',
          },
        },
      },
    };
    expect(isNoMatchingProjectError(error)).toBe(true);
  });

  it('returns true for error with meta.body.error.type = no_matching_project_exception', () => {
    const error = {
      meta: {
        body: {
          error: {
            type: 'no_matching_project_exception',
          },
        },
      },
    };
    expect(isNoMatchingProjectError(error)).toBe(true);
  });

  it('returns true for error with message containing no_matching_project_exception', () => {
    const error = {
      message: 'no_matching_project_exception: no matching project',
    };
    expect(isNoMatchingProjectError(error)).toBe(true);
  });

  it('returns false for null and undefined', () => {
    expect(isNoMatchingProjectError(null)).toBe(false);
    expect(isNoMatchingProjectError(undefined)).toBe(false);
  });
});
