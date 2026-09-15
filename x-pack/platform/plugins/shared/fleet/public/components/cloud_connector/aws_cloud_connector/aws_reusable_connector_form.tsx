/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { NewPackagePolicy, PackageInfo } from '../../../../common';
import { getEnabledInputsByPolicyTemplate } from '../../../../common/services/policy_template';
import type { AccountType } from '../../../types';
import type { AwsCloudConnectorCredentials, CloudSetupForCloudConnector } from '../types';
import { AWS_PROVIDER } from '../constants';
import { CloudConnectorSelector } from '../form/cloud_connector_selector';
import { IacKeyCheck } from '../components/iac_key_check';

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
  const inputs = newPolicy.inputs;
  // The rendered template must cover every input the user enabled — no more.
  const policyTemplates = useMemo(() => getEnabledInputsByPolicyTemplate({ inputs }), [inputs]);
  const integrations = useMemo(
    () =>
      packageInfo?.name && policyTemplates.length
        ? [{ name: packageInfo.name, policyTemplates }]
        : [],
    [packageInfo?.name, policyTemplates]
  );

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
        integrations={integrations}
        integrationTitle={packageInfo?.title}
        cloud={cloud}
        accountType={accountType}
        iacTemplateUrl={iacTemplateUrl}
        onValidityChange={onValidityChange}
      />
    </>
  );
};
