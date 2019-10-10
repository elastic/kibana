/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl, renderWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { MostRecentError } from '../most_recent_error';

describe('MostRecentError component', () => {
  let monitorDetails: any;

  beforeEach(() => {
    monitorDetails = {
      monitorId: 'bad-ssl',
      error: {
        type: 'io',
        message:
          'Get https://expired.badssl.com: x509: certificate has expired or is not yet valid',
      },
    };
  });

  it('validates props with shallow render', () => {
    const component = shallowWithIntl(
      <Router>
        <MostRecentError monitorId={monitorDetails.monitorId} error={monitorDetails.error} />
      </Router>
    );
    expect(component).toMatchSnapshot();
  });

  it('renders properly with empty data', () => {
    const component = renderWithIntl(
      <Router>
        <MostRecentError monitorId={monitorDetails.monitorId} error={monitorDetails.error} />
      </Router>
    );
    expect(component).toMatchSnapshot();
  });
});
