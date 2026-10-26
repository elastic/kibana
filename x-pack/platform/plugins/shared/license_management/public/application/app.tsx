/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { Routes, Route } from '@kbn/shared-ux-router';
import { EuiPageSection, EuiPageBody, EuiEmptyPrompt } from '@elastic/eui';
import type { ExecutionContextStart } from '@kbn/core/public';
import { LicenseDashboard, UploadLicense } from './sections';
import { APP_PERMISSION } from '../../common/constants';
import { SectionLoading, useExecutionContext } from '../shared_imports';
import { UPLOAD_LICENSE_ROUTE } from '../locator';
import type { TelemetryPluginStart } from './lib/telemetry';

export interface Props {
  hasPermission: boolean | undefined;
  permissionsLoading: boolean | undefined;
  permissionsError: unknown;
  telemetry?: TelemetryPluginStart;
  loadPermissions: () => void;
  executionContext: ExecutionContextStart;
}

export const App: FC<Props> = ({
  hasPermission,
  permissionsLoading,
  permissionsError,
  telemetry,
  loadPermissions,
  executionContext,
}) => {
  useExecutionContext(executionContext, {
    type: 'application',
    page: 'licenseManagement',
  });

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  if (permissionsLoading) {
    return (
      <EuiPageSection alignment="center" grow={true}>
        <SectionLoading>
          <FormattedMessage
            id="xpack.licenseMgmt.app.loadingPermissionsDescription"
            defaultMessage="Checking permissions…"
          />
        </SectionLoading>
      </EuiPageSection>
    );
  }

  if (permissionsError) {
    let error: string | undefined;
    if (
      typeof permissionsError === 'object' &&
      permissionsError !== null &&
      'data' in permissionsError
    ) {
      const { data } = permissionsError;
      if (typeof data === 'object' && data !== null && 'message' in data) {
        const { message } = data;
        error = typeof message === 'string' ? message : undefined;
      }
    }

    return (
      <EuiPageSection alignment="center" grow={true}>
        <EuiEmptyPrompt
          color="danger"
          iconType="warning"
          title={
            <h1>
              <FormattedMessage
                id="xpack.licenseMgmt.app.checkingPermissionsErrorMessage"
                defaultMessage="Error checking permissions"
              />
            </h1>
          }
          body={error ? <p>{error}</p> : null}
        />
      </EuiPageSection>
    );
  }

  if (!hasPermission) {
    return (
      <EuiPageSection alignment="center" grow={true}>
        <EuiEmptyPrompt
          color="subdued"
          iconType="securityApp"
          title={
            <h1>
              <FormattedMessage
                id="xpack.licenseMgmt.app.deniedPermissionTitle"
                defaultMessage="Cluster privileges required"
              />
            </h1>
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
      </EuiPageSection>
    );
  }

  return (
    <EuiPageBody>
      <Routes>
        <Route
          path={`/${UPLOAD_LICENSE_ROUTE}`}
          render={({ history }) => <UploadLicense history={history} telemetry={telemetry} />}
        />
        <Route path={['/']} render={() => <LicenseDashboard telemetry={telemetry} />} />
      </Routes>
    </EuiPageBody>
  );
};
