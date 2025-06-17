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
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import type { ActionsClientMock } from '@kbn/actions-plugin/server/mocks';
import type { HasPrivilegesResponseApplication } from '@kbn/security-plugin-types-server';
import type { RulesClientMock } from '../rules_client.mock';
import { rulesClientMock } from '../rules_client.mock';
import type { RulesSettingsClientMock } from '../rules_settings/rules_settings_client.mock';
import { rulesSettingsClientMock } from '../rules_settings/rules_settings_client.mock';
import type { MaintenanceWindowClientMock } from '../maintenance_window_client.mock';
import { maintenanceWindowClientMock } from '../maintenance_window_client.mock';
import type { AlertsHealth, RuleType } from '../../common';
import type { AlertingRequestHandlerContext } from '../types';
import {
  alertDeletionClientMock,
  type AlertDeletionClientMock,
} from '../alert_deletion/alert_deletion_client.mock';

export function mockHandlerArguments(
  {
    rulesClient = rulesClientMock.create(),
    actionsClient = actionsClientMock.create(),
    rulesSettingsClient = rulesSettingsClientMock.create(),
    maintenanceWindowClient = maintenanceWindowClientMock.create(),
    listTypes: listTypesRes = [],
    getFrameworkHealth,
    areApiKeysEnabled,
    alertDeletionClient,
    hasRequiredPrivilegeGrantedInAllSpaces,
  }: {
    rulesClient?: RulesClientMock;
    actionsClient?: ActionsClientMock;
    rulesSettingsClient?: RulesSettingsClientMock;
    maintenanceWindowClient?: MaintenanceWindowClientMock;
    listTypes?: RuleType[];
    getFrameworkHealth?: jest.MockInstance<Promise<AlertsHealth>, []> &
      (() => Promise<AlertsHealth>);
    areApiKeysEnabled?: () => Promise<boolean>;
    alertDeletionClient?: AlertDeletionClientMock;
    hasRequiredPrivilegeGrantedInAllSpaces?: (
      args: HasPrivilegesResponseApplication
    ) => Promise<boolean>;
  },
  request: unknown,
  response?: Array<MethodKeysOf<KibanaResponseFactory>>
): [
  AlertingRequestHandlerContext,
  KibanaRequest<unknown, unknown, unknown>,
  KibanaResponseFactory
] {
  const listTypes = jest.fn(() => listTypesRes);
  const actionsClientMocked = actionsClient || actionsClientMock.create();

  actionsClient.isSystemAction.mockImplementation((id) => id === 'system_action-id');

  return [
    {
      alerting: {
        listTypes,
        getRulesClient() {
          return Promise.resolve(rulesClient || rulesClientMock.create());
        },
        getRulesSettingsClient() {
          return rulesSettingsClient || rulesSettingsClientMock.create();
        },
        getMaintenanceWindowClient() {
          return maintenanceWindowClient || maintenanceWindowClientMock.create();
        },
        getFrameworkHealth,
        areApiKeysEnabled: areApiKeysEnabled ? areApiKeysEnabled : () => Promise.resolve(true),
        getAlertDeletionClient() {
          return alertDeletionClient || alertDeletionClientMock.create();
        },
        hasRequiredPrivilegeGrantedInAllSpaces: hasRequiredPrivilegeGrantedInAllSpaces
          ? hasRequiredPrivilegeGrantedInAllSpaces
          : () => {
              return Promise.resolve(true);
            },
      },
      actions: {
        getActionsClient() {
          return actionsClientMocked;
        },
      },
    } as unknown as AlertingRequestHandlerContext,
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
