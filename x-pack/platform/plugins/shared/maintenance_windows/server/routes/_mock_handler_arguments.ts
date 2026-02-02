/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import { identity } from 'lodash';
import type { MethodKeysOf } from '@kbn/utility-types';
import { httpServerMock } from '@kbn/core/server/mocks';
import type { MaintenanceWindowClientMock } from '../maintenance_window_client.mock';
import { maintenanceWindowClientMock } from '../maintenance_window_client.mock';
import type { MaintenanceWindowRequestHandlerContext } from '../types';

export function mockHandlerArguments(
  {
    maintenanceWindowClient = maintenanceWindowClientMock.create(),
  }: {
    maintenanceWindowClient?: MaintenanceWindowClientMock;
  },
  request: unknown,
  response?: Array<MethodKeysOf<KibanaResponseFactory>>
): [
  MaintenanceWindowRequestHandlerContext,
  KibanaRequest<unknown, unknown, unknown>,
  KibanaResponseFactory
] {
  return [
    {
      maintenanceWindow: {
        getMaintenanceWindowClient() {
          return maintenanceWindowClient || maintenanceWindowClientMock.create();
        },
      },
    } as unknown as MaintenanceWindowRequestHandlerContext,
    request as KibanaRequest<unknown, unknown, unknown>,
    mockResponseFactory(response),
  ];
}

export const mockResponseFactory = (resToMock: Array<MethodKeysOf<KibanaResponseFactory>> = []) => {
  const factory: jest.Mocked<KibanaResponseFactory> = httpServerMock.createResponseFactory();
  resToMock.forEach((key: string) => {
    if (key in factory) {
      Object.defineProperty(factory, key, {
        value: jest.fn(identity),
      });
    }
  });
  return factory as unknown as KibanaResponseFactory;
};
