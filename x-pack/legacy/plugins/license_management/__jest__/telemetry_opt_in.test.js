/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { setTelemetryEnabled, setTelemetryOptInService } from '../public/np_ready/application/lib/telemetry';
import { TelemetryOptIn } from '../public/np_ready/application/components/telemetry_opt_in';
import { mountWithIntl } from '../../../../test_utils/enzyme_helpers';

jest.mock('ui/capabilities', () => ({
  get: jest.fn(),
}));

setTelemetryEnabled(true);

describe('TelemetryOptIn', () => {
  test('should display when telemetry not opted in', () => {
    setTelemetryOptInService({
      getOptIn: () => false,
      canChangeOptInStatus: () => true,
    });
    const rendered = mountWithIntl(<TelemetryOptIn />);
    expect(rendered).toMatchSnapshot();
  });
  test('should not display when telemetry is opted in', () => {
    setTelemetryOptInService({
      getOptIn: () => true,
      canChangeOptInStatus: () => true,
    });
    const rendered = mountWithIntl(<TelemetryOptIn />);
    expect(rendered).toMatchSnapshot();
  });
  test(`shouldn't display when telemetry optIn status can't change`, () => {
    setTelemetryOptInService({
      getOptIn: () => false,
      canChangeOptInStatus: () => false,
    });
    const rendered = mountWithIntl(<TelemetryOptIn />);
    expect(rendered).toMatchSnapshot();
  });
});
