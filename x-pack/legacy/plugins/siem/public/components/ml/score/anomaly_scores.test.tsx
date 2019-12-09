/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { cloneDeep } from 'lodash/fp';
import * as React from 'react';
import { AnomalyScoresComponent, createJobKey } from './anomaly_scores';
import { mockAnomalies } from '../mock';
import { TestProviders } from '../../../mock/test_providers';
import { getEmptyValue } from '../../empty_value';
import { Anomalies } from '../types';

const endDate: number = new Date('3000-01-01T00:00:00.000Z').valueOf();
const narrowDateRange = jest.fn();

jest.mock('../../../lib/settings/use_kibana_ui_setting');

describe('anomaly_scores', () => {
  let anomalies: Anomalies = cloneDeep(mockAnomalies);

  beforeEach(() => {
    anomalies = cloneDeep(mockAnomalies);
  });

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <AnomalyScoresComponent
        anomalies={anomalies}
        startDate={0}
        endDate={endDate}
        isLoading={false}
        narrowDateRange={narrowDateRange}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('renders spinner when isLoading is true is passed', () => {
    const wrapper = mount(
      <TestProviders>
        <AnomalyScoresComponent
          anomalies={anomalies}
          startDate={0}
          endDate={endDate}
          isLoading={true}
          narrowDateRange={narrowDateRange}
        />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="anomaly-score-spinner"]').exists()).toEqual(true);
  });

  test('does NOT render spinner when isLoading is false is passed', () => {
    const wrapper = mount(
      <TestProviders>
        <AnomalyScoresComponent
          anomalies={anomalies}
          startDate={0}
          endDate={endDate}
          isLoading={false}
          narrowDateRange={narrowDateRange}
        />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="anomaly-score-spinner"]').exists()).toEqual(false);
  });

  test('renders an empty value if anomalies is null', () => {
    const wrapper = mount(
      <TestProviders>
        <AnomalyScoresComponent
          anomalies={null}
          startDate={0}
          endDate={endDate}
          isLoading={false}
          narrowDateRange={narrowDateRange}
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('renders an empty value if anomalies array is empty', () => {
    anomalies.anomalies = [];
    const wrapper = mount(
      <TestProviders>
        <AnomalyScoresComponent
          anomalies={anomalies}
          startDate={0}
          endDate={endDate}
          isLoading={false}
          narrowDateRange={narrowDateRange}
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('can create a job key', () => {
    const job = createJobKey(anomalies.anomalies[0]);
    expect(job).toEqual('job-1-16.193669439507826-process.name-du');
  });

  test('should not show a popover on initial render', () => {
    const wrapper = mount(
      <TestProviders>
        <AnomalyScoresComponent
          anomalies={anomalies}
          startDate={0}
          endDate={endDate}
          isLoading={false}
          narrowDateRange={narrowDateRange}
        />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="anomaly-description-list"]').exists()).toEqual(false);
  });

  test('showing a popover on a mouse click', () => {
    const wrapper = mount(
      <TestProviders>
        <AnomalyScoresComponent
          anomalies={anomalies}
          startDate={0}
          endDate={endDate}
          isLoading={false}
          narrowDateRange={narrowDateRange}
        />
      </TestProviders>
    );
    wrapper
      .find('[data-test-subj="anomaly-score-popover"]')
      .first()
      .simulate('click');
    wrapper.update();
    expect(wrapper.find('[data-test-subj="anomaly-description-list"]').exists()).toEqual(true);
  });
});
