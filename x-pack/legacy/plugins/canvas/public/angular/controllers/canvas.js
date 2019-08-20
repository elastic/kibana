/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Provider } from 'react-redux';
import { i18n } from '@kbn/i18n';
import chrome from 'ui/chrome';
import { App } from '../../components/app';

export function CanvasRootController(canvasStore, $scope, $element, uiCapabilities) {
  const domNode = $element[0];

  // set the read-only badge when appropriate
  chrome.badge.set(
    uiCapabilities.canvas.save
      ? undefined
      : {
          text: i18n.translate('xpack.canvas.badge.readOnly.text', {
            defaultMessage: 'Read only',
          }),
          tooltip: i18n.translate('xpack.canvas.badge.readOnly.tooltip', {
            defaultMessage: 'Unable to save Canvas workpads',
          }),
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
