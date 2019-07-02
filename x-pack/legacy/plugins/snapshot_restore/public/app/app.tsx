/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { EuiPageContent } from '@elastic/eui';

import { SectionLoading } from './components';
import { BASE_PATH, DEFAULT_SECTION, Section } from './constants';
import { RepositoryAdd, RepositoryEdit, RestoreSnapshot, SnapshotRestoreHome } from './sections';
import { useAppDependencies } from './index';
import { WithPrivileges, NotAuthorizedSection } from './lib/authorization';

export const App: React.FunctionComponent = () => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();

  const sections: Section[] = ['repositories', 'snapshots', 'restore_status'];
  const sectionsRegex = sections.join('|');

  return (
    <WithPrivileges privileges="cluster">
      {({ isLoading, hasPrivileges, missingPrivileges }) => (
        <Fragment>
          {isLoading ? (
            <SectionLoading>
              <FormattedMessage
                id="xpack.snapshotRestore.app.checkingPermissionsDescription"
                defaultMessage="Checking permissions…"
              />
            </SectionLoading>
          ) : hasPrivileges ? (
            <div data-test-subj="snapshotRestoreApp">
              <Switch>
                <Route exact path={`${BASE_PATH}/add_repository`} component={RepositoryAdd} />
                <Route
                  exact
                  path={`${BASE_PATH}/edit_repository/:name*`}
                  component={RepositoryEdit}
                />
                <Route
                  exact
                  path={`${BASE_PATH}/:section(${sectionsRegex})/:repositoryName?/:snapshotId*`}
                  component={SnapshotRestoreHome}
                />
                <Redirect
                  exact
                  from={`${BASE_PATH}/restore/:repositoryName`}
                  to={`${BASE_PATH}/snapshots`}
                />
                <Route
                  exact
                  path={`${BASE_PATH}/restore/:repositoryName/:snapshotId*`}
                  component={RestoreSnapshot}
                />
                <Redirect from={`${BASE_PATH}`} to={`${BASE_PATH}/${DEFAULT_SECTION}`} />
              </Switch>
            </div>
          ) : (
            <EuiPageContent>
              <NotAuthorizedSection
                sectionName="Snapshot and Restore"
                missingPrivileges={missingPrivileges as string[]}
                privilegeType="cluster"
                FormattedMessage={FormattedMessage}
              />
            </EuiPageContent>
          )}
        </Fragment>
      )}
    </WithPrivileges>
  );
};
