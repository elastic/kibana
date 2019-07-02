/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useRef } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { EuiPageContent, EuiEmptyPrompt } from '@elastic/eui';

import { SectionLoading, SectionError } from './components';
import { BASE_PATH, DEFAULT_SECTION, Section } from './constants';
import { RepositoryAdd, RepositoryEdit, RestoreSnapshot, SnapshotRestoreHome } from './sections';
import { useLoadPermissions } from './services/http';
import { useAppState } from './services/state';
import { useAppDependencies } from './index';

export const App: React.FunctionComponent = () => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();

  // Get app state to set permissions data
  const [, dispatch] = useAppState();

  // Use ref for default permission data so that re-rendering doesn't
  // cause dispatch to be called over and over
  const defaultPermissionsData = useRef({
    hasPermission: true,
    missingClusterPrivileges: [],
    missingIndexPrivileges: [],
  });

  // Load permissions
  const {
    error: permissionsError,
    loading: loadingPermissions,
    data: permissionsData = defaultPermissionsData.current,
  } = useLoadPermissions();

  const { hasPermission, missingClusterPrivileges } = permissionsData;

  // Update app state with permissions data
  useEffect(
    () => {
      dispatch({
        type: 'updatePermissions',
        permissions: permissionsData,
      });
    },
    [permissionsData]
  );

  if (loadingPermissions) {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.app.checkingPermissionsDescription"
          defaultMessage="Checking permissions…"
        />
      </SectionLoading>
    );
  }

  if (permissionsError) {
    return (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.app.checkingPermissionsErrorMessage"
            defaultMessage="Error checking permissions"
          />
        }
        error={permissionsError}
      />
    );
  }

  if (!hasPermission) {
    return (
      <EuiPageContent horizontalPosition="center">
        <EuiEmptyPrompt
          iconType="securityApp"
          title={
            <h2>
              <FormattedMessage
                id="xpack.snapshotRestore.app.deniedPermissionTitle"
                defaultMessage="You're missing cluster privileges"
              />
            </h2>
          }
          body={
            <p>
              <FormattedMessage
                id="xpack.snapshotRestore.app.deniedPermissionDescription"
                defaultMessage="To use Snapshot and Restore, you must have {clusterPrivilegesCount,
                  plural, one {this cluster privilege} other {these cluster privileges}}: {clusterPrivileges}."
                values={{
                  clusterPrivileges: missingClusterPrivileges.join(', '),
                  clusterPrivilegesCount: missingClusterPrivileges.length,
                }}
              />
            </p>
          }
        />
      </EuiPageContent>
    );
  }

  const sections: Section[] = ['repositories', 'snapshots', 'restore_status'];
  const sectionsRegex = sections.join('|');

  return (
    <div data-test-subj="snapshotRestoreApp">
      <Switch>
        <Route exact path={`${BASE_PATH}/add_repository`} component={RepositoryAdd} />
        <Route exact path={`${BASE_PATH}/edit_repository/:name*`} component={RepositoryEdit} />
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
  );
};
