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
import type { CloudProvider } from '../..';

import { NewCloudConnectorForm } from './form/new_cloud_connector_form';
import { ReusableCloudConnectorForm } from './form/reusable_cloud_connector_form';
import { useGetCloudConnectors } from './hooks/use_get_cloud_connectors';
import { useCloudConnectorSetup } from './hooks/use_cloud_connector_setup';
import { CloudConnectorTabs, type CloudConnectorTab } from './cloud_connector_tabs';
import type { UpdatePolicy } from './types';
import { TABS, CLOUD_FORMATION_EXTERNAL_DOC_URL } from './constants';
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
  /** When true, the new connection tab is disabled (for edit pages with existing cloud connector) */
  disableNewConnection?: boolean;
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
  disableNewConnection = false,
}) => {
  const reusableFeatureEnabled = isCloudConnectorReusableEnabled(
    cloudProvider || '',
    packageInfo.version,
    templateName
  );

  const { data: cloudConnectors } = useGetCloudConnectors(cloudProvider);
  const cloudConnectorsCount = cloudConnectors?.length;

  // Determine if there's an existing cloud connector attached to this policy
  const hasExistingCloudConnector = !!newPolicy.cloud_connector_id;

  // Determine initial tab based on:
  // 1. If disableNewConnection is true, always show existing connection
  // 2. If editing with existing cloud connector, show existing connection
  // 3. If there are existing cloud connectors available, show existing connection
  // 4. Otherwise show new connection
  const [selectedTabId, setSelectedTabId] = useState<string>(() => {
    if (disableNewConnection || (isEditPage && hasExistingCloudConnector)) {
      return TABS.EXISTING_CONNECTION;
    }
    return TABS.NEW_CONNECTION;
  });

  useEffect(() => {
    // If disableNewConnection becomes true or we're editing with existing connector,
    // switch to existing connection tab
    if (disableNewConnection || (isEditPage && hasExistingCloudConnector)) {
      setSelectedTabId(TABS.EXISTING_CONNECTION);
      return;
    }

    // Otherwise, default to existing connection if there are connectors available
    setSelectedTabId(
      cloudConnectorsCount && cloudConnectorsCount > 0
        ? TABS.EXISTING_CONNECTION
        : TABS.NEW_CONNECTION
    );
  }, [cloudConnectorsCount, disableNewConnection, isEditPage, hasExistingCloudConnector]);

  // Use the cloud connector setup hook with packageInfo for mode detection
  const {
    newConnectionCredentials,
    existingConnectionCredentials,
    updatePolicyWithNewCredentials,
    updatePolicyWithExistingCredentials,
  } = useCloudConnectorSetup(input, newPolicy, updatePolicy, packageInfo);

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
          id="securitySolutionPackages.cloudSecurityPosture.cloudConnectorSetup.newConnectionTab"
          defaultMessage="New Connection"
        />
      ),
      disabled: disableNewConnection,
      content: (
        <>
          <EuiSpacer size="m" />
          <div>
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="securitySolutionPackages.cloudSecurityPosture.cloudConnectorSetup.cloudFormation.guide.description.cloudConnectors"
                defaultMessage="Create a reusable IAM role in your AWS account, then give Elastic its Role ARN and the External ID shown below. You'll need rights to launch a CloudFormation stack and create/update IAM roles in the target AWS account {learnMore}."
                values={{
                  learnMore: (
                    <EuiLink
                      href={CLOUD_FORMATION_EXTERNAL_DOC_URL}
                      target="_blank"
                      rel="noopener nofollow noreferrer"
                      data-test-subj="externalLink"
                    >
                      <FormattedMessage
                        id="securitySolutionPackages.assetInventory.agentlessForm.cloudFormation.guide.learnMoreLinkText"
                        defaultMessage="Learn more about CloudFormation"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </EuiText>
          </div>
          <EuiSpacer size="l" />
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
          />
        </>
      ),
    },
    {
      id: TABS.EXISTING_CONNECTION,
      name: (
        <FormattedMessage
          id="securitySolutionPackages.cloudSecurityPosture.cloudConnectorSetup.existingConnectionTab"
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
