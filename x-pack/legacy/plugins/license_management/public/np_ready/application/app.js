/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { LicenseDashboard, UploadLicense } from './sections';
import { Switch, Route } from 'react-router-dom';
import { APP_PERMISSION } from '../../../common/constants';
import { EuiPageBody, EuiEmptyPrompt, EuiText, EuiLoadingSpinner, EuiCallOut } from '@elastic/eui';

export class App extends Component {
  componentDidMount() {
    const { loadPermissions } = this.props;
    loadPermissions();
  }

  render() {
    const { hasPermission, permissionsLoading, permissionsError } = this.props;

    if (permissionsLoading) {
      return (
        <EuiEmptyPrompt
          title={<EuiLoadingSpinner size="xl" />}
          body={
            <EuiText color="subdued">
              <FormattedMessage
                id="xpack.licenseMgmt.app.loadingPermissionsDescription"
                defaultMessage="Checking permissions…"
              />
            </EuiText>
          }
          data-test-subj="sectionLoading"
        />
      );
    }

    if (permissionsError) {
      return (
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.licenseMgmt.app.checkingPermissionsErrorMessage"
              defaultMessage="Error checking permissions"
            />
          }
          color="danger"
          iconType="alert"
        >
          {permissionsError.data && permissionsError.data.message ? (
            <div>{permissionsError.data.message}</div>
          ) : null}
        </EuiCallOut>
      );
    }

    if (!hasPermission) {
      return (
        <EuiPageBody>
          <EuiEmptyPrompt
            iconType="securityApp"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.licenseMgmt.app.deniedPermissionTitle"
                  defaultMessage="You're missing cluster privileges"
                />
              </h2>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.licenseMgmt.app.deniedPermissionDescription"
                  defaultMessage="To use License Management, you must have {permissionType} privileges."
                  values={{
                    permissionType: <strong>{APP_PERMISSION}</strong>,
                  }}
                />
              </p>
            }
          />
        </EuiPageBody>
      );
    }

    return (
      <EuiPageBody>
        <Switch>
          <Route path={`/upload_license`} component={UploadLicense} />

          {/* Match all */}
          <Route component={LicenseDashboard} />
        </Switch>
      </EuiPageBody>
    );
  }
}
