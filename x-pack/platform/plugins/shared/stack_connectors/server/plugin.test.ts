/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { StackConnectorsPlugin } from './plugin';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { experimentalFeaturesMock } from '../public/mocks';
import { parseExperimentalConfigValue } from '../common/experimental_features';

jest.mock('../common/experimental_features');

const mockParseExperimentalConfigValue = parseExperimentalConfigValue as jest.Mock;

describe('Stack Connectors Plugin', () => {
  describe('setup()', () => {
    let context: PluginInitializerContext;
    let plugin: StackConnectorsPlugin;
    let coreSetup: ReturnType<typeof coreMock.createSetup>;

    beforeEach(() => {
      context = coreMock.createPluginInitializerContext();
      mockParseExperimentalConfigValue.mockReturnValue({
        ...experimentalFeaturesMock,
      });

      plugin = new StackConnectorsPlugin(context);
      coreSetup = coreMock.createSetup();
    });

    it('should register built in connector types', () => {
      const actionsSetup = actionsMock.createSetup();
      plugin.setup(coreSetup, { actions: actionsSetup });
      expect(actionsSetup.registerType).toHaveBeenCalledTimes(16);
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          id: '.email',
          name: 'Email',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          id: '.index',
          name: 'Index',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          id: '.pagerduty',
          name: 'PagerDuty',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          id: '.swimlane',
          name: 'Swimlane',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        5,
        expect.objectContaining({
          id: '.server-log',
          name: 'Server log',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        6,
        expect.objectContaining({
          id: '.slack',
          name: 'Slack',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        8,
        expect.objectContaining({
          id: '.webhook',
          name: 'Webhook',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        9,
        expect.objectContaining({
          id: '.cases-webhook',
          name: 'Webhook - Case Management',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        10,
        expect.objectContaining({
          id: '.xmatters',
          name: 'xMatters',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        11,
        expect.objectContaining({
          id: '.servicenow',
          name: 'ServiceNow ITSM',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        12,
        expect.objectContaining({
          id: '.servicenow-sir',
          name: 'ServiceNow SecOps',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        13,
        expect.objectContaining({
          id: '.servicenow-itom',
          name: 'ServiceNow ITOM',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        14,
        expect.objectContaining({
          id: '.jira',
          name: 'Jira',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        15,
        expect.objectContaining({
          id: '.teams',
          name: 'Microsoft Teams',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        16,
        expect.objectContaining({
          id: '.torq',
          name: 'Torq',
        })
      );
      expect(actionsSetup.registerSubActionConnectorType).toHaveBeenCalledTimes(12);
      expect(actionsSetup.registerSubActionConnectorType).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          id: '.opsgenie',
          name: 'Opsgenie',
        })
      );
      expect(actionsSetup.registerSubActionConnectorType).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          id: '.tines',
          name: 'Tines',
        })
      );
      expect(actionsSetup.registerSubActionConnectorType).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          id: '.gen-ai',
          name: 'OpenAI',
        })
      );
      expect(actionsSetup.registerSubActionConnectorType).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          id: '.bedrock',
          name: 'Amazon Bedrock',
        })
      );
      expect(actionsSetup.registerSubActionConnectorType).toHaveBeenNthCalledWith(
        5,
        expect.objectContaining({
          id: '.gemini',
          name: 'Google Gemini',
        })
      );
      expect(actionsSetup.registerSubActionConnectorType).toHaveBeenNthCalledWith(
        6,
        expect.objectContaining({
          id: '.d3security',
          name: 'D3 Security',
        })
      );
      expect(actionsSetup.registerSubActionConnectorType).toHaveBeenNthCalledWith(
        7,
        expect.objectContaining({
          id: '.resilient',
          name: 'IBM Resilient',
        })
      );
      expect(actionsSetup.registerSubActionConnectorType).toHaveBeenNthCalledWith(
        8,
        expect.objectContaining({
          id: '.thehive',
          name: 'TheHive',
        })
      );
      expect(actionsSetup.registerSubActionConnectorType).toHaveBeenNthCalledWith(
        9,
        expect.objectContaining({
          id: '.sentinelone',
          name: 'Sentinel One',
        })
      );
      expect(actionsSetup.registerSubActionConnectorType).toHaveBeenNthCalledWith(
        10,
        expect.objectContaining({
          id: '.crowdstrike',
          name: 'CrowdStrike',
        })
      );
    });
  });
});
