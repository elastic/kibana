/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { MonitorPageLink } from '../monitor_page_link';

describe('MonitorPageLink component', () => {
  it('renders the link properly', () => {
    const component = shallowWithIntl(
      <MonitorPageLink monitorId="bad-ssl" linkParameters={undefined} />
    );
    expect(component).toMatchSnapshot();
  });

  it('renders a help link when link parameters present', () => {
    const linkParameters = 'selectedPingStatus=down';
    const component = shallowWithIntl(
      <MonitorPageLink monitorId="bad-ssl" linkParameters={linkParameters} />
    );
    expect(component).toMatchSnapshot();
  });
});
