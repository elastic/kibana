/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Switch, Route, Prompt } from 'react-router-dom';
import type { AppMountParameters, IBasePath, ApplicationStart } from '@kbn/core/public';
import { RedirectAppLinks } from '@kbn/kibana-react-plugin/public';

const HomePage = ({
  basePath,
  application,
}: {
  basePath: IBasePath;
  application: ApplicationStart;
}) => (
  <div data-test-subj="page-home">
    <Prompt message="Unsaved changes, are you sure you wanna leave?" />
    <RedirectAppLinks application={application}>
      <h1>HOME PAGE</h1>
      <br /> <br />
      <a data-test-subj="applink-intra-test" href={basePath.prepend(`/app/core_history_block/foo`)}>
        Link to foo on the same app
      </a>
      <br /> <br />
      <a data-test-subj="applink-external-test" href={basePath.prepend(`/app/home`)}>
        Link to the home app
      </a>
    </RedirectAppLinks>
  </div>
);

const FooPage = ({
  basePath,
  application,
}: {
  basePath: IBasePath;
  application: ApplicationStart;
}) => (
  <div data-test-subj="page-home">
    <RedirectAppLinks application={application}>
      <h1>FOO PAGE</h1>
      <br /> <br />
      <a data-test-subj="applink-intra-test" href={basePath.prepend(`/app/core_history_block`)}>
        Link to home on the same app
      </a>
      <br /> <br />
      <a data-test-subj="applink-nested-test" href={basePath.prepend(`/app/home`)}>
        Link to the home app
      </a>
    </RedirectAppLinks>
  </div>
);

interface AppOptions {
  basePath: IBasePath;
  application: ApplicationStart;
}

export const renderApp = (
  { basePath, application }: AppOptions,
  { element, history }: AppMountParameters
) => {
  ReactDOM.render(
    <Router history={history}>
      <Switch>
        <Route path="/" exact={true}>
          <HomePage basePath={basePath} application={application} />
        </Route>
        <Route path="/foo" exact={true}>
          <FooPage basePath={basePath} application={application} />
        </Route>
      </Switch>
    </Router>,
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
};
