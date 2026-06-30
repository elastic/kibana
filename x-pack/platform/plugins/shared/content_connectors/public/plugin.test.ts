/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { managementPluginMock } from '@kbn/management-plugin/public/mocks';
import type { FeatureCatalogueSolution } from '@kbn/home-plugin/public';
import type { ManagementApp } from '@kbn/management-plugin/public';

import { SearchConnectorsPlugin } from './plugin';
import type { ClientConfigType } from '../common/types/config';
import { PLUGIN_ID } from '../common/constants';
import type {
  SearchConnectorsPluginStart,
  SearchConnectorsPluginSetupDependencies,
  SearchConnectorsPluginStartDependencies,
} from './types';

const securitySolution: FeatureCatalogueSolution = {
  id: 'securitySolution',
  title: 'Security',
  description: '',
  icon: 'logoSecurity',
  path: '/app/security',
  order: 300,
};

const observabilitySolution: FeatureCatalogueSolution = {
  id: 'observability',
  title: 'Observability',
  description: '',
  icon: 'logoObservability',
  path: '/app/observability',
  order: 200,
};

const otherSolution: FeatureCatalogueSolution = {
  id: 'kibana',
  title: 'Analytics',
  description: '',
  icon: 'logoKibana',
  path: '/app/home',
  order: 400,
};

const createPlugin = (config: ClientConfigType) => {
  const initializerContext = coreMock.createPluginInitializerContext(config);
  return new SearchConnectorsPlugin(initializerContext);
};

const createSetupDependencies = () => {
  const managementSetup = managementPluginMock.createSetupContract();
  const registeredApp = {
    enabled: true,
    disable: jest.fn(),
    enable: jest.fn(),
  } as unknown as ManagementApp;
  (managementSetup.sections.section.data.registerApp as jest.Mock).mockReturnValue(registeredApp);
  return { managementSetup, registeredApp };
};

const createStartDependencies = (
  solutions: FeatureCatalogueSolution[]
): SearchConnectorsPluginStartDependencies => {
  const home = {
    featureCatalogue: {
      getSolutions: jest.fn(() => solutions),
    },
  };
  return { home } as unknown as SearchConnectorsPluginStartDependencies;
};

type PluginCoreSetup = CoreSetup<
  SearchConnectorsPluginStartDependencies,
  SearchConnectorsPluginStart
>;

const setupPlugin = ({ uiEnabled }: { uiEnabled: boolean }) => {
  const plugin = createPlugin({ ui: { enabled: uiEnabled } });
  const coreSetup = coreMock.createSetup() as unknown as PluginCoreSetup;
  const { managementSetup, registeredApp } = createSetupDependencies();
  plugin.setup(coreSetup, {
    management: managementSetup,
  } as unknown as SearchConnectorsPluginSetupDependencies);
  return { plugin, coreSetup, managementSetup, registeredApp };
};

describe('SearchConnectorsPlugin (public)', () => {
  describe('setup()', () => {
    it('registers the Content Connectors management app synchronously, before getStartServices resolves', () => {
      const plugin = createPlugin({ ui: { enabled: true } });
      const coreSetup = coreMock.createSetup() as unknown as PluginCoreSetup;
      const { managementSetup } = createSetupDependencies();
      const getStartServices = jest.spyOn(coreSetup, 'getStartServices');

      plugin.setup(coreSetup, {
        management: managementSetup,
      } as unknown as SearchConnectorsPluginSetupDependencies);

      expect(managementSetup.sections.section.data.registerApp).toHaveBeenCalledTimes(1);
      expect(managementSetup.sections.section.data.registerApp).toHaveBeenCalledWith(
        expect.objectContaining({
          id: PLUGIN_ID,
          order: 8,
          keywords: ['content connectors', 'search'],
          mount: expect.any(Function),
        })
      );
      expect(getStartServices).not.toHaveBeenCalled();
    });
  });

  describe('start()', () => {
    it('keeps the management app enabled when config is enabled and a supported solution is registered', () => {
      const { plugin, registeredApp } = setupPlugin({ uiEnabled: true });

      plugin.start(coreMock.createStart(), createStartDependencies([securitySolution]));

      expect(registeredApp.disable).not.toHaveBeenCalled();
    });

    it('keeps the management app enabled when observability solution is registered', () => {
      const { plugin, registeredApp } = setupPlugin({ uiEnabled: true });

      plugin.start(coreMock.createStart(), createStartDependencies([observabilitySolution]));

      expect(registeredApp.disable).not.toHaveBeenCalled();
    });

    it('disables the management app when no security or observability solution is registered', () => {
      const { plugin, registeredApp } = setupPlugin({ uiEnabled: true });

      plugin.start(coreMock.createStart(), createStartDependencies([otherSolution]));

      expect(registeredApp.disable).toHaveBeenCalledTimes(1);
    });

    it('disables the management app when no solutions are registered at all', () => {
      const { plugin, registeredApp } = setupPlugin({ uiEnabled: true });

      plugin.start(coreMock.createStart(), createStartDependencies([]));

      expect(registeredApp.disable).toHaveBeenCalledTimes(1);
    });

    it('disables the management app when config.ui.enabled is false even if a supported solution is registered', () => {
      const { plugin, registeredApp } = setupPlugin({ uiEnabled: false });

      plugin.start(coreMock.createStart(), createStartDependencies([securitySolution]));

      expect(registeredApp.disable).toHaveBeenCalledTimes(1);
    });
  });
});
