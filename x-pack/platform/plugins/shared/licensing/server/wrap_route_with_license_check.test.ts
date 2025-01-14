/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';

import { wrapRouteWithLicenseCheck, CheckLicense } from './wrap_route_with_license_check';

const context = {
  licensing: {
    license: {},
  },
} as any;
const request = httpServerMock.createKibanaRequest();

describe('wrapRouteWithLicenseCheck', () => {
  it('calls route handler if checkLicense returns "valid": true', async () => {
    const checkLicense: CheckLicense = () => ({ valid: true, message: null });
    const routeHandler = jest.fn();
    const wrapper = wrapRouteWithLicenseCheck(checkLicense, routeHandler);
    const response = httpServerMock.createResponseFactory();

    await wrapper(context, request, response);

    expect(routeHandler).toHaveBeenCalledTimes(1);
    expect(routeHandler).toHaveBeenCalledWith(context, request, response);
  });

  it('does not call route handler if checkLicense returns "valid": false', async () => {
    const checkLicense: CheckLicense = () => ({ valid: false, message: 'reason' });
    const routeHandler = jest.fn();
    const wrapper = wrapRouteWithLicenseCheck(checkLicense, routeHandler);
    const response = httpServerMock.createResponseFactory();

    await wrapper(context, request, response);

    expect(routeHandler).toHaveBeenCalledTimes(0);
    expect(response.forbidden).toHaveBeenCalledTimes(1);
    expect(response.forbidden).toHaveBeenCalledWith({ body: 'reason' });
  });

  it('allows an exception to bubble up if handler throws', async () => {
    const checkLicense: CheckLicense = () => ({ valid: true, message: null });
    const routeHandler = () => {
      throw new Error('reason');
    };
    const wrapper = wrapRouteWithLicenseCheck(checkLicense, routeHandler);
    const response = httpServerMock.createResponseFactory();

    await expect(wrapper(context, request, response)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"reason"`
    );
  });

  it('allows an exception to bubble up if "checkLicense" throws', async () => {
    const checkLicense: CheckLicense = () => {
      throw new Error('reason');
    };
    const routeHandler = jest.fn();
    const wrapper = wrapRouteWithLicenseCheck(checkLicense, routeHandler);
    const response = httpServerMock.createResponseFactory();

    await expect(wrapper(context, request, response)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"reason"`
    );

    expect(routeHandler).toHaveBeenCalledTimes(0);
  });
});
