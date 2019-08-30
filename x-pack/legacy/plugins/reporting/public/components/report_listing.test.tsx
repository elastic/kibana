/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface JobData {
  _index: string;
  _id: string;
  _source: {
    browser_type: string;
    created_at: string;
    jobtype: string;
    created_by: string;
    payload: {
      type: string;
      title: string;
    };
    kibana_name?: string; // undefined if job is pending (not yet claimed by an instance)
    kibana_id?: string; // undefined if job is pending (not yet claimed by an instance)
    output?: { content_type: string; size: number }; // undefined if job is incomplete
    completed_at?: string; // undefined if job is incomplete
  };
}

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
  kfetch: ({ pathname }: { pathname: string }): Promise<JobData[] | number> => {
    if (pathname === '/api/reporting/jobs/list') {
      return Promise.resolve([
        { _index: '.reporting-2019.08.18', _id: 'jzoik8dh1q2i89fb5f19znm6', _source: { payload: { layout: { id: 'preserve_layout', dimensions: { width: 1635, height: 792 } }, type: 'dashboard', title: 'Names', }, max_attempts: 3, browser_type: 'chromium', created_at: '2019-08-23T19:34:24.869Z', jobtype: 'printable_pdf', created_by: 'elastic', attempts: 0, status: 'pending', }, }, // prettier-ignore
        { _index: '.reporting-2019.08.18', _type: '_doc', _id: 'jzoik7tn1q2i89fb5f60e5ve', _score: null, _source: { payload: { layout: { id: 'preserve_layout', dimensions: { width: 1635, height: 792 } }, type: 'dashboard', title: 'Names', }, max_attempts: 3, browser_type: 'chromium', created_at: '2019-08-23T19:34:24.155Z', jobtype: 'printable_pdf', created_by: 'elastic', attempts: 0, status: 'pending', }, }, // prettier-ignore
        { _index: '.reporting-2019.08.18', _type: '_doc', _id: 'jzoik5tb1q2i89fb5fckchny', _score: null, _source: { payload: { layout: { id: 'png', dimensions: { width: 1898, height: 876 } }, title: 'cool dashboard', type: 'dashboard', }, max_attempts: 3, browser_type: 'chromium', created_at: '2019-08-23T19:34:21.551Z', jobtype: 'PNG', created_by: 'elastic', attempts: 0, status: 'pending', }, }, // prettier-ignore
        { _index: '.reporting-2019.08.18', _type: '_doc', _id: 'jzoik5a11q2i89fb5f130t2m', _score: null, _source: { payload: { layout: { id: 'png', dimensions: { width: 1898, height: 876 } }, title: 'cool dashboard', type: 'dashboard', }, max_attempts: 3, browser_type: 'chromium', created_at: '2019-08-23T19:34:20.857Z', jobtype: 'PNG', created_by: 'elastic', attempts: 0, status: 'pending', }, }, // prettier-ignore
        { _index: '.reporting-2019.08.18', _type: '_doc', _id: 'jzoik3ka1q2i89fb5fdx93g7', _score: null, _source: { payload: { layout: { id: 'preserve_layout', dimensions: { width: 1898, height: 876 } }, type: 'dashboard', title: 'cool dashboard', }, max_attempts: 3, browser_type: 'chromium', created_at: '2019-08-23T19:34:18.634Z', jobtype: 'printable_pdf', created_by: 'elastic', attempts: 0, status: 'pending', }, }, // prettier-ignore
        { _index: '.reporting-2019.08.18', _type: '_doc', _id: 'jzoik2vt1q2i89fb5ffw723n', _score: null, _source: { payload: { layout: { id: 'preserve_layout', dimensions: { width: 1898, height: 876 } }, type: 'dashboard', title: 'cool dashboard', }, max_attempts: 3, browser_type: 'chromium', created_at: '2019-08-23T19:34:17.753Z', jobtype: 'printable_pdf', created_by: 'elastic', attempts: 0, status: 'pending', }, }, // prettier-ignore
        { _index: '.reporting-2019.08.18', _type: '_doc', _id: 'jzoik1851q2i89fb5fdge6e7', _score: null, _source: { payload: { layout: { id: 'preserve_layout', dimensions: { width: 1080, height: 720 } }, type: 'canvas workpad', title: 'My Canvas Workpad - Dark', }, max_attempts: 3, browser_type: 'chromium', created_at: '2019-08-23T19:34:15.605Z', jobtype: 'printable_pdf', created_by: 'elastic', attempts: 0, status: 'pending', }, }, // prettier-ignore
        { _index: '.reporting-2019.08.18', _type: '_doc', _id: 'jzoijyre1q2i89fb5fa7xzvi', _score: null, _source: { payload: { type: 'dashboard', title: 'tests-panels', }, max_attempts: 3, browser_type: 'chromium', created_at: '2019-08-23T19:34:12.410Z', jobtype: 'printable_pdf', created_by: 'elastic', attempts: 0, status: 'pending', }, }, // prettier-ignore
        { _index: '.reporting-2019.08.18', _type: '_doc', _id: 'jzoijv5h1q2i89fb5ffklnhx', _score: null, _source: { payload: { type: 'dashboard', title: 'tests-panels', }, max_attempts: 3, browser_type: 'chromium', created_at: '2019-08-23T19:34:07.733Z', jobtype: 'printable_pdf', created_by: 'elastic', attempts: 0, status: 'pending', }, }, // prettier-ignore
        { _index: '.reporting-2019.08.18', _type: '_doc', _id: 'jznhgk7r1bx789fb5f6hxok7', _score: null, _source: { kibana_name: 'spicy.local', browser_type: 'chromium', created_at: '2019-08-23T02:15:47.799Z', jobtype: 'printable_pdf', created_by: 'elastic', kibana_id: 'ca75e26c-2b7d-464f-aef0-babb67c735a0', output: { content_type: 'application/pdf', size: 877114 }, completed_at: '2019-08-23T02:15:57.707Z', payload: { type: 'dashboard (legacy)', title: 'tests-panels', }, max_attempts: 3, started_at: '2019-08-23T02:15:48.794Z', attempts: 1, status: 'completed', }, }, // prettier-ignore
      ]);
    }

    // query for jobs count
    return Promise.resolve(18);
  },
}));

import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { ReportListing } from './report_listing';

describe('ReportListing', () => {
  it('Report job listing with some items', () => {
    const wrapper = mountWithIntl(
      <ReportListing
        badLicenseMessage=""
        showLinks={false}
        enableLinks={false}
        redirect={jest.fn()}
      />
    );
    wrapper.update();
    const input = wrapper.find('[data-test-subj="reportJobListing"]');
    expect(input).toMatchSnapshot();
  });
});
