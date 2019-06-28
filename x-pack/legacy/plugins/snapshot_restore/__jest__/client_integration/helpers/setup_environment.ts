/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import axiosXhrAdapter from 'axios/lib/adapters/xhr';

import { i18n } from '@kbn/i18n';

import { httpService } from '../../../public/app/services/http';
import { breadcrumbService } from '../../../public/app/services/navigation';
import { textService } from '../../../public/app/services/text';
import { chrome } from '../../../public/test/mocks';
import { init as initHttpRequests } from './http_requests';

export const setupEnvironment = () => {
  httpService.init(axios.create({ adapter: axiosXhrAdapter }), {
    addBasePath: (path: string) => path,
  });
  breadcrumbService.init(chrome, {});
  textService.init(i18n);

  const { server, httpRequestsMockHelpers } = initHttpRequests();

  return {
    server,
    httpRequestsMockHelpers,
  };
};
