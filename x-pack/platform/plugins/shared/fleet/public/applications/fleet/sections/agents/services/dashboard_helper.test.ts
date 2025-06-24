/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetInfoResponse } from '../../../../../../common';

import { getDashboardIdForSpace } from './dashboard_helpers';

const PKG_INFO = {
  item: {
    status: 'installed',
    installationInfo: {
      install_status: 'installed',
      installed_kibana_space_id: 'default',
      additional_spaces_installed_kibana: {
        test: [
          {
            id: 'test-destination-1',
            originId: 'test-id-1',
          },
        ],
      },
    },
  },
} as unknown as GetInfoResponse;

describe('getDashboardIdForSpace', () => {
  it('return the same id if package is installed in the same space', () => {
    expect(() => getDashboardIdForSpace('default', PKG_INFO, 'test-id-1'));
  });

  it('return the destination ID if package is installed in an additionnal space', () => {
    expect(() => getDashboardIdForSpace('test', PKG_INFO, 'test-id-1'));
  });
});
