/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { EuiSpacer, EuiText, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CloudSetup } from '@kbn/cloud-plugin/public';

import type { NewPackagePolicy, NewPackagePolicyInput, PackageInfo } from '../../../common';
import type { CloudProvider } from '../../types';

import { NewCloudConnectorForm } from './form/new_cloud_connector_form';
import { ReusableCloudConnectorForm } from './form/reusable_cloud_connector_form';
import { useGetCloudConnectors } from './hooks/use_get_cloud_connectors';
import { useCloudConnectorSetup } from './hooks/use_cloud_connector_setup';
import { CloudConnectorTabs, type CloudConnectorTab } from './cloud_connector_tabs';
import type { UpdatePolicy } from './types';
import { TABS } from './constants';
import { isCloudConnectorReusableEnabled } from './utils';
export interface CloudConnectorSetupProps {
  input: NewPackagePolicyInput;
  newPolicy: NewPackagePolicy;
  packageInfo: PackageInfo;
  updatePolicy: UpdatePolicy;
  isEditPage?: boolean;
  hasInvalidRequiredVars: boolean;
  cloud?: CloudSetup;
  cloudProvider?: CloudProvider;
  templateName: string;
}

export const CloudConnectorSetup: React.FC<CloudConnectorSetupProps> = ({
  input,
  newPolicy,
  packageInfo,
  updatePolicy,
  isEditPage = false,
  hasInvalidRequiredVars,
  cloud,
  cloudProvider,
  templateName,
}) => {
  const reusableFeatureEnabled = isCloudConnectorReusableEnabled(
    cloudProvider || '',
    packageInfo.version,
    templateName
  );

  // Use the cloud connector setup hook
  const {
    newConnectionCredentials,
    existingConnectionCredentials,
    updatePolicyWithNewCredentials,
    updatePolicyWithExistingCredentials,
    accountTypeFromInputs,
  } = useCloudConnectorSetup(newPolicy, updatePolicy, packageInfo, cloudProvider);

  // Get filtered cloud connectors based on provider and account type
  const { data: cloudConnectors } = useGetCloudConnectors({
    cloudProvider,
    accountType: accountTypeFromInputs,
  });
  const cloudConnectorsCount = cloudConnectors?.length;
  const [selectedTabId, setSelectedTabId] = useState<string>(TABS.NEW_CONNECTION);

  useEffect(() => {
    setSelectedTabId(
      cloudConnectorsCount && cloudConnectorsCount > 0
        ? TABS.EXISTING_CONNECTION
        : TABS.NEW_CONNECTION
    );
  }, [cloudConnectorsCount]);

  // Ensure root-level supports_cloud_connector is true when this component is rendered
  if (!newPolicy.supports_cloud_connector) {
    updatePolicy({
      updatedPolicy: {
        ...newPolicy,
        supports_cloud_connector: true,
      },
    });
  }

  const tabs: CloudConnectorTab[] = [
    {
      id: TABS.NEW_CONNECTION,
      name: (
        <FormattedMessage
          id="xpack.fleet.cloudConnector.setup.newConnectionTab"
          defaultMessage="New Connection"
        />
      ),
      content: (
        <>
          <EuiSpacer size="m" />
          {cloudProvider === 'gcp' && (
            <>
              <div>
                <EuiText size="s" color="subdued">
                  <FormattedMessage
                    id="xpack.fleet.cloudConnector.setup.gcp.guide.description"
                    defaultMessage="Create a reusable service account in your GCP project, then give Elastic its Service Account Email and Audience shown below. You'll need permissions to create service accounts and configure workload identity federation in your GCP project. {learnMore}"
                    values={{
                      learnMore: (
                        <EuiLink
                          href="https://cloud.google.com/iam/docs/workload-identity-federation"
                          target="_blank"
                          external
                        >
                          <FormattedMessage
                            id="xpack.fleet.cloudConnector.setup.gcp.guide.learnMoreLink"
                            defaultMessage="Learn more about Workload Identity Federation"
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                </EuiText>
              </div>
              <EuiSpacer size="l" />
            </>
          )}
          <NewCloudConnectorForm
            input={input}
            templateName={templateName}
            newPolicy={newPolicy}
            packageInfo={packageInfo}
            updatePolicy={updatePolicy}
            isEditPage={isEditPage}
            hasInvalidRequiredVars={hasInvalidRequiredVars}
            cloud={cloud}
            cloudProvider={cloudProvider}
            credentials={newConnectionCredentials}
            setCredentials={updatePolicyWithNewCredentials}
            accountType={accountTypeFromInputs}
          />
        </>
      ),
    },
    {
      id: TABS.EXISTING_CONNECTION,
      name: (
        <FormattedMessage
          id="xpack.fleet.cloudConnector.setup.existingConnectionTab"
          defaultMessage="Existing Connection"
        />
      ),
      content: (
        <ReusableCloudConnectorForm
          isEditPage={isEditPage}
          newPolicy={newPolicy}
          cloudProvider={cloudProvider}
          credentials={existingConnectionCredentials}
          setCredentials={updatePolicyWithExistingCredentials}
          accountType={accountTypeFromInputs}
        />
      ),
    },
  ];

  const onTabClick = useCallback(
    (tab: { id: 'new-connection' | 'existing-connection' }) => {
      setSelectedTabId(tab.id);

      // Always update policy when switching tabs to ensure validation is correct
      if (tab.id === TABS.NEW_CONNECTION) {
        updatePolicyWithNewCredentials(newConnectionCredentials);
      } else if (tab.id === TABS.EXISTING_CONNECTION) {
        updatePolicyWithExistingCredentials(existingConnectionCredentials);
      }
    },
    [
      newConnectionCredentials,
      existingConnectionCredentials,
      updatePolicyWithNewCredentials,
      updatePolicyWithExistingCredentials,
    ]
  );

  return (
    <>
      {!reusableFeatureEnabled && (
        <NewCloudConnectorForm
          input={input}
          templateName={templateName}
          newPolicy={newPolicy}
          packageInfo={packageInfo}
          updatePolicy={updatePolicy}
          isEditPage={isEditPage}
          hasInvalidRequiredVars={hasInvalidRequiredVars}
          cloud={cloud}
          cloudProvider={cloudProvider}
          credentials={newConnectionCredentials}
          setCredentials={updatePolicyWithNewCredentials}
          accountType={accountTypeFromInputs}
        />
      )}
      {reusableFeatureEnabled && (
        <CloudConnectorTabs
          tabs={tabs}
          selectedTabId={selectedTabId}
          onTabClick={onTabClick}
          isEditPage={isEditPage}
          cloudProvider={cloudProvider}
          cloudConnectorsCount={cloudConnectorsCount || 0}
        />
      )}
    </>
  );
};
