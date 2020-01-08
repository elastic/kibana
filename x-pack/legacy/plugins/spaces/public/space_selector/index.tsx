/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
// @ts-ignore
import { uiModules } from 'ui/modules';

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { npStart } from 'ui/new_platform';
import { SpacesPluginStart } from '../../../../../plugins/spaces/public';

const spacesNPStart = (npStart.plugins as any).spaces as SpacesPluginStart;

const module = uiModules.get('spaces_selector', []);
module.controller('spacesSelectorController', ($scope: any) => {
  $scope.$$postDigest(() => {
    const domNode = document.getElementById('spaceSelectorRoot');

    const { SpaceSelector } = spacesNPStart.__legacyCompat;

    render(<SpaceSelector />, domNode);

    // unmount react on controller destroy
    $scope.$on('$destroy', () => {
      if (domNode) {
        unmountComponentAtNode(domNode);
      }
    });
  });
});

chrome.setVisible(false).setRootTemplate(
  `<div ng-controller="spacesSelectorController" id="spaceSelectorRootWrap">
  <div id="spaceSelectorRoot" />
</div>`
);
