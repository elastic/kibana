/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { renderWithIntl } from 'test_utils/enzyme_helpers';
import { PingTls } from '../../../../common/graphql/types';
import { MonitorSSLCertificate } from '../monitor_status_bar/monitor_ssl_certificate';

describe('MonitorStatusBar component', () => {
  let monitorTls: PingTls;

  beforeEach(() => {
    monitorTls = {
      certificate_not_valid_after: '2019-11-03T02:02:21.000Z',
    };
  });

  it('renders', () => {
    const component = renderWithIntl(<MonitorSSLCertificate tls={monitorTls} />);
    expect(component).toMatchSnapshot();
  });
});
