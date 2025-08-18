/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import { BehaviorSubject } from 'rxjs';
import { AiAssistantManagementObservabilityPlugin } from './plugin';

describe('Observability AI Assistant Management plugin', () => {
  const rank: Record<string, number> = {
    basic: 10,
    standard: 20,
    gold: 30,
    platinum: 40,
    enterprise: 50,
    trial: 60,
  };
  const makeLicense = (type: keyof typeof rank) => ({
    type,
    hasAtLeast: (minimum: keyof typeof rank) => rank[type] >= rank[minimum],
  });

  const createManagementMock = () => {
    const apps: any[] = [];
    const aiSection = {
      registerApp: (args: any) => {
        const app = {
          id: args.id,
          enabled: true,
          enable() {
            this.enabled = true;
          },
          disable() {
            this.enabled = false;
          },
        };
        apps.push(app);
        return app;
      },
      getApps: () => apps,
    };
    return {
      sections: { section: { ai: aiSection } },
    } as unknown as ManagementSetup;
  };

  const createCoreSetupMock = (): CoreSetup<any, any> =>
    ({
      getStartServices: jest.fn().mockResolvedValue([{} as any, {} as any, {} as any]),
    } as any);

  describe('Licensing', () => {
    it('is disabled by default, enabled only for enterprise, and disabled for platinum', async () => {
      const plugin = new AiAssistantManagementObservabilityPlugin({
        config: {
          get: jest.fn(() => ({
            logSourcesEnabled: true,
            spacesEnabled: true,
            visibilityEnabled: true,
          })),
        },
        env: { packageInfo: { buildFlavor: 'traditional', branch: 'main' } },
      } as unknown as PluginInitializerContext);

      const management = createManagementMock();
      const coreSetup = createCoreSetupMock();

      await plugin.setup(coreSetup, {
        management,
        observabilityAIAssistant: {} as any,
        ml: {} as any,
      });

      const app = (management.sections.section.ai as any).getApps()[0];
      expect(app).toBeDefined();
      expect(app.enabled).toBe(false);

      // Start with platinum
      const license$ = new BehaviorSubject<any>(makeLicense('platinum'));
      plugin.start({} as CoreStart, { licensing: { license$ } } as any);
      expect(app.enabled).toBe(false);

      // Switch to enterprise
      license$.next(makeLicense('enterprise'));
      expect(app.enabled).toBe(true);

      // Switch to gold
      license$.next(makeLicense('gold'));
      expect(app.enabled).toBe(false);

      // Switch to basic
      license$.next(makeLicense('basic'));
      expect(app.enabled).toBe(false);
    });
  });
});
