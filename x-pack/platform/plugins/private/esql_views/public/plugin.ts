/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { MANAGEMENT_APP_ID, PLUGIN_NAME } from '../common';
import type { EsqlViewsTelemetryClient } from './telemetry';

interface EsqlViewsPublicConfig {
  managementUi: {
    enabled: boolean;
  };
}

interface SetupDependencies {
  management: ManagementSetup;
}

export interface StartDependencies {
  data: DataPublicPluginStart;
  share: SharePluginStart;
}

export class EsqlViewsPlugin implements Plugin<void, void, SetupDependencies, StartDependencies> {
  private readonly isManagementUiEnabled: boolean;
  private telemetryClient?: Promise<EsqlViewsTelemetryClient | undefined>;

  constructor(initializerContext: PluginInitializerContext) {
    const { managementUi } = initializerContext.config.get<EsqlViewsPublicConfig>();
    this.isManagementUiEnabled = managementUi.enabled;
  }

  public setup(core: CoreSetup<StartDependencies>, { management }: SetupDependencies): void {
    if (!this.isManagementUiEnabled) {
      return;
    }

    // Loaded once, on first mount; resolves to no client if the telemetry module fails to load.
    const getTelemetryClient = () =>
      (this.telemetryClient ??= import('./telemetry')
        .then(({ TelemetryService }) => {
          const telemetry = new TelemetryService();
          telemetry.setup(core.analytics);
          return telemetry.start();
        })
        .catch(() => undefined));

    management.sections.section.data.registerApp({
      id: MANAGEMENT_APP_ID,
      title: PLUGIN_NAME,
      order: 2.1,
      keywords: ['esql', 'views'],
      async mount(params) {
        const [{ mountManagementSection }, [coreStart, startDependencies], telemetryClient] =
          await Promise.all([
            import('./application'),
            core.getStartServices(),
            getTelemetryClient(),
          ]);

        return mountManagementSection(coreStart, startDependencies, params, telemetryClient);
      },
    });
  }

  public start(): void {}

  public stop(): void {}
}
