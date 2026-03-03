/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiDescriptionList,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPage,
  EuiPageBody,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type {
  CompleteCloudConnectorSetupRequest,
  CompleteCloudConnectorSetupResponse,
} from '../../../../../common/types/rest_spec/cloud_connector';
import { SINGLE_ACCOUNT, ORGANIZATION_ACCOUNT } from '../../../../../common/constants';

import { useStartServices } from '../../hooks';
import { sendCompleteCloudConnectorSetup } from '../../../../hooks/use_request';

type AccountType = typeof SINGLE_ACCOUNT | typeof ORGANIZATION_ACCOUNT;

interface ParsedParams {
  role_arn: string;
  external_id: string;
  account_type: AccountType;
  stack_name: string;
  region: string;
  integration_type: string;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  [SINGLE_ACCOUNT]: i18n.translate(
    'xpack.fleet.cloudConnectorComplete.accountType.singleAccount',
    { defaultMessage: 'Single Account' }
  ),
  [ORGANIZATION_ACCOUNT]: i18n.translate(
    'xpack.fleet.cloudConnectorComplete.accountType.organizationAccount',
    { defaultMessage: 'Organization Account' }
  ),
};

const parseQueryParams = (search: string): ParsedParams | null => {
  const params = new URLSearchParams(search);
  const role_arn = params.get('role_arn');
  const external_id = params.get('external_id');
  const account_type = params.get('account_type') as AccountType | null;
  const stack_name = params.get('stack_name');
  const region = params.get('region');
  const integration_type = params.get('integration_type') || 'cloud_asset_inventory';

  if (!role_arn || !external_id || !account_type || !stack_name || !region) {
    return null;
  }

  if (account_type !== SINGLE_ACCOUNT && account_type !== ORGANIZATION_ACCOUNT) {
    return null;
  }

  return { role_arn, external_id, account_type, stack_name, region, integration_type };
};

const MissingParamsView: React.FC = () => (
  <EuiEmptyPrompt
    iconType="warning"
    color="danger"
    title={
      <h2>
        <FormattedMessage
          id="xpack.fleet.cloudConnectorComplete.missingParams.title"
          defaultMessage="Invalid setup URL"
        />
      </h2>
    }
    body={
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.fleet.cloudConnectorComplete.missingParams.body"
            defaultMessage="This URL is missing required parameters. Please copy the complete URL from the CloudFormation Outputs tab and paste it in your browser."
          />
        </p>
      </EuiText>
    }
  />
);

const SuccessView: React.FC<{
  result: CompleteCloudConnectorSetupResponse;
  onNavigate: (url: string) => void;
}> = ({ result, onNavigate }) => (
  <EuiEmptyPrompt
    iconType="checkInCircleFilled"
    color="success"
    title={
      <h2>
        <FormattedMessage
          id="xpack.fleet.cloudConnectorComplete.success.title"
          defaultMessage="Setup complete!"
        />
      </h2>
    }
    body={
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.fleet.cloudConnectorComplete.success.body"
            defaultMessage="Your cloud connector {name} has been created and an agentless policy has been configured."
            values={{ name: <strong>{result.cloud_connector_name}</strong> }}
          />
        </p>
      </EuiText>
    }
    actions={
      <EuiButton
        fill
        onClick={() => onNavigate(result.redirect_url)}
        data-test-subj="cloudConnectorCompleteViewPolicyButton"
      >
        <FormattedMessage
          id="xpack.fleet.cloudConnectorComplete.success.viewPolicy"
          defaultMessage="View policy"
        />
      </EuiButton>
    }
  />
);

