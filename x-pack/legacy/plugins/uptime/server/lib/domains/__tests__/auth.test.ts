/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose } from '../../compose/test_compose';
import { UMServerLibs } from '../../lib';

describe('Auth domain lib', () => {
  let libs: UMServerLibs;
  let request: any;

  const createLibs = (xpack: any) => {
    libs = compose({ xpack });
  };

  beforeEach(() => {
    request = {};
    createLibs({
      info: {
        license: {
          type: 'platinum',
          isActive: true,
        },
      },
    });
  });

  it('throws for empty request authentication field', () => {
    expect(() => libs.auth.requestIsValid(request)).toThrowErrorMatchingSnapshot();
  });

  it('throws for null license information', () => {
    createLibs({
      info: {
        license: {
          isActive: true,
        },
      },
    });

    expect(() => libs.auth.requestIsValid(request)).toThrowErrorMatchingSnapshot();
  });

  it('returns false for un-authenticated request', () => {
    request = {
      auth: { isAuthenticated: false },
    };
    expect(libs.auth.requestIsValid(request)).toBe(false);
  });

  it('throws when license is not active', () => {
    createLibs({
      info: {
        license: {
          type: 'platinum',
          isActive: false,
        },
      },
    });
    expect(() => libs.auth.requestIsValid(request)).toThrowErrorMatchingSnapshot();
  });

  it('throws when license type not supported', () => {
    createLibs({
      info: {
        license: {
          type: 'oss',
          isActive: true,
        },
      },
    });
    expect(() => libs.auth.requestIsValid(request)).toThrowErrorMatchingSnapshot();
  });

  it('returns true for authenticated request and valid active basic license', () => {
    createLibs({
      info: {
        license: {
          type: 'basic',
          isActive: true,
        },
      },
    });
    request = { auth: { isAuthenticated: true } };
    expect(libs.auth.requestIsValid(request)).toBe(true);
  });

  it('returns true for authenticated request and valid active license', () => {
    createLibs({
      info: {
        license: {
          type: 'platinum',
          isActive: true,
        },
      },
    });
    request = { auth: { isAuthenticated: true } };
    expect(libs.auth.requestIsValid(request)).toBe(true);
  });

  it('returns false for valid license but un-authenticated request', () => {
    request = { auth: { isAuthenticated: false } };
    expect(libs.auth.requestIsValid(request)).toBe(false);
  });
});
