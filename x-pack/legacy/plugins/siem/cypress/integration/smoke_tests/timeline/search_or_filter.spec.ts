/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  assertAtLeastOneEventMatchesSearch,
  executeKQL,
  hostExistsQuery,
  toggleTimelineVisibility,
} from '../../lib/timeline/helpers';
import { HOSTS_PAGE } from '../../lib/urls';
import { loginAndWaitForPage } from '../../lib/util/helpers';

describe('timeline search or filter KQL bar', () => {
  beforeEach(() => {
    loginAndWaitForPage(HOSTS_PAGE);
  });

  it('executes a KQL query', () => {
    toggleTimelineVisibility();

    executeKQL(hostExistsQuery);

    assertAtLeastOneEventMatchesSearch();
  });
});
