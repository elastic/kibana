/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import {
  EuiSuperSelect,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextTruncate,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiSuperSelectOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  AWS_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ,
  AZURE_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ,
  getCloudConnectorEditIconTestSubj,
} from '../../../../common/services/cloud_connectors/test_subjects';
import type { AccountType } from '../../../types';
import type { CloudConnectorCredentials, CloudProviders } from '../types';
import { useGetCloudConnectors } from '../hooks/use_get_cloud_connectors';
import { isAwsCloudConnectorVars, isAzureCloudConnectorVars } from '../utils';
import { CloudConnectorPoliciesFlyout } from '../cloud_connector_policies_flyout';
import { AccountBadge } from '../components/account_badge';
import { IntegrationCountBadge } from '../components/integration_count_badge';

interface CloudConnectorSelectorProps {
  provider: CloudProviders;
  cloudConnectorId: string | undefined;
  credentials: CloudConnectorCredentials;
  setCredentials: (credentials: CloudConnectorCredentials) => void;
  accountType?: AccountType;
}

export const CloudConnectorSelector = ({
  provider,
  cloudConnectorId,
  credentials,
  setCredentials,
  accountType,
}: CloudConnectorSelectorProps) => {
  const { data: cloudConnectors = [] } = useGetCloudConnectors({
    cloudProvider: provider,
    accountType,
  });
  const [flyoutConnectorId, setFlyoutConnectorId] = useState<string | null>(null);
  const [selectKey, setSelectKey] = useState(0);

  const label = (
    <FormattedMessage
      id="xpack.fleet.cloudConnector.selector.label"
      defaultMessage="Cloud Connector Name"
    />
  );

  const handleOpenFlyout = useCallback((e: React.MouseEvent, connectorId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setFlyoutConnectorId(connectorId);
    // Force dropdown to close by re-rendering the select
    setSelectKey((prev) => prev + 1);
  }, []);

  const handleCloseFlyout = useCallback(() => {
    setFlyoutConnectorId(null);
  }, []);

  // Find the connector for the flyout
  const flyoutConnector = useMemo(() => {
    return cloudConnectors.find((c) => c.id === flyoutConnectorId);
  }, [cloudConnectors, flyoutConnectorId]);

  // Create super select options with custom display
  const selectOptions: Array<EuiSuperSelectOption<string>> = useMemo(() => {
    return cloudConnectors.map((connector) => {
      let identifier = '';

      if (isAwsCloudConnectorVars(connector.vars, provider)) {
        identifier = connector.vars.role_arn?.value || '';
      } else if (isAzureCloudConnectorVars(connector.vars, provider)) {
        identifier = connector.vars.azure_credentials_cloud_connector_id?.value || '';
      }

      return {
        value: connector.id,
        inputDisplay: (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem style={{ minWidth: 0 }}>
              <EuiTextTruncate text={connector.name} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <AccountBadge accountType={connector.accountType} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate('xpack.fleet.cloudConnector.selector.editTooltip', {
                  defaultMessage: 'View and edit connector details',
                })}
              >
                <EuiButtonIcon
                  iconType="pencil"
                  aria-label={i18n.translate('xpack.fleet.cloudConnector.selector.editAriaLabel', {
                    defaultMessage: 'Edit {name}',
                    values: { name: connector.name },
                  })}
                  color="text"
                  size="s"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                    handleOpenFlyout(e, connector.id)
                  }
                  data-test-subj={getCloudConnectorEditIconTestSubj(connector.id)}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        dropdownDisplay: (
          <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem>
              <EuiFlexGroup direction="column" gutterSize="none">
                <EuiFlexItem>
                  <strong>
                    <EuiTextTruncate text={connector.name} />
                  </strong>
                </EuiFlexItem>
                {identifier && (
                  <EuiFlexItem>
                    <EuiText size="s" color="subdued">
                      <EuiTextTruncate text={identifier} />
                    </EuiText>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <AccountBadge accountType={connector.accountType} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <IntegrationCountBadge
                cloudConnectorId={connector.id}
                count={connector.packagePolicyCount ?? 0}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      };
    });
  }, [cloudConnectors, provider, handleOpenFlyout]);

  // Find currently selected value
  const selectedValue = useMemo(() => {
    return cloudConnectorId || credentials?.cloudConnectorId || '';
  }, [cloudConnectorId, credentials?.cloudConnectorId]);

  const handleChange = useCallback(
    (value: string) => {
      const connector = cloudConnectors.find((c) => c.id === value);

      if (!connector) {
        return;
      }

      if (isAwsCloudConnectorVars(connector.vars, provider)) {
        // Extract the actual value, handling both string and CloudConnectorSecretReference
        const externalIdValue =
          typeof connector.vars.external_id?.value === 'string'
            ? connector.vars.external_id.value
            : connector.vars.external_id?.value;
        setCredentials({
          roleArn: connector.vars.role_arn?.value,
          externalId: externalIdValue,
          cloudConnectorId: connector.id,
        });
      } else if (isAzureCloudConnectorVars(connector.vars, provider)) {
        setCredentials({
          tenantId: connector.vars.tenant_id?.value,
          clientId: connector.vars.client_id?.value,
          azure_credentials_cloud_connector_id:
            connector.vars.azure_credentials_cloud_connector_id?.value,
          cloudConnectorId: connector.id,
        });
      }
    },
    [cloudConnectors, provider, setCredentials]
  );

  const testSubj =
    provider === 'aws'
      ? AWS_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ
      : AZURE_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ;

  return (
    <>
      <EuiFormRow label={label} fullWidth>
        <EuiSuperSelect
          key={selectKey}
          options={selectOptions}
          valueOfSelected={selectedValue}
          onChange={handleChange}
          fullWidth
          placeholder={i18n.translate('xpack.fleet.cloudConnector.selector.placeholder', {
            defaultMessage: 'Select a cloud connector',
          })}
          hasDividers
          data-test-subj={testSubj}
        />
      </EuiFormRow>

      {flyoutConnector && (
        <CloudConnectorPoliciesFlyout
          cloudConnectorId={flyoutConnector.id}
          cloudConnectorName={flyoutConnector.name}
          cloudConnectorVars={flyoutConnector.vars}
          accountType={flyoutConnector.accountType}
          provider={provider}
          onClose={handleCloseFlyout}
        />
      )}
    </>
  );
};
