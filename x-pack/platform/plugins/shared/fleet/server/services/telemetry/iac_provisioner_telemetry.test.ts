/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { analyticsServiceMock } from '@kbn/core/server/mocks';

import { IAC_PROVISIONER_CALLBACK_RECEIVED_EVENT } from '../../../common/telemetry/iac_provisioner_events';

import {
  reportIacProvisionerCallbackReceived,
  setupIacProvisionerTelemetry,
} from './iac_provisioner_telemetry';

describe('IaC provisioner telemetry', () => {
  it('registers the callback received event and reports it with its fields', () => {
    const analytics = analyticsServiceMock.createAnalyticsServiceSetup();
    setupIacProvisionerTelemetry(analytics);

    expect(analytics.registerEventType).toHaveBeenCalledWith(
      IAC_PROVISIONER_CALLBACK_RECEIVED_EVENT
    );
    expect(IAC_PROVISIONER_CALLBACK_RECEIVED_EVENT.eventType).toBe(
      'iac_provisioner_callback_received'
    );

    reportIacProvisionerCallbackReceived({ provider: 'aws', originProof: 'missing' });

    expect(analytics.reportEvent).toHaveBeenCalledWith('iac_provisioner_callback_received', {
      provider: 'aws',
      originProof: 'missing',
    });
  });
});
