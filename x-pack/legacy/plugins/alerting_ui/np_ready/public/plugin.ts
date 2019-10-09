/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { unmountComponentAtNode } from 'react-dom';
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { i18n } from '@kbn/i18n';
import routes from 'ui/routes';

import template from '../../public/index.html';
import { renderReact } from './application';
import { BASE_PATH } from './application/constants';

export type Setup = void;
export type Start = void;

export class ActionsPlugin implements Plugin<any, any> {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(coreSetup: CoreSetup): Setup {
    // TODO: management doesn't exposed in core yet
    /*
      The code below would be replacing for current:
      uiExports: {
        managementSections: ['myplugin/management'],
      }
    */
    // Registering a new app to a new section
    /* const mySection = coreSetup.management.sections.register({
      id: 'my-section',
      title: 'My Main Section', // display name
      order: 10,
      euiIconType: 'iconName',
      });
      mySection.registerApp({
        id: 'my-management-app',
        title: 'My Management App', // display name
        order: 20,
        async mount(context, params) {
          const { renderApp } = await import('./my-section');
          return renderApp(context, params);
        }
    });

    // Registering a new app to an existing section
    const kibanaSection = management.sections.get('kibana');
    kibanaSection.registerApp({ id: 'my-kibana-management-app', ... });
    */
  }

  public start(coreStart: CoreStart, pluginsStart: any) {
    const {
      management: { getSection },
    } = pluginsStart;

    const esSection = getSection('elasticsearch');
    esSection.register('actions', {
      display: i18n.translate(
        'xpack.alertingUI.sections.actionsList.managementSection.actionsDisplayName',
        {
          defaultMessage: 'Alert Actions',
        }
      ),
      order: 7,
      url: `#${BASE_PATH}/`,
    });

    routes.when('/management/elasticsearch/actions/:param1?/:param2?/:param3?/:param4?', {
      template,
      controller: (() => {
        let elReactRoot: HTMLElement | undefined | null;
        return ($injector: any, $scope: any) => {
          const $route = $injector.get('$route');
          // clean up previously rendered React app if one exists
          // this happens because of React Router redirects
          if (elReactRoot) {
            unmountComponentAtNode(elReactRoot);
          }
          $scope.$$postDigest(() => {
            elReactRoot = document.getElementById('actionsRoot');
            renderReact(elReactRoot, coreStart.http);
            const lastRoute = $route.current;

            const deregister = $scope.$on('$locationChangeSuccess', () => {
              const currentRoute = $route.current;
              if (lastRoute.$$route.template === currentRoute.$$route.template) {
                $route.current = lastRoute;
              }
            });

            $scope.$on('$destroy', () => {
              if (deregister) {
                deregister();
              }
              if (elReactRoot) {
                unmountComponentAtNode(elReactRoot);
              }
            });
          });
        };
      })(),
    });
  }

  public stop() {}
}
