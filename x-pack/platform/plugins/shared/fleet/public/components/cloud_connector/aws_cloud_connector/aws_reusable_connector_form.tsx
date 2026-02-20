/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiText } from '@elastic/eui';

import type { AccountType } from '../../../types';
import type { AwsCloudConnectorCredentials } from '../types';
import { AWS_PROVIDER } from '../constants';
import { CloudConnectorSelector } from '../form/cloud_connector_selector';

export const AWSReusableConnectorForm: React.FC<{
  cloudConnectorId: string | undefined;
  isEditPage: boolean;
  credentials: AwsCloudConnectorCredentials;
  setCredentials: (credentials: AwsCloudConnectorCredentials) => void;
  accountType?: AccountType;
}> = ({ credentials, setCredentials, isEditPage, cloudConnectorId, accountType }) => {
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
      />
      <EuiSpacer size="m" />
    </>
  );
};
