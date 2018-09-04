/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { uiModules } from 'ui/modules';
import chrome from 'ui/chrome';

// This is required so some default styles and required scripts/Angular modules are loaded,
// or the timezone setting is correctly applied.
import 'ui/autoload/all';

// These are all the required uiExports you need to import in case you want to embed visualizations.
import 'uiExports/visTypes';
import 'uiExports/visResponseHandlers';
import 'uiExports/visRequestHandlers';
import 'uiExports/visEditorTypes';
import 'uiExports/visualize';
import 'uiExports/savedObjectTypes';
import 'uiExports/fieldFormats';
import 'uiExports/search';

// ----------- TODO Remove once https://github.com/elastic/kibana/pull/22623 is merged

import moment from 'moment-timezone';

function setDefaultTimezone(tz) {
  moment.tz.setDefault(tz);
}

function setStartDayOfWeek(day) {
  const dow = moment.weekdays().indexOf(day);
  moment.updateLocale(moment.locale(), { week: { dow } });
}

const uiSettings = chrome.getUiSettingsClient();

setDefaultTimezone(uiSettings.get('dateFormat:tz'));
setStartDayOfWeek(uiSettings.get('dateFormat:dow'));

uiSettings.subscribe(({ key, newValue }) => {
  if (key === 'dateFormat:tz') {
    setDefaultTimezone(newValue);
  } else if (key === 'dateFormat:dow') {
    setStartDayOfWeek(newValue);
  }
});

// ----------------- END OF REMOVAL ----------

import { Main } from './components/main';

const app = uiModules.get('apps/firewallDemoPlugin', ['kibana']);

app.config($locationProvider => {
  $locationProvider.html5Mode({
    enabled: false,
    requireBase: false,
    rewriteLinks: false,
  });
});
app.config(stateManagementConfigProvider =>
  stateManagementConfigProvider.disable()
);

function RootController($scope, $element) {
  const domNode = $element[0];

  // render react to DOM
  render(<Main />, domNode);

  // unmount react on controller destroy
  $scope.$on('$destroy', () => {
    unmountComponentAtNode(domNode);
  });
}

chrome.setRootController('firewallDemoPlugin', RootController);
