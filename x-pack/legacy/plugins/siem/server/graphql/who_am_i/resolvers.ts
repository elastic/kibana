/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceResolvers } from '../../graphql/types';

export const createWhoAmIResolvers = (): {
  Source: {
    whoAmI: SourceResolvers['whoAmI'];
  };
} => ({
  Source: {
    async whoAmI(root, args) {
      return {
        appName: 'SIEM',
      };
    },
  },
});
