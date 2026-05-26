/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CloudSetup } from '@kbn/cloud-plugin/public';

import type { AccountType } from '../../../../common/types';

import { AwsAuthTypeSelector } from './aws_auth_type_selector';
import type { AwsAuthType } from './aws_auth_type_selector';
import { AwsStaticKeysForm } from './aws_static_keys_form';
import type { AwsStaticKeyCredentials } from './aws_static_keys_form';
import { AwsIdentityFederationSetup } from './aws_identity_federation_setup';

export type { AwsAuthType, AwsStaticKeyCredentials };

export interface AwsConnectSetupProps {
  hasInvalidRequiredVars?: boolean;
  cloud?: CloudSetup;
  accountType?: AccountType;
  isEditPage?: boolean;
  initialConnectorId?: string;
  initialStaticKeys?: Partial<AwsStaticKeyCredentials>;
  onNext?: () => void;
  onConnectorIdChange?: (connectorId: string | undefined) => void;
  onStaticKeysChange?: (keys: AwsStaticKeyCredentials | undefined) => void;
}

// TODO should come from the package?
// https://github.com/elastic/integrations/blob/651caee873002cbf73c9972ac5a81162c4b8fc80/packages/cloud_security_posture/manifest.yml#L160C22-L160C250
const IAC_TEMPLATE_URL =
  'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https://elastic-cspm-cft.s3.eu-central-1.amazonaws.com/cloudformation-cloud-connectors-ACCOUNT_TYPE-9.2.0.yml&param_ElasticResourceId=RESOURCE_ID';

export const AwsConnectSetup: React.FC<AwsConnectSetupProps> = ({
  hasInvalidRequiredVars = false,
  cloud,
  accountType,
  isEditPage = false,
  initialConnectorId,
  initialStaticKeys,
  onNext,
  onConnectorIdChange,
  onStaticKeysChange,
}) => {
  const [authType, setAuthType] = useState<AwsAuthType>(
    !!initialStaticKeys ? 'static_keys' : 'identity_federation'
  );
  const [isFormReady, setIsFormReady] = useState(false);

  const handleAuthTypeChange = useCallback((next: AwsAuthType) => {
    setAuthType(next);
    setIsFormReady(false);
  }, []);

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.fleet.awsConnectSetup.authMethodTitle"
            defaultMessage="Authentication method"
          />
        </h3>
      </EuiTitle>
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.fleet.awsConnectSetup.authMethodDescription"
            defaultMessage="Choose how Elastic authenticates to your AWS account."
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <AwsAuthTypeSelector selectedAuthType={authType} onChange={handleAuthTypeChange} />
      <EuiSpacer size="l" />
      {authType === 'identity_federation' && (
        <AwsIdentityFederationSetup
          cloud={cloud}
          accountType={accountType}
          hasInvalidRequiredVars={hasInvalidRequiredVars}
          isEditPage={isEditPage}
          iacTemplateUrl={IAC_TEMPLATE_URL}
          initialConnectorId={initialConnectorId}
          onReadyChange={setIsFormReady}
          onConnectorIdChange={onConnectorIdChange}
        />
      )}
      {authType === 'static_keys' && (
        <AwsStaticKeysForm
          hasInvalidRequiredVars={hasInvalidRequiredVars}
          initialValues={initialStaticKeys}
          onReadyChange={setIsFormReady}
          onFieldsChange={onStaticKeysChange}
        />
      )}
      {onNext && (
        <>
          <EuiSpacer size="l" />
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isDisabled={!isFormReady}
                onClick={onNext}
                data-test-subj="awsConnectSetup-nextButton"
              >
                <FormattedMessage
                  id="xpack.fleet.awsConnectSetup.nextButton"
                  defaultMessage="Next"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};
