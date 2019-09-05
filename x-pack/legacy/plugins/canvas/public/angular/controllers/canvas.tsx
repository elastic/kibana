/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Provider } from 'react-redux';
import { Store } from 'redux';
import chrome from 'ui/chrome';
import { UICapabilities } from 'ui/capabilities';

// @ts-ignore Untyped local
import { App } from '../../components/app';
import { AngularStrings } from '../../../i18n';

const { CanvasRootController: strings } = AngularStrings;

export function CanvasRootController(
  canvasStore: Store,
  $scope: any, // Untyped in Kibana
  $element: any, // Untyped in Kibana
  uiCapabilities: UICapabilities
) {
  const domNode = $element[0];

  // set the read-only badge when appropriate
  chrome.badge.set(
    uiCapabilities.canvas.save
      ? undefined
      : {
          text: strings.getReadOnlyBadgeText(),
          tooltip: strings.getReadOnlyBadgeTooltip(),
          iconType: 'glasses',
        }
  );

  render(
    <Provider store={canvasStore}>
      <App />
    </Provider>,
    domNode
  );

  $scope.$on('$destroy', () => {
    unmountComponentAtNode(domNode);
  });
}
