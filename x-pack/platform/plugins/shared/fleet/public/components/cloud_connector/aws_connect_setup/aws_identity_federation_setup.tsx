/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiSkeletonText,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { CloudSetupForCloudConnector } from '../types';

import type { AccountType } from '../../../types';
import { useGetCloudConnectors } from '../hooks/use_get_cloud_connectors';
import { CloudConnectorTabs, type CloudConnectorTab } from '../cloud_connector_tabs';
import { CloudConnectorSelector } from '../form/cloud_connector_selector';
import { CloudConnectorNameField } from '../form/cloud_connector_name_field';
import { CloudFormationCloudCredentialsGuide } from '../aws_cloud_connector/aws_cloud_formation_guide';
import { getCloudConnectorRemoteRoleTemplate, getCloudConnectorNameError } from '../utils';
import { TABS } from '../constants';
import { useCreateCloudConnector } from '../hooks/use_create_cloud_connector';

export interface AwsIdentityFederationSetupProps {
  accountType?: AccountType;
  packageName?: string;
  policyTemplate?: string;
  cloud?: CloudSetupForCloudConnector;
  iacTemplateUrl?: string;
  hasInvalidRequiredVars?: boolean;
  isEditPage?: boolean;
  initialConnectorId?: string;
  onReadyChange?: (isReady: boolean) => void;
  onConnectorIdChange?: (connectorId: string | undefined) => void;
}

