/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { useQueryClient } from '@kbn/react-query';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { NewPackagePolicy, PackageInfo } from '../../../../common';
import { getEnabledInputsByPolicyTemplate } from '../../../../common/services/policy_template';
import {
  IAC_PROVISIONER_KEY_CHECK_ACTION_EVENT,
  type IacKeyCheckAction,
} from '../../../../common/telemetry/iac_provisioner_events';
import type { AccountType } from '../../../types';
import { useIacProvisioner, useStartServices } from '../../../hooks';
import { useVerifyIacKey } from '../hooks/use_verify_iac_key';
import { updateCloudConnector } from '../hooks/use_update_cloud_connector';
import { useCloudConnectorTemplate } from '../hooks/use_cloud_connector_template';
import type { AwsCloudConnectorCredentials, CloudSetupForCloudConnector } from '../types';
import { AWS_PROVIDER } from '../constants';
import { CloudConnectorSelector } from '../form/cloud_connector_selector';
import { IacKeyCheckCallout } from '../components/iac_key_check_callout';

interface IacKeyCheckProps {
  cloudConnectorId: string | undefined;
  newPolicy: NewPackagePolicy;
  packageInfo?: PackageInfo;
  cloud?: CloudSetupForCloudConnector;
  accountType?: AccountType;
  iacTemplateUrl?: string;
  onValidityChange?: (isValid: boolean) => void;
}

const IacKeyCheck: React.FC<IacKeyCheckProps> = ({
  cloudConnectorId,
  newPolicy,
  packageInfo,
  cloud,
  accountType,
  iacTemplateUrl,
  onValidityChange,
}) => {
  const { isIacProvisionerEnabled } = useIacProvisioner();
  const { analytics, http } = useStartServices();

  const inputs = newPolicy.inputs;
  // The rendered template must cover every input the user enabled — no more.
  const policyTemplates = useMemo(() => getEnabledInputsByPolicyTemplate({ inputs }), [inputs]);
  const integration = useMemo(
    () =>
      packageInfo?.name && policyTemplates.length
        ? { name: packageInfo.name, policyTemplates }
        : undefined,
    [packageInfo?.name, policyTemplates]
  );

  const isCheckEnabled = isIacProvisionerEnabled && Boolean(integration);

  const { data, isFetching, refetch } = useVerifyIacKey({
    cloudConnectorId,
    integration,
    enabled: isCheckEnabled,
  });

  const queryClient = useQueryClient();

  const onTemplateRendered = useCallback(
    ({ key }: { key?: string }) => {
      // Runs on the "Update CloudFormation stack" click, once the render succeeds and before the
      // console opens. Kibana cannot observe the user applying the update in AWS, so the key is
      // stored at click time (https://github.com/elastic/ingest-dev/issues/9415). Raw request:
      // no success toast, the user only asked to open the console.
      if (key && cloudConnectorId) {
        updateCloudConnector(http, cloudConnectorId, { iac_key: key })
          .then(() => {
            queryClient.invalidateQueries(['get-cloud-connectors']);
            queryClient.invalidateQueries(['cloud-connector-usage', cloudConnectorId]);
          })
          .catch(() => {
            // Silent: the daily iac_upgrade_check task self-heals key mismatches.
          });
      }
    },
    [cloudConnectorId, http, queryClient]
  );

  const { launchButtonProps, isGeneratingTemplate } = useCloudConnectorTemplate({
    provider: AWS_PROVIDER,
    cloud,
    accountType: accountType ?? 'single-account',
    iacTemplateUrl,
    integrations: data?.integrations,
    deploymentId: data?.deploymentId,
    onTemplateRendered,
  });

  const isBlocking = data?.matches === false && data.reason === 'key_mismatch';

  useEffect(() => {
    if (isCheckEnabled) {
      onValidityChange?.(!isBlocking);
    }
  }, [isBlocking, isCheckEnabled, onValidityChange]);

  const reportAction = useCallback(
    (action: IacKeyCheckAction) => {
      if (data?.reason) {
        analytics.reportEvent(IAC_PROVISIONER_KEY_CHECK_ACTION_EVENT.eventType, {
          surface: 'wizard',
          action,
          reason: data.reason,
          hasDeploymentId: Boolean(data.deploymentId),
        });
      }
    },
    [analytics, data]
  );

  if (!data || data.matches) {
    return null;
  }

  return (
    <IacKeyCheckCallout
      result={data}
      integrationTitle={packageInfo?.title}
      onUpdateStack={() => {
        reportAction('update_stack_clicked');
        if ('onClick' in launchButtonProps) {
          launchButtonProps.onClick();
        }
      }}
      isUpdating={isGeneratingTemplate}
      onVerify={() => {
        reportAction('verify_clicked');
        refetch();
      }}
      isVerifying={isFetching}
    />
  );
};

export const AWSReusableConnectorForm: React.FC<{
  cloudConnectorId: string | undefined;
  isEditPage: boolean;
  credentials: AwsCloudConnectorCredentials;
  setCredentials: (credentials: AwsCloudConnectorCredentials) => void;
  accountType?: AccountType;
  packageName?: string;
  newPolicy: NewPackagePolicy;
  cloud?: CloudSetupForCloudConnector;
  iacTemplateUrl?: string;
  packageInfo?: PackageInfo;
  onValidityChange?: (isValid: boolean) => void;
}> = ({
  credentials,
  setCredentials,
  isEditPage,
  cloudConnectorId,
  accountType,
  packageName,
  newPolicy,
  cloud,
  iacTemplateUrl,
  packageInfo,
  onValidityChange,
}) => {
  return (
    <>
      <EuiSpacer size="m" />
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.fleet.cloudConnector.aws.reusableConnectorInstructions"
          defaultMessage="To streamline your AWS integration process, you can reuse the same Role ARN for different use cases within Elastic. Simply choose the existing Role ARN from the options below:"
        />
      </EuiText>
      <EuiSpacer size="m" />
      <CloudConnectorSelector
        provider={AWS_PROVIDER}
        cloudConnectorId={cloudConnectorId}
        credentials={credentials}
        setCredentials={setCredentials}
        accountType={accountType}
        packageName={packageName}
      />
      <EuiSpacer size="m" />
      <IacKeyCheck
        cloudConnectorId={credentials.cloudConnectorId}
        newPolicy={newPolicy}
        packageInfo={packageInfo}
        cloud={cloud}
        accountType={accountType}
        iacTemplateUrl={iacTemplateUrl}
        onValidityChange={onValidityChange}
      />
    </>
  );
};
