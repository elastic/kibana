/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ComponentType } from 'react';
import { i18n } from '@kbn/i18n';

/* LEGACY IMPORTS */
import { npSetup } from 'ui/new_platform';
import { wrapInI18nContext } from 'ui/i18n';
import { management } from 'ui/management';
// @ts-ignore
import { uiModules } from 'ui/modules';
import routes from 'ui/routes';
import chrome from 'ui/chrome';
/* LEGACY IMPORTS */

import { NEXT_MAJOR_VERSION } from '../common/version';
import { plugin } from './np_ready';
import { CloudSetup } from '../../../../plugins/cloud/public';

const BASE_PATH = `/management/elasticsearch/upgrade_assistant`;

export interface LegacyAppMountParameters {
  __LEGACY: { renderToElement: (RootComponent: ComponentType<any>) => void };
}

export interface LegacyApp {
  mount(ctx: any, params: LegacyAppMountParameters): void;
}

export interface LegacyManagementPlugin {
  sections: {
    get(
      name: string
    ): {
      registerApp(app: LegacyApp): void;
    };
  };
}

// Based on /rfcs/text/0006_management_section_service.md
export interface LegacyPlugins {
  cloud?: CloudSetup;
  management: LegacyManagementPlugin;
  __LEGACY: {
    XSRF: string;
  };
}

function startApp() {
  routes.when(`${BASE_PATH}/:view?`, {
    template:
      '<kbn-management-app section="elasticsearch/upgrade_assistant"><upgrade-assistant /></kbn-management-app>',
  });
  const { cloud } = npSetup.plugins as any;
  const legacyPluginsShim: LegacyPlugins = {
    cloud: cloud as CloudSetup,
    __LEGACY: {
      XSRF: chrome.getXsrfToken(),
    },
    management: {
      sections: {
        get(_: string) {
          return {
            registerApp(app) {
              management.getSection('elasticsearch').register('upgrade_assistant', {
                visible: true,
                display: i18n.translate('xpack.upgradeAssistant.appTitle', {
                  defaultMessage: '{version} Upgrade Assistant',
                  values: { version: `${NEXT_MAJOR_VERSION}.0` },
                }),
                order: 100,
                url: `#${BASE_PATH}`,
              });

              app.mount(
                {},
                {
                  __LEGACY: {
                    // While there is not an NP API for registering management section apps yet
                    renderToElement: RootComponent => {
                      uiModules
                        .get('kibana')
                        .directive('upgradeAssistant', (reactDirective: any) => {
                          return reactDirective(wrapInI18nContext(RootComponent));
                        });
                    },
                  },
                }
              );
            },
          };
        },
      },
    },
  };

  const pluginInstance = plugin();

  pluginInstance.setup(npSetup.core, legacyPluginsShim);
}

startApp();
