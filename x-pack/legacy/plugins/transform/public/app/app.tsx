/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { EuiPageContent } from '@elastic/eui';

import { APP_REQUIRED_CLUSTER_PRIVILEGES } from '../../common/constants';
import { SectionLoading, SectionError } from './components';
import { BASE_PATH, DEFAULT_SECTION } from './constants';
import { useAppDependencies } from './index';
import { AuthorizationContext, WithPrivileges, NotAuthorizedSection } from './lib/authorization';

import { Page as TransformManagement } from './sections/transform_management/page';

export const App: React.FunctionComponent = () => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();
  const { apiError } = useContext(AuthorizationContext);

  return apiError ? (
    <SectionError
      title={
        <FormattedMessage
          id="xpack.transform.app.checkingPrivilegesErrorMessage"
          defaultMessage="Error fetching user privileges from the server."
        />
      }
      error={apiError}
    />
  ) : (
    <WithPrivileges privileges={APP_REQUIRED_CLUSTER_PRIVILEGES.map(name => `cluster.${name}`)}>
      {({ isLoading, hasPrivileges, privilegesMissing }) =>
        isLoading ? (
          <SectionLoading>
            <FormattedMessage
              id="xpack.transform.app.checkingPrivilegesDescription"
              defaultMessage="Checking privileges…"
            />
          </SectionLoading>
        ) : hasPrivileges ? (
          <div data-test-subj="transformApp">
            <Switch>
              <Route
                exact
                path={`${BASE_PATH}/transform_management`}
                component={() => <TransformManagement />}
              />
              <Redirect from={`${BASE_PATH}`} to={`${BASE_PATH}/${DEFAULT_SECTION}`} />
            </Switch>
          </div>
        ) : (
          <EuiPageContent>
            <NotAuthorizedSection
              title={
                <FormattedMessage
                  id="xpack.transform.app.deniedPrivilegeTitle"
                  defaultMessage="You're missing cluster privileges"
                />
              }
              message={
                <FormattedMessage
                  id="xpack.transform.app.deniedPrivilegeDescription"
                  defaultMessage="To use Transform, you must have {privilegesCount,
                    plural, one {this cluster privilege} other {these cluster privileges}}: {missingPrivileges}."
                  values={{
                    missingPrivileges: privilegesMissing.cluster!.join(', '),
                    privilegesCount: privilegesMissing.cluster!.length,
                  }}
                />
              }
            />
          </EuiPageContent>
        )
      }
    </WithPrivileges>
  );
};
