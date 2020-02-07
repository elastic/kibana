/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import axiosXhrAdapter from 'axios/lib/adapters/xhr';
import { init as initHttpRequests } from './http_requests';
import { httpService } from '../../../public/application/services/http';
import { breadcrumbService } from '../../../public/application/services/breadcrumbs';
import { documentationService } from '../../../public/application/services/documentation';
import { notificationService } from '../../../public/application/services/notification';

/* eslint-disable @kbn/eslint/no-restricted-paths */
import { notificationServiceMock } from '../../../../../../../src/core/public/notifications/notifications_service.mock';
import { chromeServiceMock } from '../../../../../../../src/core/public/chrome/chrome_service.mock';
import { docLinksServiceMock } from '../../../../../../../src/core/public/doc_links/doc_links_service.mock';

const mockHttpClient = axios.create({ adapter: axiosXhrAdapter });

export const setupEnvironment = () => {
  // Mock initialization of services
  // @ts-ignore
  httpService.setup(mockHttpClient);
  breadcrumbService.setup(chromeServiceMock.createStartContract(), '');
  documentationService.setup(docLinksServiceMock.createStartContract());
  notificationService.setup(notificationServiceMock.createStartContract());

  const { server, httpRequestsMockHelpers } = initHttpRequests();

  return {
    server,
    httpRequestsMockHelpers,
  };
};
