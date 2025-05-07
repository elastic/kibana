/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { css } from '@emotion/react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
  EuiProgress,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { useKibana } from '@kbn/kibana-react-plugin/public';

import { DEV_TOOLS_CONSOLE_PATH, CONNECTOR_DETAIL_TAB_PATH } from '../../routes';

import { ConnectorDetailTabId } from '../../connector_detail/connector_detail';
import { ConnectorViewLogic } from '../../connector_detail/connector_view_logic';

import connectorLogo from './assets/connector_logo.svg';
import { useAppContext } from '../../../app_context';
import { generateEncodedPath } from '../../shared/encode_path_params';
import { IndexViewLogic } from '../../search_index/index_view_logic';
import { SyncsLogic } from '../../shared/header_actions/syncs_logic';

interface FinishUpStepProps {
  title: string;
}

export const FinishUpStep: React.FC<FinishUpStepProps> = ({ title }) => {
  const { http, application } = useKibana().services;
  const { euiTheme } = useEuiTheme();

  const [showNext, setShowNext] = useState(false);

  const { isWaitingForSync, isSyncing: isSyncingProp } = useValues(IndexViewLogic({ http }));
  const { connector } = useValues(ConnectorViewLogic({ http }));
  const { startSync } = useActions(SyncsLogic({ http }));

  const isSyncing = isWaitingForSync || isSyncingProp;

  const {
    plugins: { discover },
  } = useAppContext();
  useEffect(() => {
    setTimeout(() => {
      window.scrollTo({
        behavior: 'smooth',
        top: 0,
      });
    }, 100);
  }, []);
  return (
    <>
      <EuiFlexGroup gutterSize="m" direction="column">
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder paddingSize="l">
            <EuiTitle size="m">
              <h3>{title}</h3>
            </EuiTitle>
            <EuiSpacer size="xl" />
            {isSyncing && (
              <>
                <EuiFlexGroup gutterSize="m">
                  <EuiFlexItem>
                    <EuiText size="xs">
                      {i18n.translate(
                        'xpack.contentConnectors.createConnector.finishUpStep.syncingDataTextLabel',
                        {
                          defaultMessage: 'Syncing data',
                        }
                      )}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="xs" />
                <EuiProgress
                  size="s"
                  color="success"
                  onClick={() => {
                    setShowNext(true);
                  }}
                />
                <EuiSpacer size="xl" />
              </>
            )}
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="m">
                <EuiFlexItem>
                  <EuiCard
                    icon={<EuiIcon size="xxl" type="discoverApp" />}
                    titleSize="s"
                    title={i18n.translate(
                      'xpack.contentConnectors.createConnector.finishUpStep.euiCard.exploreYourDataLabel',
                      { defaultMessage: 'Explore your data' }
                    )}
                    description={i18n.translate(
                      'xpack.contentConnectors.createConnector.finishUpStep.euiCard.exploreYourDataDescription',
                      {
                        defaultMessage:
                          'See your connector documents or make a data view to explore them',
                      }
                    )}
                    footer={
                      showNext ? (
                        <EuiButton
                          data-test-subj="enterpriseSearchFinishUpStepViewInDiscoverButton"
                          aria-label={i18n.translate(
                            'xpack.contentConnectors.finishUpStep.euiButton.viewInDiscoverLabel',
                            { defaultMessage: 'View in Discover' }
                          )}
                          onClick={() => {
                            discover?.locator?.navigate({
                              dataViewSpec: {
                                title: connector?.name,
                              },
                              indexPattern: connector?.index_name,
                              title: connector?.name,
                            });
                          }}
                        >
                          {i18n.translate(
                            'xpack.contentConnectors.createConnector.finishUpStep.viewInDiscoverButtonLabel',
                            { defaultMessage: 'View in Discover' }
                          )}
                        </EuiButton>
                      ) : (
                        <EuiButton
                          data-test-subj="enterpriseSearchFinishUpStepButton"
                          color="warning"
                          iconSide="left"
                          iconType="refresh"
                          isLoading={isSyncing}
                          aria-label={i18n.translate(
                            'xpack.contentConnectors.createConnector.finishUpStep.euiButton.firstSyncDataLabel',
                            { defaultMessage: 'First sync data' }
                          )}
                          onClick={() => {
                            startSync(connector);
                            setShowNext(true);
                          }}
                        >
                          {isSyncing ? 'Syncing data' : 'First sync data'}
                        </EuiButton>
                      )
                    }
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiCard
                    icon={<EuiIcon size="xxl" type={connectorLogo} />}
                    titleSize="s"
                    title={i18n.translate(
                      'xpack.contentConnectors.createConnector.finishUpStep.euiCard.manageYourConnectorLabel',
                      { defaultMessage: 'Manage your connector' }
                    )}
                    description={i18n.translate(
                      'xpack.contentConnectors.createConnector.finishUpStep.euiCard.manageYourConnectorDescription',
                      {
                        defaultMessage:
                          'Now you can manage your connector, schedule a sync and much more',
                      }
                    )}
                    footer={
                      <EuiFlexGroup responsive={false} gutterSize="xs" justifyContent="center">
                        <EuiFlexItem grow={false}>
                          <EuiButton
                            data-test-subj="enterpriseSearchFinishUpStepManageConnectorButton"
                            size="m"
                            fill
                            onClick={() => {
                              if (connector) {
                                application?.navigateToUrl(
                                  generateEncodedPath(
                                    `/app/management/data/content_connectors${CONNECTOR_DETAIL_TAB_PATH}`,
                                    {
                                      connectorId: connector.id,
                                      tabId: ConnectorDetailTabId.CONFIGURATION,
                                    }
                                  )
                                );
                              }
                            }}
                          >
                            {i18n.translate(
                              'xpack.contentConnectors.createConnector.finishUpStep.manageConnectorButtonLabel',
                              { defaultMessage: 'Manage connector' }
                            )}
                          </EuiButton>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    }
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiHorizontalRule margin="xl" />
            <EuiTitle size="s">
              <h3>
                {i18n.translate(
                  'xpack.contentConnectors.createConnector.finishUpStep.h3.queryYourDataLabel',
                  {
                    defaultMessage: 'Query your data',
                  }
                )}
              </h3>
            </EuiTitle>
            <EuiSpacer size="l" />
            <EuiFlexGroup gutterSize="m">
              <EuiFlexItem>
                <EuiCard
                  layout="horizontal"
                  icon={
                    <EuiIcon
                      css={() => css`
                        margin-top: ${euiTheme.size.xs};
                      `}
                      size="m"
                      type="console"
                    />
                  }
                  title={i18n.translate(
                    'xpack.contentConnectors.createConnector.finishUpStep.euiCard.devToolsLabel',
                    { defaultMessage: 'Dev tools' }
                  )}
                  titleSize="xs"
                  description={i18n.translate(
                    'xpack.contentConnectors.createConnector.finishUpStep.euiCard.devToolsDescription',
                    {
                      defaultMessage:
                        'Tools for interacting with your data, such as console, profiler, Grok debugger and more',
                    }
                  )}
                  onClick={() => {
                    application?.navigateToUrl(
                      http?.basePath.prepend(DEV_TOOLS_CONSOLE_PATH) ?? ''
                    );
                  }}
                  display="subdued"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
