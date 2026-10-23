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
  EuiIcon,
  EuiLoadingSpinner,
  EuiBadge,
  useEuiTheme,
} from '@elastic/eui';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';

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

import { Loading } from '../../../agents/components';

import { IntegrationStatusBadge } from './integration_status_badge';
import { getIntegrationStatus } from './integration_sync_status';

const CollapsiblePanel: React.FC<{
  children: React.ReactNode;
  id: string;
  title: React.ReactNode;
  isDisabled?: boolean;
  'data-test-subj'?: string;
}> = ({ id, title, children, isDisabled, 'data-test-subj': dataTestSubj }) => {
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
        arrowDisplay={isDisabled ? 'none' : 'left'}
        buttonClassName="ingest-integration-title-button"
        buttonContent={title}
        arrowProps={arrowProps}
        data-test-subj={dataTestSubj}
        isDisabled={isDisabled}
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

    const titleTextColor =
      integration.install_status.main !== 'installed'
        ? euiTheme.colors.textDisabled
        : euiTheme.colors.textParagraph;

    return (
      <CollapsiblePanel
        id={integration.package_name}
        data-test-subj={dataTestSubj}
        isDisabled={!integration.error && !integration?.warning && !customAssets.length}
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
                      {!packageInfo ? (
                        <Loading />
                      ) : (
                        <EuiTitle
                          size="xs"
                          css={css`
                            color: ${titleTextColor};
                          `}
                        >
                          <p>{packageInfo?.title ?? ''}</p>
                        </EuiTitle>
                      )}
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
          {integration?.error && (
            <>
              <EuiSpacer size="s" />
              <KbnDangerCallout
                announceOnMount={false}
                title={
                  <FormattedMessage
                    id="xpack.fleet.integrationSyncStatus.integrationErrorTitle"
                    defaultMessage="Error"
                  />
                }
                size="s"
                data-test-subj="integrationSyncIntegrationErrorCallout"
                text={integration.error}
              />
              <EuiSpacer size="s" />
            </>
          )}

          {integration.sync_status === 'warning' && integration?.warning && (
            <>
              <KbnWarningCallout
                announceOnMount
                title={
                  <FormattedMessage
                    id="xpack.fleet.integrationSyncStatus.integrationWarningTitle"
                    defaultMessage="{Warning}"
                    values={{
                      Warning: integration.warning?.title,
                    }}
                  />
                }
                size="s"
                data-test-subj="integrationSyncIntegrationWarningCallout"
                text={
                  integration?.warning?.message ? (
                    <FormattedMessage
                      id="xpack.fleet.integrationSyncStatus.integrationWarningContent"
                      defaultMessage="{uninstallWarning}"
                      values={{
                        uninstallWarning: integration.warning.message,
                      }}
                    />
                  ) : undefined
                }
                actionProps={{
                  primary: {
                    href: docLinks.links.fleet.remoteESOoutputTroubleshooting,
                    iconType: 'external',
                    target: 'blank',
                    children: (
                      <FormattedMessage
                        id="xpack.fleet.integrationSyncStatus.integrationWarningButton"
                        defaultMessage="View troubleshooting guide"
                      />
                    ),
                  },
                }}
              />
            </>
          )}
          <EuiSpacer size="s" />

          {customAssets.map((customAsset) => {
            return (
              <EuiAccordion
                id={`${customAsset.type}:${customAsset.name}`}
                key={`${customAsset.type}:${customAsset.name}`}
                arrowDisplay={customAsset.error ? 'left' : 'none'}
                isDisabled={!customAsset.error && !customAsset.warning}
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
                      color={
                        customAsset.sync_status === SyncStatus.FAILED
                          ? 'danger'
                          : customAsset.sync_status === SyncStatus.WARNING
                          ? 'warning'
                          : 'success'
                      }
                      type={
                        customAsset.sync_status === SyncStatus.FAILED
                          ? 'errorFill'
                          : customAsset.sync_status === SyncStatus.WARNING
                          ? 'warning'
                          : 'checkCircleFill'
                      }
                      aria-label={
                        customAsset.sync_status === SyncStatus.FAILED
                          ? i18n.translate('xpack.fleet.integrationSyncStatus.failedIconLabel', {
                              defaultMessage: 'Sync failed',
                            })
                          : customAsset.sync_status === SyncStatus.WARNING
                          ? i18n.translate('xpack.fleet.integrationSyncStatus.warningIconLabel', {
                              defaultMessage: 'Sync warning',
                            })
                          : i18n.translate('xpack.fleet.integrationSyncStatus.syncedIconLabel', {
                              defaultMessage: 'Synced',
                            })
                      }
                    />
                  )
                }
                paddingSize="none"
              >
                <>
                  {customAsset.error && (
                    <>
                      <EuiSpacer size="s" />
                      <KbnDangerCallout
                        announceOnMount={false}
                        title={
                          <FormattedMessage
                            id="xpack.fleet.integrationSyncStatus.errorTitle"
                            defaultMessage="Error"
                          />
                        }
                        size="s"
                        data-test-subj="integrationSyncAssetErrorCallout"
                        text={customAsset.error}
                      />
                      <EuiSpacer size="s" />
                    </>
                  )}
                  {customAsset.sync_status === SyncStatus.WARNING && customAsset.warning && (
                    <>
                      <EuiSpacer size="s" />
                      <KbnWarningCallout
                        announceOnMount
                        title={
                          <FormattedMessage
                            id="xpack.fleet.integrationSyncStatus.customAssetWarningTitle"
                            defaultMessage="{Warning}"
                            values={{
                              Warning: customAsset.warning.title,
                            }}
                          />
                        }
                        size="s"
                        data-test-subj="customAssetWarningCallout"
                        text={
                          customAsset.warning.message ? (
                            <FormattedMessage
                              id="xpack.fleet.integrationSyncStatus.customAssetWarningContent"
                              defaultMessage="{customAssetWarning}"
                              values={{
                                customAssetWarning: customAsset.warning.message,
                              }}
                            />
                          ) : undefined
                        }
                      />
                      <EuiSpacer size="s" />
                    </>
                  )}
                </>
              </EuiAccordion>
            );
          })}
        </>
      </CollapsiblePanel>
    );
  }
);
