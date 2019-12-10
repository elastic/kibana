/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, wait, waitForElement } from '@testing-library/react';
import { ServiceOverview } from '..';
import * as urlParamsHooks from '../../../../hooks/useUrlParams';
import * as kibanaCore from '../../../../../../observability/public/context/kibana_core';
import { LegacyCoreStart } from 'src/core/public';
import * as useLocalUIFilters from '../../../../hooks/useLocalUIFilters';
import { FETCH_STATUS } from '../../../../hooks/useFetcher';
import { SessionStorageMock } from '../../../../services/__test__/SessionStorageMock';

function renderServiceOverview() {
  return render(<ServiceOverview />);
}
jest.mock('ui/new_platform');
const coreMock = ({
  http: {
    basePath: {
      prepend: (path: string) => `/basepath${path}`
    },
    get: jest.fn()
  },
  notifications: {
    toasts: {
      addWarning: () => {}
    }
  }
} as unknown) as LegacyCoreStart & {
  http: { get: jest.Mock<any, any> };
};

describe('Service Overview -> View', () => {
  beforeEach(() => {
    // @ts-ignore
    global.sessionStorage = new SessionStorageMock();

    spyOn(kibanaCore, 'useKibanaCore').and.returnValue(coreMock);
    // mock urlParams
    spyOn(urlParamsHooks, 'useUrlParams').and.returnValue({
      urlParams: {
        start: 'myStart',
        end: 'myEnd'
      }
    });

    jest.spyOn(useLocalUIFilters, 'useLocalUIFilters').mockReturnValue({
      filters: [],
      setFilterValue: () => null,
      clearValues: () => null,
      status: FETCH_STATUS.SUCCESS
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should render services, when list is not empty', async () => {
    // mock rest requests
    coreMock.http.get.mockResolvedValueOnce({
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
    await wait(() => expect(coreMock.http.get).toHaveBeenCalledTimes(1));
    await waitForElement(() => getByText('My Python Service'));

    expect(container.querySelectorAll('.euiTableRow')).toMatchSnapshot();
  });

  it('should render getting started message, when list is empty and no historical data is found', async () => {
    coreMock.http.get.mockResolvedValueOnce({
      hasLegacyData: false,
      hasHistoricalData: false,
      items: []
    });

    const { container, getByText } = renderServiceOverview();

    // wait for requests to be made
    await wait(() => expect(coreMock.http.get).toHaveBeenCalledTimes(1));

    // wait for elements to be rendered
    await waitForElement(() =>
      getByText(
        "Looks like you don't have any APM services installed. Let's add some!"
      )
    );

    expect(container.querySelectorAll('.euiTableRow')).toMatchSnapshot();
  });

  it('should render empty message, when list is empty and historical data is found', async () => {
    coreMock.http.get.mockResolvedValueOnce({
      hasLegacyData: false,
      hasHistoricalData: true,
      items: []
    });

    const { container, getByText } = renderServiceOverview();

    // wait for requests to be made
    await wait(() => expect(coreMock.http.get).toHaveBeenCalledTimes(1));
    await waitForElement(() => getByText('No services found'));

    expect(container.querySelectorAll('.euiTableRow')).toMatchSnapshot();
  });

  describe('when legacy data is found', () => {
    it('renders an upgrade migration notification', async () => {
      // create spies
      const addWarning = jest.spyOn(
        coreMock.notifications.toasts,
        'addWarning'
      );

      coreMock.http.get.mockResolvedValueOnce({
        hasLegacyData: true,
        hasHistoricalData: true,
        items: []
      });

      renderServiceOverview();

      // wait for requests to be made
      await wait(() => expect(coreMock.http.get).toHaveBeenCalledTimes(1));

      expect(addWarning).toHaveBeenLastCalledWith(
        expect.objectContaining({
          title: 'Legacy data was detected within the selected time range'
        })
      );
    });
  });

  describe('when legacy data is not found', () => {
    it('does not render an upgrade migration notification', async () => {
      // create spies
      const addWarning = jest.spyOn(
        coreMock.notifications.toasts,
        'addWarning'
      );
      coreMock.http.get.mockResolvedValueOnce({
        hasLegacyData: false,
        hasHistoricalData: true,
        items: []
      });

      renderServiceOverview();

      // wait for requests to be made
      await wait(() => expect(coreMock.http.get).toHaveBeenCalledTimes(1));

      expect(addWarning).not.toHaveBeenCalled();
    });
  });
});
