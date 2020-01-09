/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { renderWithIntl } from 'test_utils/enzyme_helpers';
import { PingTls } from '../../../../common/graphql/types';
import { MonitorSSLCertificate } from '../monitor_status_details/monitor_status_bar';

describe('MonitorStatusBar component', () => {
  let monitorTls: PingTls;

  beforeEach(() => {
    const dateInTwoMonths = moment()
      .add(2, 'month')
      .toString();

    monitorTls = {
      certificate_not_valid_after: dateInTwoMonths,
    };
  });

  it('renders', () => {
    const component = renderWithIntl(<MonitorSSLCertificate tls={monitorTls} />);
    expect(component).toMatchSnapshot();
  });

  it('renders null if invalid date', () => {
    monitorTls = {
      certificate_not_valid_after: 'i am so invalid date',
    };
    const component = renderWithIntl(<MonitorSSLCertificate tls={monitorTls} />);
    expect(component).toMatchSnapshot();
  });
});
