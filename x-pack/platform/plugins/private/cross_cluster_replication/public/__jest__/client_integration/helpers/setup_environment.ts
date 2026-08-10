/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { docLinksServiceMock } from '@kbn/core/public/mocks';
import { init as initDocumentation } from '../../../app/services/documentation_links';
import { init as initHttpRequests } from './http_requests';
import { setHttpClient } from '../../../app/services/api';

export const setupEnvironment = () => {
  const httpRequests = initHttpRequests();

  setHttpClient(httpRequests.httpSetup);
  initDocumentation(docLinksServiceMock.createStartContract());

  return httpRequests;
};
