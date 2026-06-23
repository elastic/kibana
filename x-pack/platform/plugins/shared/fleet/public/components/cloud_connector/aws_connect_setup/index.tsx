/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { AccountType } from '../../../../common/types';
import type { CloudSetupForCloudConnector } from '../types';

import { AwsAuthTypeSelector } from './aws_auth_type_selector';
import type { AwsAuthType } from './aws_auth_type_selector';
import { AwsStaticKeysForm } from './aws_static_keys_form';
import type { AwsStaticKeyCredentials } from './aws_static_keys_form';
import { AwsTemporaryKeysForm } from './aws_temporary_keys_form';
import type { AwsTemporaryKeyCredentials } from './aws_temporary_keys_form';
import { AwsIdentityFederationSetup } from './aws_identity_federation_setup';

export type { AwsAuthType, AwsStaticKeyCredentials, AwsTemporaryKeyCredentials };

export interface AwsConnectSetupProps {
  hasInvalidRequiredVars?: boolean;
  cloud?: CloudSetupForCloudConnector;
  accountType?: AccountType;
  isEditPage?: boolean;
  initialConnectorId?: string;
  initialStaticKeys?: Partial<AwsStaticKeyCredentials>;
  initialTemporaryKeys?: Partial<AwsTemporaryKeyCredentials>;
  showIdentityFederation?: boolean;
  staticKeysContent?: React.ReactNode;
  onContinue?: () => void;
  isContinueButtonLoading?: boolean;
  continueButtonLabel?: React.ReactNode;
  continueButtonIconType?: string;
  onConnectorIdChange?: (connectorId: string | undefined) => void;
  onStaticKeysChange?: (keys: AwsStaticKeyCredentials | undefined) => void;
  onTemporaryKeysChange?: (keys: AwsTemporaryKeyCredentials | undefined) => void;
}

export const AwsConnectSetup: React.FC<AwsConnectSetupProps> = ({
  hasInvalidRequiredVars = false,
  cloud,
  accountType,
  isEditPage = false,
  initialConnectorId,
  initialStaticKeys,
  initialTemporaryKeys,
  showIdentityFederation = true,
  staticKeysContent,
  onContinue,
  isContinueButtonLoading = false,
  continueButtonLabel,
  continueButtonIconType,
  onConnectorIdChange,
  onStaticKeysChange,
  onTemporaryKeysChange,
}) => {
  const [authType, setAuthType] = useState<AwsAuthType>(
    initialTemporaryKeys
      ? 'temporary_keys'
      : initialStaticKeys
      ? 'static_keys'
      : showIdentityFederation
      ? 'identity_federation'
      : 'static_keys'
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
      <AwsAuthTypeSelector
        selectedAuthType={authType}
        showIdentityFederation={showIdentityFederation}
        onChange={handleAuthTypeChange}
      />
      <EuiSpacer size="l" />
      {authType === 'identity_federation' && (
        <AwsIdentityFederationSetup
          cloud={cloud}
          accountType={accountType}
          hasInvalidRequiredVars={hasInvalidRequiredVars}
          isEditPage={isEditPage}
          initialConnectorId={initialConnectorId}
          onReadyChange={setIsFormReady}
          onConnectorIdChange={onConnectorIdChange}
        />
      )}
      {authType === 'static_keys' && (
        <>
          {staticKeysContent}
          <AwsStaticKeysForm
            hasInvalidRequiredVars={hasInvalidRequiredVars}
            initialValues={initialStaticKeys}
            onReadyChange={setIsFormReady}
            onFieldsChange={onStaticKeysChange}
          />
        </>
      )}
      {authType === 'temporary_keys' && (
        <AwsTemporaryKeysForm
          hasInvalidRequiredVars={hasInvalidRequiredVars}
          initialValues={initialTemporaryKeys}
          onReadyChange={setIsFormReady}
          onFieldsChange={onTemporaryKeysChange}
        />
      )}
      {onContinue && (
        <>
          <EuiSpacer size="l" />
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isDisabled={!isFormReady || isContinueButtonLoading}
                isLoading={isContinueButtonLoading}
                onClick={onContinue}
                iconType={continueButtonIconType}
                data-test-subj="awsConnectSetup-continueButton"
              >
                {continueButtonLabel ?? (
                  <FormattedMessage
                    id="xpack.fleet.awsConnectSetup.continueButton"
                    defaultMessage="Continue"
                  />
                )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};
