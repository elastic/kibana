/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EMSClient } from '@elastic/ems-client';
import { getEMSClient } from './meta';

jest.mock('@elastic/ems-client');

jest.mock('ui/chrome', () => ({
  getBasePath: () => {
    return '<basepath>';
  },
  getInjected(key) {
    if (key === 'proxyElasticMapsServiceInMaps') {
      return false;
    } else if (key === 'isEmsEnabled') {
      return true;
    } else if (key === 'emsFileApiUrl') {
      return 'https://file-api';
    } else if (key === 'emsTileApiUrl') {
      return 'https://tile-api';
    }
  },
  getUiSettingsClient: () => {
    return {
      get: () => {
        return '';
      },
    };
  },
}));

jest.mock('./kibana_services', () => {
  return {
    getLicenseId() {
      return 'foobarlicenseid';
    },
  };
});

describe('default use without proxy', () => {
  it('should construct EMSClient with absolute file and tile API urls', async () => {
    getEMSClient();
    const mockEmsClientCall = EMSClient.mock.calls[0];
    expect(mockEmsClientCall[0].fileApiUrl.startsWith('https://file-api')).toBe(true);
    expect(mockEmsClientCall[0].tileApiUrl.startsWith('https://tile-api')).toBe(true);
  });
});
