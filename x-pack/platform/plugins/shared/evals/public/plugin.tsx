/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import { TraceWaterfall } from './components/trace_waterfall';
import type {
  EvalsPublicSetup,
  EvalsPublicStart,
  EvalsSetupDependencies,
  EvalsStartDependencies,
} from './types';

export class EvalsPublicPlugin
  implements
    Plugin<EvalsPublicSetup, EvalsPublicStart, EvalsSetupDependencies, EvalsStartDependencies>
{
  setup(coreSetup: CoreSetup<EvalsStartDependencies>): EvalsPublicSetup {
    coreSetup.application.register({
      id: PLUGIN_ID,
      title: i18n.translate('xpack.evals.appTitle', {
        defaultMessage: PLUGIN_NAME,
      }),
      euiIconType: 'beaker',
      appRoute: '/app/evals',
      category: DEFAULT_APP_CATEGORIES.management,
      visibleIn: ['sideNav', 'globalSearch'],
      mount: async (appMountParameters: AppMountParameters) => {
        const { renderApp } = await import('./application');
        const [coreStart] = await coreSetup.getStartServices();
        return renderApp(coreStart, appMountParameters);
      },
    });

    return {};
  }

  start(_core: CoreStart, _plugins: EvalsStartDependencies): EvalsPublicStart {
    return { TraceWaterfall };
  }

  stop() {}
}
