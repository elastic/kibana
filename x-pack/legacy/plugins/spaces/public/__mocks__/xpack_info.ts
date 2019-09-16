/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../../../xpack_main/public/services/xpack_info', () => {
  return {
    xpackInfo: {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'features.security.showLinks') {
          return true;
        }
        throw new Error(`unexpected key: ${key}`);
      }),
    },
  };
});
