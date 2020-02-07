/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MonitorSummary } from '../../../../common/graphql/types';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { IntegrationGroup } from '../integration_group';

describe('IntegrationGroup', () => {
  let summary: MonitorSummary;

  beforeEach(() => {
    summary = {
      monitor_id: '12345',
      state: {
        summary: {},
        checks: [],
        timestamp: '123',
      },
    };
  });

  it('will not display APM links when APM is unavailable', () => {
    const component = shallowWithIntl(
      <IntegrationGroup
        basePath="foo"
        dateRangeStart="now-12m"
        dateRangeEnd="now-1m"
        isApmAvailable={false}
        isInfraAvailable={true}
        isLogsAvailable={true}
        summary={summary}
      />
    );
    expect(component).toMatchSnapshot();
  });

  it('will not display infra links when infra is unavailable', () => {
    const component = shallowWithIntl(
      <IntegrationGroup
        basePath="foo"
        dateRangeStart="now-12m"
        dateRangeEnd="now-1m"
        isApmAvailable={true}
        isInfraAvailable={false}
        isLogsAvailable={true}
        summary={summary}
      />
    );
    expect(component).toMatchSnapshot();
  });

  it('will not display logging links when logging is unavailable', () => {
    const component = shallowWithIntl(
      <IntegrationGroup
        basePath="foo"
        dateRangeStart="now-12m"
        dateRangeEnd="now-1m"
        isApmAvailable={true}
        isInfraAvailable={true}
        isLogsAvailable={false}
        summary={summary}
      />
    );
    expect(component).toMatchSnapshot();
  });
});
