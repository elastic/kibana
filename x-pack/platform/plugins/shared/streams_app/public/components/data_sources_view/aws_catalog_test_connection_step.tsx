/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AwsCatalogInstalledIntegrationsTable } from './aws_catalog_installed_integrations_table';
import type { AwsService } from './aws_services_data';

export interface AwsCatalogTestConnectionValues {
  readonly agentlessRoleArn: string;
  readonly edotRoleArn: string;
  readonly externalId: string;
}

export interface AwsCatalogTestConnectionStepProps {
  readonly catalog: readonly AwsService[];
  readonly selectedServiceIds: ReadonlySet<string>;
  readonly isTestingConnection: boolean;
  readonly testConnectionSucceeded: boolean;
  readonly onCanTestConnectionChange: (canTest: boolean) => void;
  readonly onTestConnection: () => void;
  readonly onSeeData: () => void;
  readonly onValuesChange?: (values: AwsCatalogTestConnectionValues) => void;
}

export const AwsCatalogTestConnectionStep: React.FC<AwsCatalogTestConnectionStepProps> = ({
  catalog,
  selectedServiceIds,
  isTestingConnection,
  testConnectionSucceeded,
  onCanTestConnectionChange,
  onTestConnection,
  onSeeData,
  onValuesChange,
}) => {
  const [agentlessRoleArn, setAgentlessRoleArn] = useState('');
  const [edotRoleArn, setEdotRoleArn] = useState('');
  const [pastedExternalId, setPastedExternalId] = useState('');

  const values = useMemo(
    (): AwsCatalogTestConnectionValues => ({
      agentlessRoleArn,
      edotRoleArn,
      externalId: pastedExternalId,
    }),
    [agentlessRoleArn, edotRoleArn, pastedExternalId]
  );

  const canTestConnection =
    Boolean(agentlessRoleArn.trim()) &&
    Boolean(edotRoleArn.trim()) &&
    Boolean(pastedExternalId.trim());

  useEffect(() => {
    onCanTestConnectionChange(canTestConnection);
  }, [canTestConnection, onCanTestConnectionChange]);

  useEffect(() => {
    return () => {
      onCanTestConnectionChange(false);
    };
  }, [onCanTestConnectionChange]);

  useEffect(() => {
    onValuesChange?.(values);
  }, [onValuesChange, values]);

  const outputsIntro = i18n.translate('xpack.streams.dataSources.awsTestConnection.outputsIntro', {
    defaultMessage:
      'After the stack finishes, paste the values from the CloudFormation Outputs tab.',
  });

  const agentlessRoleArnLabel = i18n.translate(
    'xpack.streams.dataSources.awsDelivery.agentlessRoleArnLabel',
    {
      defaultMessage: 'AgentlessRoleArn',
    }
  );

  const edotRoleArnLabel = i18n.translate('xpack.streams.dataSources.awsDelivery.edotRoleArnLabel', {
    defaultMessage: 'EdotRoleArn',
  });

  const externalIdLabel = i18n.translate('xpack.streams.dataSources.awsDelivery.externalIdLabel', {
    defaultMessage: 'External ID',
  });

  const pasteFromOutputsPlaceholder = i18n.translate(
    'xpack.streams.dataSources.awsDelivery.pasteFromOutputsPlaceholder',
    {
      defaultMessage: 'Paste from AWS outputs',
    }
  );

  return (
    <div data-test-subj="streamsAwsCatalogTestConnectionStep">
      <EuiText size="s" color="subdued">
        <p style={{ margin: 0 }}>{outputsIntro}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiForm component="div" fullWidth>
        <EuiFormRow fullWidth label={agentlessRoleArnLabel}>
          <EuiFieldText
            fullWidth
            value={agentlessRoleArn}
            placeholder={pasteFromOutputsPlaceholder}
            onChange={(event) => setAgentlessRoleArn(event.target.value)}
            data-test-subj="streamsAwsCatalogTestConnectionAgentlessRoleArn"
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFormRow fullWidth label={edotRoleArnLabel}>
          <EuiFieldText
            fullWidth
            value={edotRoleArn}
            placeholder={pasteFromOutputsPlaceholder}
            onChange={(event) => setEdotRoleArn(event.target.value)}
            data-test-subj="streamsAwsCatalogTestConnectionEdotRoleArn"
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFormRow fullWidth label={externalIdLabel}>
          <EuiFieldText
            fullWidth
            value={pastedExternalId}
            placeholder={pasteFromOutputsPlaceholder}
            onChange={(event) => setPastedExternalId(event.target.value)}
            data-test-subj="streamsAwsCatalogTestConnectionExternalId"
          />
        </EuiFormRow>
      </EuiForm>
      <EuiSpacer size="m" />
      <EuiButton
        fill
        color="primary"
        size="m"
        disabled={!canTestConnection || isTestingConnection || testConnectionSucceeded}
        isLoading={isTestingConnection}
        onClick={onTestConnection}
        data-test-subj="streamsAwsCatalogTestConnectionButton"
      >
        {i18n.translate('xpack.streams.dataSources.awsTestConnection.testConnectionButton', {
          defaultMessage: 'Test connection',
        })}
      </EuiButton>
      {testConnectionSucceeded ? (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            announceOnMount
            color="success"
            iconType="check"
            title={i18n.translate('xpack.streams.dataSources.awsTestConnection.successTitle', {
              defaultMessage: 'Connection established and data arriving',
            })}
            data-test-subj="streamsAwsCatalogTestConnectionSuccessCallout"
          >
            <p style={{ margin: 0 }}>
              {i18n.translate('xpack.streams.dataSources.awsTestConnection.successBody', {
                defaultMessage:
                  'We installed these integrations for the AWS services you selected. Data is now flowing into Elastic.',
              })}
            </p>
          </EuiCallOut>
          <AwsCatalogInstalledIntegrationsTable
            catalog={catalog}
            selectedServiceIds={selectedServiceIds}
            onSeeData={onSeeData}
          />
        </>
      ) : null}
    </div>
  );
};
