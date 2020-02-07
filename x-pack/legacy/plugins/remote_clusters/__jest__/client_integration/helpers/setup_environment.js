/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import axiosXhrAdapter from 'axios/lib/adapters/xhr';
import chrome from 'ui/chrome'; // eslint-disable-line import/no-unresolved
import { MANAGEMENT_BREADCRUMB } from 'ui/management'; // eslint-disable-line import/no-unresolved
import { fatalError, toastNotifications } from 'ui/notify'; // eslint-disable-line import/no-unresolved

import { init as initBreadcrumb } from '../../../public/app/services/breadcrumb';
import { init as initHttp } from '../../../public/app/services/http';
import { init as initNotification } from '../../../public/app/services/notification';
import { init as initUiMetric } from '../../../public/app/services/ui_metric';
import { init as initHttpRequests } from './http_requests';

export const setupEnvironment = () => {
  chrome.breadcrumbs = {
    set: () => {},
  };
  // axios has a $http like interface so using it to simulate $http
  initHttp(axios.create({ adapter: axiosXhrAdapter }), path => path);
  initBreadcrumb(() => {}, MANAGEMENT_BREADCRUMB);
  initNotification(toastNotifications, fatalError);
  initUiMetric(() => () => {});

  const { server, httpRequestsMockHelpers } = initHttpRequests();

  return {
    server,
    httpRequestsMockHelpers,
  };
};
