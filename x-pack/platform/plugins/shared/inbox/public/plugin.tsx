/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppStatus,
  DEFAULT_APP_CATEGORIES,
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type {
  InboxClientConfig,
  InboxPublicSetup,
  InboxPublicStart,
  InboxSetupDependencies,
  InboxStartDependencies,
} from './types';
import { APP_PATH, PLUGIN_ID, PLUGIN_NAME } from '../common';

const APP_TITLE = i18n.translate('xpack.inbox.appTitle', {
  defaultMessage: PLUGIN_NAME,
});

export class InboxPublicPlugin
  implements
    Plugin<InboxPublicSetup, InboxPublicStart, InboxSetupDependencies, InboxStartDependencies>
{
  private readonly config: InboxClientConfig;

  constructor(context: PluginInitializerContext<InboxClientConfig>) {
    this.config = context.config.get();
  }

  public setup(
    coreSetup: CoreSetup<InboxStartDependencies, InboxPublicStart>,
    _setupDeps: InboxSetupDependencies
  ): InboxPublicSetup {
    if (!this.config.enabled) {
      return {};
    }

    coreSetup.application.register({
      id: PLUGIN_ID,
      title: APP_TITLE,
      appRoute: APP_PATH,
      category: DEFAULT_APP_CATEGORIES.security,
      euiIconType: 'email',
      status: AppStatus.accessible,
      visibleIn: ['sideNav', 'globalSearch'],
      order: 100,
      mount: async (params) => {
        const [coreStart, startDeps] = await coreSetup.getStartServices();
        const { renderApp } = await import('./application');
        return renderApp({ coreStart, startDeps, params });
      },
    });

    return {};
  }

  public start(_core: CoreStart, _startDeps: InboxStartDependencies): InboxPublicStart {
    return {};
  }

  public stop() {}
}
