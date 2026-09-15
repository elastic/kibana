/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerIacProvisionerTelemetryEvents } from './iac_provisioner_events';

describe('registerIacProvisionerTelemetryEvents', () => {
  it('registers the render events and the IaC key events', () => {
    const registerEventType = jest.fn();
    registerIacProvisionerTelemetryEvents({ registerEventType });

    const registered = registerEventType.mock.calls.map(([opts]) => opts.eventType);
    expect(registered).toEqual([
      'iac_provisioner_render_requested',
      'iac_provisioner_render_completed',
      'iac_provisioner_render_fallback',
      'iac_provisioner_key_verification_completed',
      'iac_provisioner_upgrade_check_completed',
      'iac_provisioner_key_check_action',
    ]);
  });
});