export const CompleteSetupPage: React.FC = () => {
  const { search } = useLocation();
  const { application } = useStartServices();
  const params = useMemo(() => parseQueryParams(search), [search]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompleteCloudConnectorSetupResponse | null>(null);

  const handleCompleteSetup = useCallback(async () => {
    if (!params) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const requestBody: CompleteCloudConnectorSetupRequest = {
        role_arn: params.role_arn,
        external_id: params.external_id,
        account_type: params.account_type,
        integration_type: params.integration_type,
        stack_name: params.stack_name,
        region: params.region,
      };

      const resp = await sendCompleteCloudConnectorSetup(requestBody);
      setResult(resp);
    } catch (err) {
      setError(err.body?.message || err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }, [params]);

  const handleNavigate = useCallback(
    (url: string) => {
      application.navigateToUrl(url);
    },
    [application]
  );

  const handleCancel = useCallback(() => {
    application.navigateToApp('fleet');
  }, [application]);

  if (!params) {
    return (
      <EuiPage restrictWidth={600} paddingSize="l">
        <EuiPageBody>
          <MissingParamsView />
        </EuiPageBody>
      </EuiPage>
    );
  }

  if (result) {
    return (
      <EuiPage restrictWidth={600} paddingSize="l">
        <EuiPageBody>
          <SuccessView result={result} onNavigate={handleNavigate} />
        </EuiPageBody>
      </EuiPage>
    );
  }

  const truncatedArn =
    params.role_arn.length > 80
      ? `${params.role_arn.substring(0, 77)}...`
      : params.role_arn;

  const descriptionListItems = [
    {
      title: i18n.translate('xpack.fleet.cloudConnectorComplete.field.stackName', {
        defaultMessage: 'Stack',
      }),
      description: params.stack_name,
    },
    {
      title: i18n.translate('xpack.fleet.cloudConnectorComplete.field.region', {
        defaultMessage: 'Region',
      }),
      description: params.region,
    },
    {
      title: i18n.translate('xpack.fleet.cloudConnectorComplete.field.accountType', {
        defaultMessage: 'Account type',
      }),
      description: ACCOUNT_TYPE_LABELS[params.account_type] || params.account_type,
    },
    {
      title: i18n.translate('xpack.fleet.cloudConnectorComplete.field.roleArn', {
        defaultMessage: 'IAM Role ARN',
      }),
      description: truncatedArn,
    },
  ];

  return (
    <EuiPage restrictWidth={600} paddingSize="l">
      <EuiPageBody>
        <EuiPanel paddingSize="l" data-test-subj="cloudConnectorCompletePanel">
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiIcon type="logoAWS" size="xl" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <h2>
                  <FormattedMessage
                    id="xpack.fleet.cloudConnectorComplete.title"
                    defaultMessage="Complete your AWS integration setup"
                  />
                </h2>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.fleet.cloudConnectorComplete.description"
                defaultMessage="Your CloudFormation stack has been deployed. Review the details below and click {completeSetup} to finish configuring your cloud connector and agentless policy."
                values={{
                  completeSetup: (
                    <strong>
                      <FormattedMessage
                        id="xpack.fleet.cloudConnectorComplete.description.completeSetup"
                        defaultMessage="Complete Setup"
                      />
                    </strong>
                  ),
                }}
              />
            </p>
          </EuiText>

          <EuiSpacer size="l" />

          <EuiDescriptionList
            type="column"
            listItems={descriptionListItems}
            compressed
            data-test-subj="cloudConnectorCompleteDetails"
          />

          <EuiSpacer size="l" />

          {error && (
            <>
              <EuiCallOut
                title={i18n.translate('xpack.fleet.cloudConnectorComplete.error.title', {
                  defaultMessage: 'Setup failed',
                })}
                color="danger"
                iconType="error"
                data-test-subj="cloudConnectorCompleteError"
              >
                <p>{error}</p>
              </EuiCallOut>
              <EuiSpacer size="l" />
            </>
          )}

          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={handleCancel}
                disabled={isSubmitting}
                data-test-subj="cloudConnectorCompleteCancelButton"
              >
                <FormattedMessage
                  id="xpack.fleet.cloudConnectorComplete.cancel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={handleCompleteSetup}
                isLoading={isSubmitting}
                data-test-subj="cloudConnectorCompleteSetupButton"
              >
                <FormattedMessage
                  id="xpack.fleet.cloudConnectorComplete.completeSetup"
                  defaultMessage="Complete Setup"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiPageBody>
    </EuiPage>
  );
};
