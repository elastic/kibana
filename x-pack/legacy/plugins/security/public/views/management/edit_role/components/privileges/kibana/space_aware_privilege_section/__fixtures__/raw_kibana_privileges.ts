/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RawKibanaPrivileges } from '../../../../../../../../../common/model';

export const rawKibanaPrivileges: RawKibanaPrivileges = {
  global: {
    all: ['normal-feature-all', 'normal-feature-read', 'just-global-all'],
    read: ['normal-feature-read'],
  },
  space: {
    all: ['normal-feature-all', 'normal-feature-read'],
    read: ['normal-feature-read'],
  },
  reserved: {},
  features: {
    normal: {
      all: ['normal-feature-all', 'normal-feature-read'],
      read: ['normal-feature-read'],
    },
    excludedFromBase: {
      all: ['excluded-from-base-all', 'excluded-from-base-read'],
      read: ['excluded-from-base-read'],
    },
  },
};
