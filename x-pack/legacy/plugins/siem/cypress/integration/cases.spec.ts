/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';

describe('Cases', () => {
  it('Creates a new case', () => {
    loginAndWaitForPageWithoutDateRange('/app/siem#/case');
  });
});
