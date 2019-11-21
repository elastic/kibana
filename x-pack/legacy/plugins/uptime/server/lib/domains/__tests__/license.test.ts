/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { licenseCheck } from '../license';
import { RequestHandlerContext } from 'kibana/server';

describe('license check', () => {
  let mockContext: RequestHandlerContext;
  const isOneOf = jest.fn();

  it('throws for null license', () => {
    // @ts-ignore there's a null check in this function
    mockContext = { licensing: { license: null } };
    expect(() => licenseCheck(mockContext)).toThrowErrorMatchingSnapshot();
  });

  it('throws for unsupported license type', () => {
    isOneOf.mockReturnValue(false);
    expect(() =>
      // @ts-ignore it needs to throw if the license is not supported
      licenseCheck({ licensing: { license: { isOneOf } } })
    ).toThrowErrorMatchingSnapshot();
  });

  it('throws for inactive license', () => {
    isOneOf.mockReturnValue(true);
    expect(() =>
      // @ts-ignore it needs to throw if !isActive
      licenseCheck({ licensing: { license: { isActive: false, isOneOf } } })
    ).toThrowErrorMatchingSnapshot();
  });

  it('returns true for a valid license', () => {
    isOneOf.mockReturnValue(true);
    // @ts-ignore license type needs to be non-null
    expect(licenseCheck({ licensing: { license: { isActive: true, isOneOf } } })).toBe(true);
  });
});
