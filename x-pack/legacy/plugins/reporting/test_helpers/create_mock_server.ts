/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { memoize } from 'lodash';
import { ServerFacade } from '../types';

export const createMockServer = ({ settings = {} }: any): ServerFacade => {
  const mockServer = {
    config: memoize(() => ({ get: jest.fn() })),
    info: {
      protocol: 'http',
    },
    plugins: {
      elasticsearch: {
        getCluster: memoize(() => {
          return {
            callWithRequest: jest.fn(),
          };
        }),
      },
    },
  };

  const defaultSettings: any = {
    'xpack.reporting.encryptionKey': 'testencryptionkey',
    'server.basePath': '/sbp',
    'server.host': 'localhost',
    'server.port': 5601,
    'xpack.reporting.kibanaServer': {},
  };
  mockServer.config().get.mockImplementation((key: any) => {
    return key in settings ? settings[key] : defaultSettings[key];
  });

  return (mockServer as unknown) as ServerFacade;
};
