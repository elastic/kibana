/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, firstValueFrom } from 'rxjs';
import type { PluginInitializerContext } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { cloudMock } from '@kbn/cloud-plugin/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { ILicense, LicenseType } from '@kbn/licensing-types';
import { StackConnectorsPlugin } from './plugin';
import type { ConnectorsPluginsStart } from './plugin';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { experimentalFeaturesMock } from '../public/mocks';
import { parseExperimentalConfigValue } from '../common/experimental_features';
import { connectorsSpecs } from '@kbn/connector-specs';

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
      const actionsConfigurationUtilities = actionsSetup.getActionsConfigurationUtilities();
      (actionsConfigurationUtilities.getWebhookSettings as jest.Mock).mockReturnValue({
        ssl: { pfx: { enabled: true } },
      });

      plugin.setup(coreSetup, { actions: actionsSetup });

      const specConnectorTypes = Object.values(connectorsSpecs);
      const builtInConnectorTypesCount = 18;

      expect(actionsSetup.registerType).toHaveBeenCalledTimes(
        builtInConnectorTypesCount + specConnectorTypes.length
      );
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
          id: '.http',
          name: 'HTTP',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        10,
        expect.objectContaining({
          id: '.http-system',
          name: 'HTTP',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        11,
        expect.objectContaining({
          id: '.cases-webhook',
          name: 'Webhook - Case Management',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        12,
        expect.objectContaining({
          id: '.xmatters',
          name: 'xMatters',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        13,
        expect.objectContaining({
          id: '.servicenow',
          name: 'ServiceNow ITSM',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        14,
        expect.objectContaining({
          id: '.servicenow-sir',
          name: 'ServiceNow SecOps',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        15,
        expect.objectContaining({
          id: '.servicenow-itom',
          name: 'ServiceNow ITOM',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        16,
        expect.objectContaining({
          id: '.jira',
          name: 'Jira',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        17,
        expect.objectContaining({
          id: '.teams',
          name: 'Microsoft Teams',
        })
      );
      expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
        18,
        expect.objectContaining({
          id: '.torq',
          name: 'Torq',
        })
      );

      // Spec Connector Types registered
      specConnectorTypes.forEach((spec, index) => {
        expect(actionsSetup.registerType).toHaveBeenNthCalledWith(
          builtInConnectorTypesCount + index + 1,
          expect.objectContaining({
            id: spec.metadata.id,
            name: spec.metadata.displayName,
          })
        );
      });

      // SubAction Connectors
      expect(actionsSetup.registerSubActionConnectorType).toHaveBeenCalledTimes(15);
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
          id: '.jira-service-management',
          name: 'Jira Service Management',
        })
      );
      expect(actionsSetup.registerSubActionConnectorType).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          id: '.tines',
          name: 'Tines',
        })
      );
      expect(actionsSetup.registerSubActionConnectorType).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          id: '.gen-ai',
          name: 'OpenAI',
        })
      );
      expect(actionsSetup.registerSubActionConnectorType).toHaveBeenNthCalledWith(
        5,
        expect.objectContaining({
          id: '.bedrock',
          name: 'Amazon Bedrock',
        })
      );
      expect(actionsSetup.registerSubActionConnectorType).toHaveBeenNthCalledWith(
        6,
        expect.objectContaining({
          id: '.gemini',
          name: 'Google Gemini',
        })
      );
      expect(actionsSetup.registerSubActionConnectorType).toHaveBeenNthCalledWith(
        7,
        expect.objectContaining({
          id: '.d3security',
          name: 'D3 Security',
        })
      );
      expect(actionsSetup.registerSubActionConnectorType).toHaveBeenNthCalledWith(
        8,
        expect.objectContaining({
          id: '.resilient',
          name: 'IBM Resilient',
        })
      );
      expect(actionsSetup.registerSubActionConnectorType).toHaveBeenNthCalledWith(
        9,
        expect.objectContaining({
          id: '.thehive',
          name: 'TheHive',
        })
      );
      expect(actionsSetup.registerSubActionConnectorType).toHaveBeenNthCalledWith(
        10,
        expect.objectContaining({
          id: '.xsoar',
          name: 'XSOAR',
        })
      );
      expect(actionsSetup.registerSubActionConnectorType).toHaveBeenNthCalledWith(
        11,
        expect.objectContaining({
          id: '.mcp',
          name: 'MCP',
        })
      );
      expect(actionsSetup.registerSubActionConnectorType).toHaveBeenNthCalledWith(
        12,
        expect.objectContaining({
          id: '.sentinelone',
          name: 'Sentinel One',
        })
      );
      expect(actionsSetup.registerSubActionConnectorType).toHaveBeenNthCalledWith(
        13,
        expect.objectContaining({
          id: '.crowdstrike',
          name: 'CrowdStrike',
        })
      );
    });
  });

  describe('Elastic Cloud trial detection (isElasticCloudTrial)', () => {
    const setupPlugin = (cloud?: CloudSetup) => {
      const context = coreMock.createPluginInitializerContext();
      mockParseExperimentalConfigValue.mockReturnValue({ ...experimentalFeaturesMock });
      const plugin = new StackConnectorsPlugin(context);

      const actionsSetup = actionsMock.createSetup();
      (
        actionsSetup.getActionsConfigurationUtilities().getWebhookSettings as jest.Mock
      ).mockReturnValue({ ssl: { pfx: { enabled: true } } });

      plugin.setup(coreMock.createSetup(), { actions: actionsSetup, cloud });
      return plugin;
    };

    // `getLicense()` resolves the current value of the license observable (as the real
    // licensing plugin does), so pushing onto `license$` simulates a live license change.
    const startWithLicense = (
      plugin: StackConnectorsPlugin,
      license$: BehaviorSubject<ILicense>
    ) => {
      const licensing = {
        ...licensingMock.createStart(),
        license$,
        getLicense: jest.fn(() => firstValueFrom(license$)),
      } as unknown as LicensingPluginStart;
      plugin.start(coreMock.createStart(), { licensing } as unknown as ConnectorsPluginsStart);
    };

    const createLicense$ = (type: LicenseType) =>
      new BehaviorSubject<ILicense>(licensingMock.createLicense({ license: { type } }));

    // Access the private detection method for focused unit coverage.
    const isElasticCloudTrial = (plugin: StackConnectorsPlugin) =>
      (plugin as unknown as { isElasticCloudTrial: () => Promise<boolean> }).isElasticCloudTrial();

    const createServerlessCloud = (organizationInTrial: boolean): CloudSetup => {
      const cloud = cloudMock.createSetup();
      return {
        ...cloud,
        isServerlessEnabled: true,
        serverless: { ...cloud.serverless, organizationInTrial },
      };
    };

    it('returns true on a Serverless deployment whose organization is in trial', async () => {
      const plugin = setupPlugin(createServerlessCloud(true));
      startWithLicense(plugin, createLicense$('enterprise'));

      await expect(isElasticCloudTrial(plugin)).resolves.toBe(true);
    });

    it('returns false on a Serverless deployment that is not in trial', async () => {
      const plugin = setupPlugin(createServerlessCloud(false));
      startWithLicense(plugin, createLicense$('enterprise'));

      await expect(isElasticCloudTrial(plugin)).resolves.toBe(false);
    });

    it('returns true on ECH when the current license type is trial', async () => {
      const plugin = setupPlugin(cloudMock.createSetup());
      startWithLicense(plugin, createLicense$('trial'));

      await expect(isElasticCloudTrial(plugin)).resolves.toBe(true);
    });

    it('returns false on ECH when the current license type is not trial', async () => {
      const plugin = setupPlugin(cloudMock.createSetup());
      startWithLicense(plugin, createLicense$('gold'));

      await expect(isElasticCloudTrial(plugin)).resolves.toBe(false);
    });

    it('reacts to a live ECH trial -> paid license change without a restart', async () => {
      const plugin = setupPlugin(cloudMock.createSetup());
      const license$ = createLicense$('trial');
      startWithLicense(plugin, license$);

      await expect(isElasticCloudTrial(plugin)).resolves.toBe(true);

      // Simulate the license being refreshed to a converted, paid license.
      license$.next(licensingMock.createLicense({ license: { type: 'platinum' } }));

      await expect(isElasticCloudTrial(plugin)).resolves.toBe(false);
    });

    it('returns false on a self-managed deployment (no cloud, no trial license)', async () => {
      const plugin = setupPlugin(undefined);
      startWithLicense(plugin, createLicense$('basic'));

      await expect(isElasticCloudTrial(plugin)).resolves.toBe(false);
    });
  });
});
