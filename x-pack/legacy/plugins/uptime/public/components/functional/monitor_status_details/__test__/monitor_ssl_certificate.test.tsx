/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { EuiBadge } from '@elastic/eui';
import { renderWithIntl } from 'test_utils/enzyme_helpers';
import { PingTls } from '../../../../../common/graphql/types';
import { MonitorSSLCertificate } from '../monitor_status_bar';

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

  it('renders expiration date with a warning state if ssl expiry date is less than 30 days', () => {
    const dateIn15Days = moment()
      .add(15, 'day')
      .toString();
    monitorTls = {
      certificate_not_valid_after: dateIn15Days,
    };
    const component = mountWithIntl(<MonitorSSLCertificate tls={monitorTls} />);

    const badgeComponent = component.find(EuiBadge);
    expect(badgeComponent.props().color).toBe('warning');

    const badgeComponentText = component.find('.euiBadge__text');
    expect(badgeComponentText.text()).toBe(moment(dateIn15Days).fromNow());

    expect(badgeComponent.find('span.euiBadge--warning')).toBeTruthy();
  });

  it('does not render the expiration date with a warning state if expiry date is greater than a month', () => {
    const dateIn40Days = moment()
      .add(40, 'day')
      .toString();
    monitorTls = {
      certificate_not_valid_after: dateIn40Days,
    };
    const component = mountWithIntl(<MonitorSSLCertificate tls={monitorTls} />);

    const badgeComponent = component.find(EuiBadge);
    expect(badgeComponent.props().color).toBe('default');

    const badgeComponentText = component.find('.euiBadge__text');
    expect(badgeComponentText.text()).toBe(moment(dateIn40Days).fromNow());

    expect(badgeComponent.find('span.euiBadge--warning')).toHaveLength(0);
  });
});
