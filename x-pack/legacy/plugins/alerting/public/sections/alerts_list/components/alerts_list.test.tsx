/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { some, none } from 'fp-ts/lib/Option';
import { shallow } from 'enzyme';
import { Chrome } from 'ui/chrome';
import { AlertsList, NoAlerts, AlertsTable, AlertsLoadingIndicator } from './alerts_list';
import { MANAGEMENT_BREADCRUMB } from 'ui/management';
import { listBreadcrumb } from '../../../lib/breadcrumbs';
import { Result, asOk, asErr } from '../../../lib/result_type';
import {
  AlertingApi,
  RequestData,
  LoadAlertsResponse,
  AlertResponse,
  LoadAlertsErrorResponse,
} from '../../../lib/api';
import { PageError } from '../../../components';

describe('Alerts List', () => {
  it.skip('should set the breadcrumbs', () => {
    /*
      TODO: Seems useEffect isn't being triggered by shallow render, look into why before a PR is submitted
       */
    const mockBreadcrumbs: Chrome['breadcrumbs'] = {
      get$: jest.fn(),
      set: jest.fn(),
      push: jest.fn(),
      filter: jest.fn(),
      pop: jest.fn(),
    };

    shallow(<AlertsList breadcrumbs={mockBreadcrumbs} />);

    expect(mockBreadcrumbs.set).toHaveBeenLastCalledWith([MANAGEMENT_BREADCRUMB, listBreadcrumb]);
  });

  it('should prompt for NoAlerts when there are none available', () => {
    const comp = shallow(<AlertsList />);
    expect(comp.contains(<NoAlerts />)).toBeTruthy();
  });

  it('should indicate that Alerts are loading when the api indicates that to be the case', () => {
    const api: AlertingApi = {
      loadAlerts: (pollIntervalMs: number): Result<RequestData<LoadAlertsResponse>, any> => {
        return asOk({ isLoading: true, data: none });
      },
    };
    const comp = shallow(<AlertsList api={some(api)} />);
    expect(comp.contains(<AlertsLoadingIndicator />)).toBeTruthy();
  });

  it('should render the Alerts table when the api has finished loading the alerts', () => {
    const api: AlertingApi = {
      loadAlerts: (
        pollIntervalMs: number
      ): Result<RequestData<LoadAlertsResponse>, LoadAlertsErrorResponse> => {
        return asOk({
          isLoading: false,
          data: some({
            page: 1,
            perPage: 1,
            total: 1,
            data: DUMMY_ALERTS_DATA,
          }),
        });
      },
    };
    const comp = shallow(<AlertsList api={some(api)} />);
    expect(comp.contains(<AlertsTable alerts={DUMMY_ALERTS_DATA} />)).toBeTruthy();
  });

  it('should handle a 404 error result from the api', () => {
    const api: AlertingApi = {
      loadAlerts: (
        pollIntervalMs: number
      ): Result<RequestData<LoadAlertsResponse>, LoadAlertsErrorResponse> => {
        return asErr({
          status: 404,
        });
      },
    };
    const comp = shallow(<AlertsList api={some(api)} />);
    expect(comp.contains(<PageError errorCode={{ status: 404 }} />)).toBeTruthy();
  });

  it('should handle a 403 error result from the api', () => {
    const api: AlertingApi = {
      loadAlerts: (
        pollIntervalMs: number
      ): Result<RequestData<LoadAlertsResponse>, LoadAlertsErrorResponse> => {
        return asErr({
          status: 403,
        });
      },
    };
    const comp = shallow(<AlertsList api={some(api)} />);
    expect(comp.contains(<PageError errorCode={{ status: 403 }} />)).toBeTruthy();
  });
});

describe('Alerts List: Empty List', () => {
  it('should render an Empty Prompt', () => {
    const comp = shallow(<NoAlerts />);
    expect(comp).toMatchSnapshot();
  });
});

describe('Alerts List: Alerts Table', () => {
  it('should render a list', () => {
    const comp = shallow(<AlertsTable alerts={DUMMY_ALERTS_DATA} />);
    expect(comp).toMatchSnapshot();
  });
});

const DUMMY_ALERTS_DATA: AlertResponse[] = [
  {
    id: '0f73f885-ee6d-4693-8ba1-f545bff26834',
    alertTypeId: '.always-firing',
    interval: '1s',
    actions: [
      {
        group: 'default',
        params: {
          message: 'from alert 1s',
        },
        id: '21d865f7-32bc-4428-b08d-25614cd30294',
      },
    ],
    alertTypeParams: {
      index: 'test_alert_from_cli',
    },
    enabled: true,
    createdBy: 'elastic',
    updatedBy: 'elastic',
    apiKeyOwner: 'elastic',
    scheduledTaskId: 'a574d2e0-d2d3-11e9-964e-d30e64b0a254',
  },
  {
    id: '0c1268ed-b19f-446f-9eb8-9f4987432ef4',
    alertTypeId: '.always-firing',
    interval: '1s',
    actions: [
      {
        group: 'default',
        params: {
          message: 'from alert 1s',
        },
        id: 'b6bd4b41-bd2c-47b9-975c-b408b0a0e8be',
      },
    ],
    alertTypeParams: {
      index: 'test_alert_from_cli',
    },
    enabled: true,
    createdBy: 'elastic',
    updatedBy: 'elastic',
    apiKeyOwner: 'elastic',
    scheduledTaskId: 'c05f6340-d2d3-11e9-964e-d30e64b0a254',
  },
];
