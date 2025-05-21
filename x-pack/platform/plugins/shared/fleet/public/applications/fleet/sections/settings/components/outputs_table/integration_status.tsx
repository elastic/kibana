/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
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
  EuiBadge,
  useEuiTheme,
  EuiLink,
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

import { sendGetPackageInfoByKeyForRq, useStartServices } from '../../../../hooks';

import { IntegrationStatusBadge } from './integration_status_badge';
import { getIntegrationStatus } from './integration_sync_status';

const CollapsiblePanel: React.FC<{
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
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel
      paddingSize="none"
      css={css`
        border: solid 1px ${euiTheme.colors.borderBasePlain};
        box-shadow: none;
        border-radius: 6px;
      `}
    >
      <EuiAccordion
        css={css`
          .euiAccordion__button {
            width: 90%;
          }
          .euiAccordion__triggerWrapper {
            padding-left: ${euiTheme.size.m};
          }
          &.euiAccordion-isOpen {
            .euiAccordion__childWrapper {
              padding: ${euiTheme.size.m};
              padding-top: 0px;
            }
          }

          .ingest-integration-title-button {
            padding: ${euiTheme.size.s};
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
        `}
        id={id}
        arrowDisplay="left"
        buttonClassName="ingest-integration-title-button"
        buttonContent={title}
        arrowProps={arrowProps}
        data-test-subj={dataTestSubj}
      >
        {children}
      </EuiAccordion>
    </EuiPanel>
  );
};

export const IntegrationStatus: React.FunctionComponent<{
  integration: RemoteSyncedIntegrationsStatus;
  customAssets: RemoteSyncedCustomAssetsStatus[];
  syncUninstalledIntegrations?: boolean;
  'data-test-subj'?: string;
}> = memo(
  ({ integration, customAssets, syncUninstalledIntegrations, 'data-test-subj': dataTestSubj }) => {
    const [packageInfo, setPackageInfo] = useState<PackageInfo | undefined>(undefined);

    useEffect(() => {
      sendGetPackageInfoByKeyForRq(integration.package_name, integration.package_version, {
        prerelease: true,
      }).then((result: GetInfoResponse) => {
        setPackageInfo(result.item);
      });
    }, [integration.package_name, integration.package_version]);

    const statuses = [integration.sync_status, ...customAssets.map((asset) => asset.sync_status)];
    const integrationStatus = getIntegrationStatus(statuses).toUpperCase();
    const { euiTheme } = useEuiTheme();
    const { docLinks } = useStartServices();
    return (
      <CollapsiblePanel
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
                        {syncUninstalledIntegrations &&
                        integration.install_status.main !== 'installed' ? (
                          <p
                            css={css`
                              color: ${euiTheme.colors.textDisabled};
                            `}
                          >
                            {packageInfo?.title ?? integration.package_name}
                          </p>
                        ) : (
                          <p>{packageInfo?.title ?? integration.package_name}</p>
                        )}
                      </EuiTitle>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <IntegrationStatusBadge status={integrationStatus} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </h3>
          </EuiTitle>
        }
      >
        <>
          {integration.error && (
            <>
              {syncUninstalledIntegrations && (
                <>
                  <EuiText size="xs" color="subdued">
                    <FormattedMessage
                      id="xpack.fleet.integrationSyncStatus.integrationErrorContent"
                      defaultMessage="This integration was uninstalled but could not be uninstalled on the remote cluster. Check out the {troubleshootingLink} for help."
                      values={{
                        troubleshootingLink: (
                          <EuiLink
                            href={docLinks.links.fleet.remoteESOoutputTroubleshooting}
                            target="_blank"
                          >
                            <FormattedMessage
                              id="xpack.fleet.integrationsSyncFlyout.integrationStatus.troubleshootingLinkLabel"
                              defaultMessage="troubleshooting guide"
                            />
                          </EuiLink>
                        ),
                      }}
                    />
                  </EuiText>
                </>
              )}
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
                buttonContent={
                  <EuiFlexGroup alignItems="baseline" gutterSize="xs">
                    <EuiFlexItem grow={false}>
                      <EuiText size="s">{customAsset.name}</EuiText>
                    </EuiFlexItem>
                    {customAsset.is_deleted && (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="hollow">
                          <FormattedMessage
                            id="xpack.fleet.integrationSyncStatus.deletedText"
                            defaultMessage="Deleted"
                          />
                        </EuiBadge>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                }
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
      </CollapsiblePanel>
    );
  }
);
