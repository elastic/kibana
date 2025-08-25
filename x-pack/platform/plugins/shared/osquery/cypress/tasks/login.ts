/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServerlessRoleName } from '../support/roles';

/**
 * By default, we log in as a SOC_MANAGER to properly initialize Security Solution App
 */
export const login = (role: ServerlessRoleName = ServerlessRoleName.SOC_MANAGER) => {
  cy.login(role);
};
