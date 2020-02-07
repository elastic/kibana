/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_TIMEOUT } from '../../integration/lib/util/helpers';
import { KQL_SEARCH_BAR } from '../../screens/hosts/main';

export const closeFieldsBrowser = () => {
  cy.get(KQL_SEARCH_BAR, { timeout: DEFAULT_TIMEOUT }).click();
};
