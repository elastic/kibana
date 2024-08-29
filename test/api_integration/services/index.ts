/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';
import { commonFunctionalUIServices } from '@kbn/ftr-common-functional-ui-services';
import { KibanaSupertestProvider, ElasticsearchSupertestProvider } from './supertest';

export const services = {
  ...commonFunctionalServices,
  ...commonFunctionalUIServices,
  supertest: KibanaSupertestProvider,
  esSupertest: ElasticsearchSupertestProvider,
};
