/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';

interface EsqlViewsPublicConfig {
  managementUi: {
    enabled: boolean;
  };
}

interface SetupDependencies {
  management: ManagementSetup;
}

export class EsqlViewsPlugin implements Plugin<void, void, SetupDependencies> {
  private readonly isManagementUiEnabled: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    const { managementUi } = initializerContext.config.get<EsqlViewsPublicConfig>();
    this.isManagementUiEnabled = managementUi.enabled;
  }

  public setup(core: CoreSetup, { management }: SetupDependencies): void {
    if (!this.isManagementUiEnabled) {
      return;
    }

    management.sections.section.data.registerApp({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      order: 2.1,
      keywords: ['esql', 'views'],
      async mount(params) {
        const [{ mountManagementSection }, [coreStart]] = await Promise.all([
          import('./application'),
          core.getStartServices(),
        ]);

        return mountManagementSection(coreStart, params);
      },
    });
  }

  public start(): void {}

  public stop(): void {}
}
