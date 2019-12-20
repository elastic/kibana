/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CoreSetup,
  CoreStart,
  Plugin as CorePlugin,
  PluginInitializerContext,
} from 'src/core/public';

import { i18n } from '@kbn/i18n';
import { registerBuiltInActionTypes } from './application/components/builtin_action_types';
import { registerBuiltInAlertTypes } from './application/components/builtin_alert_types';
import { hasShowActionsCapability, hasShowAlertsCapability } from './application/lib/capabilities';
import { PLUGIN } from './application/constants/plugin';
import { LegacyDependencies, ActionTypeModel, AlertTypeModel } from './types';
import { TypeRegistry } from './application/type_registry';

export type Setup = void;
export type Start = void;

interface LegacyPlugins {
  __LEGACY: LegacyDependencies;
}

export class Plugin implements CorePlugin<Setup, Start> {
  private actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  private alertTypeRegistry: TypeRegistry<AlertTypeModel>;

  constructor(initializerContext: PluginInitializerContext) {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    this.actionTypeRegistry = actionTypeRegistry;

    const alertTypeRegistry = new TypeRegistry<AlertTypeModel>();
    this.alertTypeRegistry = alertTypeRegistry;
  }

  public setup(
    { application, notifications, http, uiSettings, injectedMetadata }: CoreSetup,
    { __LEGACY }: LegacyPlugins
  ): Setup {
    const canShowActions = hasShowActionsCapability(__LEGACY.capabilities.get());
    const canShowAlerts = hasShowAlertsCapability(__LEGACY.capabilities.get());

    if (!canShowActions && !canShowAlerts) {
      return;
    }
    registerBuiltInActionTypes({
      actionTypeRegistry: this.actionTypeRegistry,
    });

    registerBuiltInAlertTypes({
      alertTypeRegistry: this.alertTypeRegistry,
    });
    application.register({
      id: PLUGIN.ID,
      title: PLUGIN.getI18nName(i18n),
      mount: async (
        {
          core: {
            docLinks,
            chrome,
            // Waiting for types to be updated.
            // @ts-ignore
            savedObjects,
            i18n: { Context: I18nContext },
          },
        },
        { element }
      ) => {
        const { boot } = await import('./application/boot');
        return boot({
          element,
          toastNotifications: notifications.toasts,
          injectedMetadata,
          http,
          uiSettings,
          docLinks,
          chrome,
          savedObjects: savedObjects.client,
          I18nContext,
          legacy: {
            ...__LEGACY,
          },
          actionTypeRegistry: this.actionTypeRegistry,
          alertTypeRegistry: this.alertTypeRegistry,
        });
      },
    });
  }

  public start(core: CoreStart, { __LEGACY }: LegacyPlugins) {
    const { capabilities } = __LEGACY;
    const canShowActions = hasShowActionsCapability(capabilities.get());
    const canShowAlerts = hasShowAlertsCapability(capabilities.get());

    // Don't register routes when user doesn't have access to the application
    if (!canShowActions && !canShowAlerts) {
      return;
    }
  }

  public stop() {}
}
