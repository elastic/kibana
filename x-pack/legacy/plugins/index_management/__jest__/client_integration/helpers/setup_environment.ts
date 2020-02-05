/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import axiosXhrAdapter from 'axios/lib/adapters/xhr';
import { init as initHttpRequests } from './http_requests';
import { httpService } from '../../../public/app/services/http';
import { breadcrumbService } from '../../../public/app/services/breadcrumbs';
import { documentationService } from '../../../public/app/services/documentation';
import { notificationService } from '../../../public/app/services/notification';
import { uiMetricService } from '../../../public/app/services/ui_metric';
import { createUiStatsReporter } from '../../../../../../../src/legacy/core_plugins/ui_metric/public';

/* eslint-disable @kbn/eslint/no-restricted-paths */
import { notificationServiceMock } from '../../../../../../../src/core/public/notifications/notifications_service.mock';
import { chromeServiceMock } from '../../../../../../../src/core/public/chrome/chrome_service.mock';
import { docLinksServiceMock } from '../../../../../../../src/core/public/doc_links/doc_links_service.mock';

const mockHttpClient = axios.create({ adapter: axiosXhrAdapter });

export const setupEnvironment = () => {
  // Mock initialization of services
  // @ts-ignore
  httpService.init(mockHttpClient);
  breadcrumbService.init(chromeServiceMock.createStartContract(), '');
  documentationService.init(docLinksServiceMock.createStartContract());
  notificationService.init(notificationServiceMock.createStartContract());
  uiMetricService.init(createUiStatsReporter);

  const { server, httpRequestsMockHelpers } = initHttpRequests();

  return {
    server,
    httpRequestsMockHelpers,
  };
};
