/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, FC } from 'react';
import { render } from 'react-dom';
import { Redirect, Route, Switch } from 'react-router-dom';

import { SectionError } from './components';
import { BASE_PATH, DEFAULT_SECTION } from './constants';
import { getAppProviders, useAppDependencies } from './app_dependencies';
import { AuthorizationContext } from './lib/authorization';
import { AppCore, AppPlugins } from './types';

import { CreateTransformSection } from './sections/create_transform';
import { TransformManagementSection } from './sections/transform_management';

export const App: FC = () => {
  const { FormattedMessage } = useAppDependencies().core.i18n;

  const { apiError } = useContext(AuthorizationContext);

  if (apiError) {
    return (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.transform.app.checkingPrivilegesErrorMessage"
            defaultMessage="Error fetching user privileges from the server."
          />
        }
        error={apiError}
      />
    );
  }

  return (
    <div data-test-subj="transformApp">
      <Switch>
        <Route
          path={`${BASE_PATH}/create_transform/:savedObjectId`}
          component={CreateTransformSection}
        />
        <Route
          exact
          path={`${BASE_PATH}/transform_management`}
          component={TransformManagementSection}
        />
        <Redirect from={`${BASE_PATH}`} to={`${BASE_PATH}/${DEFAULT_SECTION}`} />
      </Switch>
    </div>
  );
};

export const renderReact = (elem: Element, core: AppCore, plugins: AppPlugins) => {
  const Providers = getAppProviders({ core, plugins });

  render(
    <Providers>
      <App />
    </Providers>,
    elem
  );
};
