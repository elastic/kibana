/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleCustomError, isCustomError, MonitoringLicenseError } from './custom_errors';

describe('Error handling for custom monitoring errors', () => {
  it('handles the custom MonitoringLicenseError error', () => {
    const clusterName = 'main';
    const err = new MonitoringLicenseError(clusterName);
    expect(isCustomError(err)).toBe(true);

    const wrappedErr = handleCustomError(err);
    expect(wrappedErr.message).toBe(
      'Monitoring License Error: ' +
        `Could not find license information for cluster = '${clusterName}'. ` +
        `Please check the cluster's master node server logs for errors or warnings.`
    );
    expect(wrappedErr.isBoom).toBe(true);
    expect(wrappedErr.isServer).toBe(true);
    expect(wrappedErr.data).toBe(null);
    expect(wrappedErr.output).toEqual({
      statusCode: 503,
      payload: {
        statusCode: 503,
        error: 'Service Unavailable',
        message:
          `Monitoring License Error: Could not find license information for cluster = '${clusterName}'. ` +
          `Please check the cluster's master node server logs for errors or warnings.`,
      },
      headers: {},
    });
  });
});
