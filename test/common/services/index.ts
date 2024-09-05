/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';
import { commonFunctionalUIServices } from '@kbn/ftr-common-functional-ui-services';

// pick only services that work for any FTR config, e.g. 'samlAuth' requires SAML setup in config file
const {
  es,
  esArchiver,
  kibanaServer,
  retry,
  supertestWithoutAuth,
  deployment,
  randomness,
  esDeleteAllIndices,
  savedObjectInfo,
  indexPatterns,
  bsearch,
  console,
} = commonFunctionalServices;

// pick what was there previously
const { security } = commonFunctionalUIServices;

export const services = {
  es,
  esArchiver,
  kibanaServer,
  retry,
  supertestWithoutAuth,
  deployment,
  randomness,
  security,
  esDeleteAllIndices,
  savedObjectInfo,
  indexPatterns,
  bsearch,
  console,
};
