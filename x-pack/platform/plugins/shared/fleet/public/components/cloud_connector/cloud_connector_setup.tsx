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

import type { NewPackagePolicy, PackageInfo } from '../../../common';
import type { AccountType, CloudProvider } from '../../types';

import { NewCloudConnectorForm } from './form/new_cloud_connector_form';
import { ReusableCloudConnectorForm } from './form/reusable_cloud_connector_form';
import { useGetCloudConnectors } from './hooks/use_get_cloud_connectors';
import { useCloudConnectorSetup } from './hooks/use_cloud_connector_setup';
import { CloudConnectorTabs, type CloudConnectorTab } from './cloud_connector_tabs';
import type { UpdatePolicy } from './types';
import { TABS, CLOUD_FORMATION_EXTERNAL_DOC_URL, SINGLE_ACCOUNT } from './constants';
import { isCloudConnectorReusableEnabled } from './utils';

export interface CloudConnectorSetupProps {
  newPolicy: NewPackagePolicy;
  packageInfo: PackageInfo;
  updatePolicy: UpdatePolicy;
  isEditPage?: boolean;
  hasInvalidRequiredVars: boolean;
  cloud?: CloudSetup;
  cloudProvider?: CloudProvider;
  templateName: string;
  /** Optional account type. When undefined, defaults to 'single-account'. */
  accountType?: AccountType;
  /** Optional IaC template URL from var_group selection. When provided, overrides template URL from packageInfo.policy_templates. */
  iacTemplateUrl?: string;
}

export const CloudConnectorSetup: React.FC<CloudConnectorSetupProps> = ({
  newPolicy,
  packageInfo,
  updatePolicy,
  isEditPage = false,
  hasInvalidRequiredVars,
  cloud,
  cloudProvider,
  templateName,
  accountType = SINGLE_ACCOUNT,
  iacTemplateUrl,
}) => {
  const reusableFeatureEnabled = isCloudConnectorReusableEnabled(
    cloudProvider || '',
    packageInfo.version,
    templateName
  );

  const {
    newConnectionCredentials,
    existingConnectionCredentials,
    updatePolicyWithNewCredentials,
    updatePolicyWithExistingCredentials,
  } = useCloudConnectorSetup(newPolicy, updatePolicy, packageInfo, cloudProvider);

  const { data: cloudConnectors } = useGetCloudConnectors({
    cloudProvider,
    accountType,
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
  // NOTE: This must be in a useEffect, NOT during render, to avoid React errors
  useEffect(() => {
    if (!newPolicy.supports_cloud_connector) {
      updatePolicy({
        updatedPolicy: {
          ...newPolicy,
          supports_cloud_connector: true,
        },
      });
    }
  }, [newPolicy, updatePolicy]);

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
          <div>
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.fleet.cloudConnector.setup.cloudFormation.guide.description"
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
                        id="xpack.fleet.cloudConnector.setup.cloudFormation.guide.learnMoreLink"
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
            newPolicy={newPolicy}
            packageInfo={packageInfo}
            updatePolicy={updatePolicy}
            isEditPage={isEditPage}
            hasInvalidRequiredVars={hasInvalidRequiredVars}
            cloud={cloud}
            cloudProvider={cloudProvider}
            credentials={newConnectionCredentials}
            setCredentials={updatePolicyWithNewCredentials}
            accountType={accountType}
            iacTemplateUrl={iacTemplateUrl}
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
          accountType={accountType}
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
          newPolicy={newPolicy}
          packageInfo={packageInfo}
          updatePolicy={updatePolicy}
          isEditPage={isEditPage}
          hasInvalidRequiredVars={hasInvalidRequiredVars}
          cloud={cloud}
          cloudProvider={cloudProvider}
          credentials={newConnectionCredentials}
          setCredentials={updatePolicyWithNewCredentials}
          accountType={accountType}
          iacTemplateUrl={iacTemplateUrl}
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