export const AwsIdentityFederationSetup: React.FC<AwsIdentityFederationSetupProps> = ({
  accountType = 'single-account',
  packageName,
  policyTemplate,
  cloud,
  iacTemplateUrl,
  hasInvalidRequiredVars = false,
  isEditPage = false,
  initialConnectorId,
  onReadyChange,
  onConnectorIdChange,
}) => {
  const { data: cloudConnectors = [], isLoading: isLoadingConnectors } = useGetCloudConnectors({
    cloudProvider: 'aws',
    accountType,
    packageName,
    policyTemplate,
  });

  const [selectedTabId, setSelectedTabId] = useState<string>(TABS.NEW_CONNECTION);
  const [roleArn, setRoleArn] = useState('');
  const [externalId, setExternalId] = useState('');
  const [connectorName, setConnectorName] = useState('');
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | undefined>(
    initialConnectorId
  );

  const hasSetInitialTab = useRef(false);
  useEffect(() => {
    if (hasSetInitialTab.current) return;
    if (isEditPage) {
      setSelectedTabId(TABS.EXISTING_CONNECTION);
      hasSetInitialTab.current = true;
    } else if (cloudConnectors.length > 0) {
      setSelectedTabId(TABS.EXISTING_CONNECTION);
      hasSetInitialTab.current = true;
    }
  }, [cloudConnectors.length, isEditPage]);

  useEffect(() => {
    onReadyChange?.(!!selectedConnectorId);
    onConnectorIdChange?.(selectedConnectorId);
  }, [selectedConnectorId, onReadyChange, onConnectorIdChange]);

  const cloudFormationUrl = cloud
    ? getCloudConnectorRemoteRoleTemplate({
        cloud,
        accountType: accountType || 'single-account',
        iacTemplateUrl,
      })
    : undefined;

  const { mutate: createConnector, isLoading: isCreating } = useCreateCloudConnector(
    (connector) => {
      setSelectedConnectorId(connector.id);
      setSelectedTabId(TABS.EXISTING_CONNECTION);
      setRoleArn('');
      setExternalId('');
      setConnectorName('');
    }
  );

  const handleCreate = useCallback(() => {
    createConnector({
      name: connectorName,
      cloudProvider: 'aws',
      accountType,
      vars: {
        role_arn: { value: roleArn, type: 'text' },
        external_id: { value: externalId, type: 'password' },
      },
    });
  }, [createConnector, connectorName, accountType, roleArn, externalId]);

  const roleArnInvalid = hasInvalidRequiredVars && !roleArn;
  const externalIdInvalid = hasInvalidRequiredVars && !externalId;
  const isCreateDisabled = !roleArn || !externalId || !!getCloudConnectorNameError(connectorName);

  if (isLoadingConnectors) {
    return <EuiSkeletonText lines={4} data-test-subj="awsIdentityFederationSetup-loading" />;
  }

  const handleTabClick = (tab: { id: string }) => {
    setSelectedTabId(tab.id);
    if (tab.id === TABS.NEW_CONNECTION) {
      setSelectedConnectorId(undefined);
    }
  };

  const tabs: CloudConnectorTab[] = [
    {
      id: TABS.NEW_CONNECTION,
      name: (
        <FormattedMessage
          id="xpack.fleet.awsIdentityFederationSetup.newIdentityTab"
          defaultMessage="New Identity"
        />
      ),
      content: (
        <>
          <EuiSpacer size="m" />
          <CloudConnectorNameField
            value={connectorName}
            onChange={(name) => setConnectorName(name)}
            data-test-subj="awsIdentityFederationSetup-connectorName"
          />
          <EuiSpacer size="m" />
          <EuiAccordion
            id="awsIdentityFederationGuide"
            buttonContent={
              <EuiLink>
                <FormattedMessage
                  id="xpack.fleet.awsIdentityFederationSetup.stepsToAssumeRole"
                  defaultMessage="Steps to assume role"
                />
              </EuiLink>
            }
            paddingSize="l"
          >
            <CloudFormationCloudCredentialsGuide accountType={accountType} />
          </EuiAccordion>
          <EuiSpacer size="l" />
          <EuiButton
            target="_blank"
            iconSide="left"
            iconType="rocket"
            href={cloudFormationUrl}
            isDisabled={!cloudFormationUrl}
            data-test-subj="awsIdentityFederationSetup-launchCloudFormation"
          >
            <FormattedMessage
              id="xpack.fleet.awsIdentityFederationSetup.launchCloudFormation"
              defaultMessage="Launch CloudFormation"
            />
          </EuiButton>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.translate('xpack.fleet.awsIdentityFederationSetup.roleArnLabel', {
              defaultMessage: 'Role ARN',
            })}
            isInvalid={roleArnInvalid}
            error={
              roleArnInvalid
                ? i18n.translate('xpack.fleet.awsIdentityFederationSetup.roleArnRequired', {
                    defaultMessage: 'Role ARN is required',
                  })
                : undefined
            }
            fullWidth
          >
            <EuiFieldText
              fullWidth
              value={roleArn}
              isInvalid={roleArnInvalid}
              onChange={(e) => setRoleArn(e.target.value)}
              data-test-subj="awsIdentityFederationSetup-roleArn"
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.translate('xpack.fleet.awsIdentityFederationSetup.externalIdLabel', {
              defaultMessage: 'External ID',
            })}
            isInvalid={externalIdInvalid}
            error={
              externalIdInvalid
                ? i18n.translate('xpack.fleet.awsIdentityFederationSetup.externalIdRequired', {
                    defaultMessage: 'External ID is required',
                  })
                : undefined
            }
            fullWidth
          >
            <EuiFieldPassword
              fullWidth
              value={externalId}
              isInvalid={externalIdInvalid}
              onChange={(e) => setExternalId(e.target.value)}
              data-test-subj="awsIdentityFederationSetup-externalId"
            />
          </EuiFormRow>
          <EuiSpacer size="l" />
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isLoading={isCreating}
                isDisabled={isCreateDisabled}
                onClick={handleCreate}
                data-test-subj="awsIdentityFederationSetup-createButton"
              >
                <FormattedMessage
                  id="xpack.fleet.awsIdentityFederationSetup.createButton"
                  defaultMessage="Create Identity"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ),
    },
    {
      id: TABS.EXISTING_CONNECTION,
      name: (
        <FormattedMessage
          id="xpack.fleet.awsIdentityFederationSetup.existingIdentityTab"
          defaultMessage="Existing Identity"
        />
      ),
      content: (
        <CloudConnectorSelector
          provider="aws"
          cloudConnectorId={selectedConnectorId}
          credentials={selectedConnectorId ? { cloudConnectorId: selectedConnectorId } : {}}
          setCredentials={(creds) => {
            if (creds.cloudConnectorId) {
              setSelectedConnectorId(creds.cloudConnectorId);
            }
          }}
          accountType={accountType}
          packageName={packageName}
          policyTemplate={policyTemplate}
        />
      ),
    },
  ];

  return (
    <CloudConnectorTabs
      tabs={tabs}
      selectedTabId={selectedTabId}
      onTabClick={handleTabClick}
      isEditPage={isEditPage}
      cloudProvider="aws"
      cloudConnectorsCount={cloudConnectors.length}
    />
  );
};
