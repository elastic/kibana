/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export * from './types';

import 'ui/autoload/all';
// Used for kuery autocomplete
import 'uiExports/autocompleteProviders';
// Used to run esaggs queries
import 'uiExports/fieldFormats';
import 'uiExports/search';
import 'uiExports/visRequestHandlers';
import 'uiExports/visResponseHandlers';
// Used for kibana_context function
import 'uiExports/savedObjectTypes';

import { render, unmountComponentAtNode } from 'react-dom';
import { IScope } from 'angular';
import chrome from 'ui/chrome';
import { appStart, appSetup, appStop } from './app_plugin';
import { PLUGIN_ID } from '../common';

// TODO: Convert this to the "new platform" way of doing UI
function Root($scope: IScope, $element: JQLite) {
  const el = $element[0];
  $scope.$on('$destroy', () => {
    unmountComponentAtNode(el);
    appStop();
  });

  appSetup();
  return render(appStart(), el);
}

chrome.setRootController(PLUGIN_ID, Root);
