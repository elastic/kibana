/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uiRoutes from 'ui/routes';
import chrome from 'ui/chrome';
import 'ui/kbn_top_nav';
import 'ui/autoload/all';
import 'plugins/monitoring/filters';
import 'plugins/monitoring/services/clusters';
import 'plugins/monitoring/services/features';
import 'plugins/monitoring/services/executor';
import 'plugins/monitoring/services/license';
import 'plugins/monitoring/services/title';
import 'plugins/monitoring/services/breadcrumbs';
import 'plugins/monitoring/directives/all';
import 'plugins/monitoring/views/all';

import TestPage from './views/test-page';

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nContext } from 'ui/i18n';
import { Route, RouteComponentProps, Switch, HashRouter } from 'react-router-dom';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageBody,
  EuiPageContent,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
  EuiPage
} from '@elastic/eui';

const uiSettings = chrome.getUiSettingsClient();

// default timepicker default to the last hour
uiSettings.overrideLocalDefault('timepicker:timeDefaults', JSON.stringify({
  from: 'now-1h',
  to: 'now',
  mode: 'quick'
}));

// default autorefresh to active and refreshing every 10 seconds
uiSettings.overrideLocalDefault('timepicker:refreshIntervalDefaults', JSON.stringify({
  pause: false,
  value: 10000
}));

// Enable Angular routing
uiRoutes.enable();

/*
const REACT_APP_ROOT_ID = 'monitoring-app-content';

chrome.setRootTemplate(`<div data-test-subj="pluginContent" id="${REACT_APP_ROOT_ID}">`);

const checkForRoot = () => {
  return new Promise(resolve => {
    const ready = !!document.getElementById(REACT_APP_ROOT_ID);
    if (ready) {
      resolve();
    } else {
      setTimeout(() => resolve(checkForRoot()), 10);
    }
  });
};



export const BASE_PATH = '/monitoring';


const NoData = () => {
  return (<TestPage />);
}

const App = () => {
  return (

    <I18nContext>

      <HashRouter>
        <Switch>
          <Route exact path={`/no-data`} component={NoData} />
        </Switch>
      </HashRouter>

    </I18nContext>

  )
}


checkForRoot().then(() => {
  const element = <h1>Hello, world</h1>;
  ReactDOM.render(<App />, document.getElementById(REACT_APP_ROOT_ID));
});

*/




/*
  <Route exact path={`${BASE_PATH}indices/filter/:filter?`} component={IndexList} />
  <Route exact path={`${BASE_PATH}templates/:templateName*`} component={TemplateList} />
*/



