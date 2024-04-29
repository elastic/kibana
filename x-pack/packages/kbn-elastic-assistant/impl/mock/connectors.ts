/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionType } from '@kbn/actions-plugin/common';
import { AIConnector } from '../connectorland/connector_selector';

export const mockActionTypes = [
  {
    id: '.gen-ai',
    name: 'OpenAI',
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    minimumLicenseRequired: 'basic',
    isSystemActionType: true,
    supportedFeatureIds: ['generativeAI'],
  } as ActionType,
  {
    id: '.bedrock',
    name: 'Bedrock',
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    minimumLicenseRequired: 'basic',
    isSystemActionType: true,
    supportedFeatureIds: ['generativeAI'],
  } as ActionType,
];

export const mockConnectors: AIConnector[] = [
  {
    id: 'connectorId',
    name: 'Captain Connector',
    isMissingSecrets: false,
    actionTypeId: '.gen-ai',
    secrets: {},
    isPreconfigured: false,
    isDeprecated: false,
    isSystemAction: false,
    config: {
      apiProvider: 'OpenAI',
    },
  },
  {
    id: 'c29c28a0-20fe-11ee-9306-a1f4d42ec542',
    name: 'Professor Connector',
    isMissingSecrets: false,
    actionTypeId: '.gen-ai',
    secrets: {},
    isPreconfigured: false,
    isDeprecated: false,
    isSystemAction: false,
    config: {
      apiProvider: 'OpenAI',
    },
  },
];
