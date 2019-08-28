/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Provider } from 'react-redux';

import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import moment from 'moment';
import { CoreStart } from 'src/core/public';
import 'ui/autoload/all';
import 'ui/autoload/styles';
import chrome from 'ui/chrome';
// @ts-ignore
import { uiModules } from 'ui/modules';

import { APP_TITLE } from '../common/constants';
import { App } from './components/app';
import { HelpMenu } from './components/help_menu';
import { store } from './stores';

export function startApp(coreStart: CoreStart) {
  // `getInjected` is not currently available in new platform `coreStart.chrome`
  if (chrome.getInjected('codeUiEnabled')) {
    // TODO the entire Kibana uses moment, we might need to move it to a more common place
    moment.locale(i18n.getLocale());

    const app = uiModules.get('apps/code');
    app.config(($locationProvider: any) => {
      $locationProvider.html5Mode({
        enabled: false,
        requireBase: false,
        rewriteLinks: false,
      });
    });
    app.config((stateManagementConfigProvider: any) => stateManagementConfigProvider.disable());

    function RootController($scope: any, $element: any, $http: any) {
      const domNode = $element[0];

      // render react to DOM
      render(
        <I18nProvider>
          <Provider store={store}>
            <App />
          </Provider>
        </I18nProvider>,
        domNode
      );

      // unmount react on controller destroy
      $scope.$on('$destroy', () => {
        unmountComponentAtNode(domNode);
      });
    }

    // `setRootController` is not available now in `coreStart.chrome`
    chrome.setRootController('code', RootController);
    coreStart.chrome.setBreadcrumbs([
      {
        text: APP_TITLE,
        href: '#/',
      },
    ]);

    coreStart.chrome.setHelpExtension(domNode => {
      render(<HelpMenu />, domNode);
      return () => {
        unmountComponentAtNode(domNode);
      };
    });
  }
}
