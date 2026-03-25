/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  AppMountParameters,
} from '@kbn/core/public';
import { ELASTIC_CONSOLE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { ELASTIC_CONSOLE_ENABLED_FLAG } from '../common/feature_flags';

export class ElasticConsolePlugin implements Plugin {
  constructor(_context: PluginInitializerContext) {}

  setup(core: CoreSetup) {
    core.application.register({
      id: 'elasticConsole',
      title: 'Elastic Console',
      visibleIn: [],
      async mount(params: AppMountParameters) {
        const [coreStart] = await core.getStartServices();
        const featureFlagEnabled = coreStart.featureFlags.getBooleanValue(
          ELASTIC_CONSOLE_ENABLED_FLAG,
          false
        );
        const advancedSettingEnabled = coreStart.uiSettings.get<boolean>(
          ELASTIC_CONSOLE_ENABLED_SETTING_ID,
          false
        );
        if (!featureFlagEnabled || !advancedSettingEnabled) {
          const { element } = params;
          element.innerHTML = '<div>Elastic Console is not enabled.</div>';
          return () => {};
        }
        const { renderApp } = await import('./application');
        return renderApp({ coreStart, params });
      },
    });

    return {};
  }

  start(_core: CoreStart) {
    return {};
  }

  stop() {}
}
