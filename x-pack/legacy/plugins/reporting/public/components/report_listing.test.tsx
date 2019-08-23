/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('ui/chrome', () => ({
  getInjected() {
    return {
      jobsRefresh: {
        interval: 10,
        intervalErrorMultiplier: 2,
      },
    };
  },
}));
jest.mock('ui/kfetch', () => ({
  kfetch: ({ pathname }: { pathname: string }) => {
    if (pathname === '/api/reporting/jobs/list') {
      return Promise.resolve([]);
    } else if (pathname === '/api/reporting/jobs/count') {
      return 0;
    }
  },
}));

import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { ReportListing } from './report_listing';

describe('ReportListing', () => {
  it('default report job listing', () => {
    const wrapper = mountWithIntl(
      <ReportListing
        badLicenseMessage=""
        showLinks={false}
        enableLinks={false}
        redirect={jest.fn()}
      />
    );
    const input = wrapper.find('[data-test-subj="reportInfoButton"]').hostNodes();
    expect(input).toMatchSnapshot();
  });
});
