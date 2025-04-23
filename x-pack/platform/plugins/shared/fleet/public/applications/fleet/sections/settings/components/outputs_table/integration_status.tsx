/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiAccordion,
  EuiTitle,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiCallOut,
  EuiIcon,
  EuiLoadingSpinner,
} from '@elastic/eui';

import type { EuiAccordionProps } from '@elastic/eui/src/components/accordion';

import { FormattedMessage } from '@kbn/i18n-react';

import type {
  GetInfoResponse,
  PackageInfo,
  RemoteSyncedCustomAssetsStatus,
  RemoteSyncedIntegrationsStatus,
} from '../../../../../../../common/types';
import { SyncStatus } from '../../../../../../../common/types';
import { PackageIcon } from '../../../../../../components';

import { sendGetPackageInfoByKeyForRq } from '../../../../hooks';

import { IntegrationStatusBadge } from './integration_status_badge';

const StyledEuiPanel = styled(EuiPanel)`
  border: solid 1px ${(props) => props.theme.eui.euiFormBorderColor};
  box-shadow: none;
  border-radius: 6px;
`;

const StyledEuiAccordion = styled(EuiAccordion)`
  .euiAccordion__button {
    width: 90%;
  }

  .euiAccordion__triggerWrapper {
    padding-left: ${(props) => props.theme.eui.euiSizeM};
  }

  &.euiAccordion-isOpen {
    .euiAccordion__childWrapper {
      padding: ${(props) => props.theme.eui.euiSizeM};
      padding-top: 0px;
    }
  }

  .ingest-integration-title-button {
    padding: ${(props) => props.theme.eui.euiSizeS};
  }

  .euiTableRow:last-child .euiTableRowCell {
    border-bottom: none;
  }

  .euiIEFlexWrapFix {
    min-width: 0;
  }

  .euiAccordion__buttonContent {
    width: 100%;
  }
`;

const CollapsablePanel: React.FC<{
  children: React.ReactNode;
  id: string;
  title: React.ReactNode;
  'data-test-subj'?: string;
}> = ({ id, title, children, 'data-test-subj': dataTestSubj }) => {
  const arrowProps = useMemo<EuiAccordionProps['arrowProps']>(() => {
    if (dataTestSubj) {
      return {
        'data-test-subj': `${dataTestSubj}-openCloseToggle`,
      };
    }
    return undefined;
  }, [dataTestSubj]);

  return (
    <StyledEuiPanel paddingSize="none">
      <StyledEuiAccordion
        id={id}
        arrowDisplay="left"
        buttonClassName="ingest-integration-title-button"
        buttonContent={title}
        arrowProps={arrowProps}
        data-test-subj={dataTestSubj}
      >
        {children}
      </StyledEuiAccordion>
    </StyledEuiPanel>
  );
};

export const IntegrationStatus: React.FunctionComponent<{
  integration: RemoteSyncedIntegrationsStatus;
  customAssets: RemoteSyncedCustomAssetsStatus[];
  'data-test-subj'?: string;
}> = memo(({ integration, customAssets, 'data-test-subj': dataTestSubj }) => {
  const [packageInfo, setPackageInfo] = useState<PackageInfo | undefined>(undefined);

  useEffect(() => {
    sendGetPackageInfoByKeyForRq(integration.package_name, integration.package_version, {
      prerelease: true,
    }).then((result: GetInfoResponse) => {
      setPackageInfo(result.item);
    });
  }, [integration.package_name, integration.package_version]);

  return (
    <CollapsablePanel
      id={integration.package_name}
      data-test-subj={dataTestSubj}
      title={
        <EuiTitle size="xs">
          <h3>
            <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="spaceBetween">
              <EuiFlexItem>
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <PackageIcon
                      packageName={integration.package_name}
                      version={integration.package_version}
                      size="l"
                      tryApi={true}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem className="eui-textTruncate">
                    <EuiTitle size="xs">
                      <p>{packageInfo?.title ?? integration.package_name}</p>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <IntegrationStatusBadge status={integration.sync_status.toUpperCase()} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </h3>
        </EuiTitle>
      }
    >
      <>
        {integration.error && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.fleet.integrationSyncStatus.integrationErrorTitle"
                  defaultMessage="Error"
                />
              }
              color="danger"
              iconType="error"
              size="s"
              data-test-subj="integrationSyncIntegrationErrorCallout"
            >
              <EuiText size="s">{integration.error}</EuiText>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}
        {customAssets.map((customAsset) => {
          return (
            <EuiAccordion
              id={`${customAsset.type}:${customAsset.name}`}
              key={`${customAsset.type}:${customAsset.name}`}
              buttonContent={customAsset.name}
              data-test-subj={`${customAsset.type}:${customAsset.name}-accordion`}
              extraAction={
                customAsset.sync_status === SyncStatus.SYNCHRONIZING ? (
                  <EuiLoadingSpinner size="m" />
                ) : (
                  <EuiIcon
                    size="m"
                    color={customAsset.sync_status === SyncStatus.FAILED ? 'danger' : 'success'}
                    type={
                      customAsset.sync_status === SyncStatus.FAILED
                        ? 'errorFilled'
                        : 'checkInCircleFilled'
                    }
                  />
                )
              }
              paddingSize="none"
            >
              {customAsset.error && (
                <>
                  <EuiSpacer size="m" />
                  <EuiCallOut
                    title={
                      <FormattedMessage
                        id="xpack.fleet.integrationSyncStatus.errorTitle"
                        defaultMessage="Error"
                      />
                    }
                    color="danger"
                    iconType="error"
                    size="s"
                    data-test-subj="integrationSyncAssetErrorCallout"
                  >
                    <EuiText size="s">{customAsset.error}</EuiText>
                  </EuiCallOut>
                  <EuiSpacer size="m" />
                </>
              )}
            </EuiAccordion>
          );
        })}
      </>
    </CollapsablePanel>
  );
});
