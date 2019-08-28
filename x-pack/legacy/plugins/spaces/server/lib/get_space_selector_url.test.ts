/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSpaceSelectorUrl } from './get_space_selector_url';

const buildServerConfig = (serverBasePath?: string) => {
  return {
    get: (key: string) => {
      if (key === 'server.basePath') {
        return serverBasePath;
      }
      throw new Error(`unexpected config request: ${key}`);
    },
  };
};

describe('getSpaceSelectorUrl', () => {
  it('returns / when no server base path is defined', () => {
    const serverConfig = buildServerConfig();
    expect(getSpaceSelectorUrl(serverConfig)).toEqual('/');
  });

  it('returns the server base path when defined', () => {
    const serverConfig = buildServerConfig('/my/server/base/path');
    expect(getSpaceSelectorUrl(serverConfig)).toEqual('/my/server/base/path');
  });
});
