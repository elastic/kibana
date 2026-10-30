/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INVESTIGATIONS_API_PRIVILEGE_MANAGE,
  INVESTIGATIONS_API_PRIVILEGE_READ,
} from '../constants';

/** Read routes accept the read or the manage privilege. */
export const INVESTIGATIONS_READ_AUTHZ = {
  authz: {
    requiredPrivileges: [
      { anyRequired: [INVESTIGATIONS_API_PRIVILEGE_READ, INVESTIGATIONS_API_PRIVILEGE_MANAGE] },
    ],
  },
};
