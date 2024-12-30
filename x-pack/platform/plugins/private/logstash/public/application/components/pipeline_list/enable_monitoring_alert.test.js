/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { EnableMonitoringAlert } from './enable_monitoring_alert';

describe('EnableMonitoringAlert component', () => {
  it('renders expected component', () => {
    const wrapper = shallowWithIntl(<EnableMonitoringAlert />);
    expect(wrapper).toMatchSnapshot();
  });
});
