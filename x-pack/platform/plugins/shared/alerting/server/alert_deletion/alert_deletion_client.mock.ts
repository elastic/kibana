/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { AlertDeletionClient } from './alert_deletion_client';

type AlertDeletionClientContract = PublicMethodsOf<AlertDeletionClient>;
export type AlertDeletionClientMock = jest.Mocked<AlertDeletionClientContract>;

const createAlertDeletionClientMock = () => {
  return jest.fn().mockImplementation(() => {
    return {
      getLastRun: jest.fn(),
      previewTask: jest.fn(),
      scheduleTask: jest.fn(),
    };
  });
};

export const alertDeletionClientMock = {
  create: createAlertDeletionClientMock(),
};
