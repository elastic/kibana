/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, wait, waitForElement } from 'react-testing-library';
import 'react-testing-library/cleanup-after-each';
import { toastNotifications } from 'ui/notify';
import * as apmRestServices from '../../../../services/rest/apm/services';
import { ServiceOverview } from '..';
import * as hooks from '../../../../hooks/useUrlParams';

jest.mock('ui/kfetch');

function renderServiceOverview() {
  return render(<ServiceOverview />);
}

describe('Service Overview -> View', () => {
  beforeEach(() => {
    // mock urlParams
    spyOn(hooks, 'useUrlParams').and.returnValue({
      urlParams: {
        start: 'myStart',
        end: 'myEnd'
      }
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // Suppress warnings about "act" until async/await syntax is supported: https://github.com/facebook/react/issues/14769
  /* eslint-disable no-console */
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('should render services, when list is not empty', async () => {
    // mock rest requests
    const dataFetchingSpy = jest
      .spyOn(apmRestServices, 'loadServiceList')
      .mockResolvedValue({
        hasLegacyData: false,
        hasHistoricalData: true,
        items: [
          {
            serviceName: 'My Python Service',
            agentName: 'python',
            transactionsPerMinute: 100,
            errorsPerMinute: 200,
            avgResponseTime: 300,
            environments: ['test', 'dev']
          },
          {
            serviceName: 'My Go Service',
            agentName: 'go',
            transactionsPerMinute: 400,
            errorsPerMinute: 500,
            avgResponseTime: 600,
            environments: []
          }
        ]
      });

    const { container, getByText } = renderServiceOverview();

    // wait for requests to be made
    await wait(() => expect(dataFetchingSpy).toHaveBeenCalledTimes(1));
    await waitForElement(() => getByText('My Python Service'));

    expect(container.querySelectorAll('.euiTableRow')).toMatchSnapshot();
  });

  it('should render getting started message, when list is empty and no historical data is found', async () => {
    const dataFetchingSpy = jest
      .spyOn(apmRestServices, 'loadServiceList')
      .mockResolvedValue({
        hasLegacyData: false,
        hasHistoricalData: false,
        items: []
      });

    const { container, getByText } = renderServiceOverview();

    // wait for requests to be made
    await wait(() => expect(dataFetchingSpy).toHaveBeenCalledTimes(1));

    // wait for elements to be rendered
    await waitForElement(() =>
      getByText(
        "Looks like you don't have any APM services installed. Let's add some!"
      )
    );

    expect(container.querySelectorAll('.euiTableRow')).toMatchSnapshot();
  });

  it('should render empty message, when list is empty and historical data is found', async () => {
    const dataFetchingSpy = jest
      .spyOn(apmRestServices, 'loadServiceList')
      .mockResolvedValue({
        hasLegacyData: false,
        hasHistoricalData: true,
        items: []
      });

    const { container, getByText } = renderServiceOverview();

    // wait for requests to be made
    await wait(() => expect(dataFetchingSpy).toHaveBeenCalledTimes(1));
    await waitForElement(() => getByText('No services found'));

    expect(container.querySelectorAll('.euiTableRow')).toMatchSnapshot();
  });

  it('should render upgrade migration notification when legacy data is found, ', async () => {
    // create spies
    const toastSpy = jest.spyOn(toastNotifications, 'addWarning');
    const dataFetchingSpy = jest
      .spyOn(apmRestServices, 'loadServiceList')
      .mockResolvedValue({
        hasLegacyData: true,
        hasHistoricalData: true,
        items: []
      });

    renderServiceOverview();

    // wait for requests to be made
    await wait(() => expect(dataFetchingSpy).toHaveBeenCalledTimes(1));

    expect(toastSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: 'Legacy data was detected within the selected time range'
      })
    );
  });

  it('should not render upgrade migration notification when legacy data is not found, ', async () => {
    // create spies
    const toastSpy = jest.spyOn(toastNotifications, 'addWarning');
    const dataFetchingSpy = jest
      .spyOn(apmRestServices, 'loadServiceList')
      .mockResolvedValue({
        hasLegacyData: false,
        hasHistoricalData: true,
        items: []
      });

    renderServiceOverview();

    // wait for requests to be made
    await wait(() => expect(dataFetchingSpy).toHaveBeenCalledTimes(1));

    expect(toastSpy).not.toHaveBeenCalled();
  });
});
