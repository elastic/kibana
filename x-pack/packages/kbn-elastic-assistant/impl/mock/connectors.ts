/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionType } from '@kbn/actions-plugin/common';

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

export const mockConnectors = [
  {
    id: 'connectorId',
    name: 'Captain Connector',
    isMissingSecrets: false,
    actionTypeId: '.gen-ai',
    config: {
      apiProvider: 'OpenAI',
    },
  },
  {
    id: 'connectorId2',
    name: 'Professor Connector',
    isMissingSecrets: false,
    actionTypeId: '.gen-ai',
    config: {
      apiProvider: 'OpenAI',
    },
  },
];
