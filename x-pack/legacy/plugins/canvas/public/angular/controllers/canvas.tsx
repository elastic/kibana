/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { Provider } from 'react-redux';
import { Store } from 'redux';
import { CanvasStartDeps, CoreStart } from '../../plugin';
import { KibanaContextProvider } from '../../../../../../../src/plugins/kibana_react/public';

// @ts-ignore Untyped local
import { App } from '../../components/app';
import { AngularStrings } from '../../../i18n';

const { CanvasRootController: strings } = AngularStrings;

export function CanvasRootControllerFactory(coreStart: CoreStart, plugins: CanvasStartDeps) {
  return function CanvasRootController(
    canvasStore: Store,
    $scope: any, // Untyped in Kibana
    $element: any // Untyped in Kibana
  ) {
    const domNode = $element[0];

    // set the read-only badge when appropriate
    coreStart.chrome.setBadge(
      coreStart.application.capabilities.canvas.save
        ? undefined
        : {
            text: strings.getReadOnlyBadgeText(),
            tooltip: strings.getReadOnlyBadgeTooltip(),
            iconType: 'glasses',
          }
    );

    render(
      <KibanaContextProvider services={{ ...coreStart, ...plugins }}>
        <I18nProvider>
          <Provider store={canvasStore}>
            <App />
          </Provider>
        </I18nProvider>
      </KibanaContextProvider>,
      domNode
    );

    $scope.$on('$destroy', () => {
      unmountComponentAtNode(domNode);
    });
  };
}
