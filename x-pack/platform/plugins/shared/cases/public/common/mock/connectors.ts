/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import { createMockConnectorType } from '@kbn/actions-plugin/server/application/connector/mocks';
import { createMockActionConnector } from '@kbn/alerts-ui-shared/src/common/test_utils/connector.mock';
import type { ActionConnector, ActionTypeConnector } from '../../../common/types/domain';
import { basicPush } from '../../containers/mock';
import type { CaseConnectors } from '../../containers/types';

export const connectorsMock: ActionConnector[] = [
  createMockActionConnector({
    id: 'servicenow-1',
    actionTypeId: '.servicenow',
    name: 'My SN connector',
    config: {
      apiUrl: 'https://instance1.service-now.com',
    },
  }),
  createMockActionConnector({
    id: 'resilient-2',
    actionTypeId: '.resilient',
    name: 'My Resilient connector',
    config: {
      apiUrl: 'https://test/',
      orgId: '201',
    },
  }),
  createMockActionConnector({
    id: 'jira-1',
    actionTypeId: '.jira',
    name: 'Jira',
    config: {
      apiUrl: 'https://instance.atlassian.ne',
    },
  }),
  createMockActionConnector({
    id: 'servicenow-sir',
    actionTypeId: '.servicenow-sir',
    name: 'My Connector SIR',
    config: {
      apiUrl: 'https://instance1.service-now.com',
    },
  }),
  createMockActionConnector({
    id: 'servicenow-uses-table-api',
    actionTypeId: '.servicenow',
    name: 'My deprecated SN connector',
    config: {
      apiUrl: 'https://instance1.service-now.com',
      usesTableApi: true,
    },
    isDeprecated: true,
  }),
];

export const actionTypesMock: ActionTypeConnector[] = [
  createMockConnectorType({
    id: '.email',
    name: 'Email',
    minimumLicenseRequired: 'gold',
    supportedFeatureIds: ['alerting'],
  }),
  createMockConnectorType({
    id: '.index',
    name: 'Index',
    supportedFeatureIds: ['alerting'],
  }),
  createMockConnectorType({
    id: '.servicenow',
    name: 'ServiceNow',
    minimumLicenseRequired: 'platinum',
    enabled: false,
    supportedFeatureIds: ['alerting', 'cases'],
  }),
  createMockConnectorType({
    id: '.jira',
    name: 'Jira',
    minimumLicenseRequired: 'gold',
    supportedFeatureIds: ['alerting', 'cases'],
  }),
  createMockConnectorType({
    id: '.resilient',
    name: 'IBM Resilient',
    minimumLicenseRequired: 'platinum',
    enabled: false,
    supportedFeatureIds: ['alerting', 'cases'],
  }),
  createMockConnectorType({
    id: '.servicenow-sir',
    name: 'ServiceNow SIR',
    minimumLicenseRequired: 'platinum',
    enabled: false,
    supportedFeatureIds: ['alerting', 'cases'],
  }),
];

/**
 * Construct a mock getConnectors response object
 *
 * @param overrides is an object where the key is the path for setting a field in the returned object. For example to set
 *  the externalService.connectorId pass the following overrides object:
 *
 * ```
 *    {
 *      'push.details.externalService.connectorId': '123'
 *    }
 * ```
 */
export const getCaseConnectorsMockResponse = (
  overrides?: Record<string, unknown>
): CaseConnectors => {
  return connectorsMock.reduce((acc, connector) => {
    const newConnectors: CaseConnectors = {
      ...acc,
      [connector.id]: {
        id: connector.id,
        name: connector.name,
        type: connector.actionTypeId,
        fields: null,
        push: {
          needsToBePushed: false,
          hasBeenPushed: true,
          details: {
            oldestUserActionPushDate: '2023-01-17T09:46:29.813Z',
            latestUserActionPushDate: '2023-01-17T09:46:29.813Z',
            externalService: {
              ...basicPush,
              connectorId: connector.id,
              connectorName: connector.name,
            },
          },
        },
      },
    };

    if (overrides != null) {
      for (const path of Object.keys(overrides)) {
        set(newConnectors[connector.id], path, overrides[path]);
      }
    }

    return newConnectors;
  }, {});
};
