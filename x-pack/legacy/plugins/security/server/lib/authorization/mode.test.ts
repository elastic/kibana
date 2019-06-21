/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { requestFixture } from '../__tests__/__fixtures__/request';
import { authorizationModeFactory } from './mode';

class MockXPackInfoFeature {
  public getLicenseCheckResults = jest.fn();

  constructor(allowRbac: boolean) {
    this.getLicenseCheckResults.mockReturnValue({ allowRbac });
  }
}

describe(`#useRbacForRequest`, () => {
  test(`throws an Error if request isn't specified`, async () => {
    const mockXpackInfoFeature = new MockXPackInfoFeature(false);
    const mode = authorizationModeFactory(mockXpackInfoFeature as any);

    expect(() => mode.useRbacForRequest(undefined as any)).toThrowErrorMatchingInlineSnapshot(
      `"Invalid value used as weak map key"`
    );
  });

  test(`throws an Error if request is "null"`, async () => {
    const mockXpackInfoFeature = new MockXPackInfoFeature(false);
    const mode = authorizationModeFactory(mockXpackInfoFeature as any);

    expect(() => mode.useRbacForRequest(null as any)).toThrowErrorMatchingInlineSnapshot(
      `"Invalid value used as weak map key"`
    );
  });

  test(`returns false if xpackInfoFeature.getLicenseCheckResults().allowRbac is false`, async () => {
    const mockXpackInfoFeature = new MockXPackInfoFeature(false);
    const mode = authorizationModeFactory(mockXpackInfoFeature as any);
    const request = requestFixture();

    const result = mode.useRbacForRequest(request);
    expect(result).toBe(false);
  });

  test(`returns false if xpackInfoFeature.getLicenseCheckResults().allowRbac is initially false, and changes to true`, async () => {
    const mockXpackInfoFeature = new MockXPackInfoFeature(false);
    const mode = authorizationModeFactory(mockXpackInfoFeature as any);
    const request = requestFixture();

    expect(mode.useRbacForRequest(request)).toBe(false);
    mockXpackInfoFeature.getLicenseCheckResults.mockReturnValue({ allowRbac: true });
    expect(mode.useRbacForRequest(request)).toBe(false);
  });

  test(`returns true if xpackInfoFeature.getLicenseCheckResults().allowRbac is true`, async () => {
    const mockXpackInfoFeature = new MockXPackInfoFeature(true);
    const mode = authorizationModeFactory(mockXpackInfoFeature as any);
    const request = requestFixture();

    const result = mode.useRbacForRequest(request);
    expect(result).toBe(true);
  });

  test(`returns true if xpackInfoFeature.getLicenseCheckResults().allowRbac is initially true, and changes to false`, async () => {
    const mockXpackInfoFeature = new MockXPackInfoFeature(true);
    const mode = authorizationModeFactory(mockXpackInfoFeature as any);
    const request = requestFixture();

    expect(mode.useRbacForRequest(request)).toBe(true);
    mockXpackInfoFeature.getLicenseCheckResults.mockReturnValue({ allowRbac: false });
    expect(mode.useRbacForRequest(request)).toBe(true);
  });
});
