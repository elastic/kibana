/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiSpacer,
  EuiCodeBlock,
  EuiPanel,
  EuiText,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { LicenseStatus, AddLicense } from 'plugins/xpack_main/components';
import { FormattedMessage } from '@kbn/i18n/react';
import chrome from 'plugins/monitoring/np_imports/ui/chrome';

const licenseManagement = `${chrome.getBasePath()}/app/kibana#/management/elasticsearch/license_management`;

const LicenseUpdateInfoForPrimary = ({ isPrimaryCluster, uploadLicensePath }) => {
  if (!isPrimaryCluster) {
    return null;
  }

  // viewed license is for the cluster directly connected to Kibana
  return <AddLicense uploadPath={uploadLicensePath} />;
};

const LicenseUpdateInfoForRemote = ({ isPrimaryCluster }) => {
  if (isPrimaryCluster) {
    return null;
  }

  // viewed license is for a remote monitored cluster not directly connected to Kibana
  return (
    <EuiPanel>
      <p>
        <FormattedMessage
          id="xpack.monitoring.license.howToUpdateLicenseDescription"
          defaultMessage="To update the license for this cluster, provide the license file through
          the Elasticsearch {apiText}:"
          values={{
            apiText: 'API',
          }}
        />
      </p>
      <EuiSpacer />
      <EuiCodeBlock>
        {`curl -XPUT -u <user> 'https://<host>:<port>/_license' -H 'Content-Type: application/json' -d @license.json`}
      </EuiCodeBlock>
    </EuiPanel>
  );
};

export function License(props) {
  const { status, type, isExpired, expiryDate } = props;
  return (
    <EuiPage>
      <EuiScreenReaderOnly>
        <h1>
          <FormattedMessage id="xpack.monitoring.license.heading" defaultMessage="License" />
        </h1>
      </EuiScreenReaderOnly>
      <EuiPageBody>
        <LicenseStatus isExpired={isExpired} status={status} type={type} expiryDate={expiryDate} />
        <EuiSpacer />

        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <LicenseUpdateInfoForPrimary {...props} />
            <LicenseUpdateInfoForRemote {...props} />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer />
        <EuiText size="s" textAlign="center">
          <p>
            For more license options please visit&nbsp;
            <EuiLink href={licenseManagement}>License Management</EuiLink>.
          </p>
        </EuiText>
      </EuiPageBody>
    </EuiPage>
  );
}
