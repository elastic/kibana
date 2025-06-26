/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductDocInstallClient } from './product_doc_install_service';

export type InstallClientMock = jest.Mocked<ProductDocInstallClient>;

const createInstallClientMock = (): InstallClientMock => {
  return {
    getInstallationStatus: jest.fn(),
    setInstallationStarted: jest.fn(),
    setInstallationSuccessful: jest.fn(),
    setInstallationFailed: jest.fn(),
    setUninstalled: jest.fn(),
  } as unknown as InstallClientMock;
};

export const installClientMock = {
  create: createInstallClientMock,
};
