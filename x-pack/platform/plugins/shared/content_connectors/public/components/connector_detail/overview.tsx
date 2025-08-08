/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiCallOut,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE } from '../../../common/constants';
import { CONNECTOR_DETAIL_TAB_PATH } from '../routes';
import { SyncJobs } from '../search_index/sync_jobs/sync_jobs';

import { ConnectorDetailTabId } from './connector_detail';
import { ConnectorStats } from './connector_stats';
import { ConnectorViewLogic } from './connector_view_logic';
import { generateEncodedPath } from '../shared/encode_path_params';
import { IndexViewLogic } from '../search_index/index_view_logic';
import { EuiButtonTo } from '../shared/react_router_helpers';
import { ConvertConnectorLogic } from '../search_index/connector/native_connector_configuration/convert_connector_logic';
import { ConvertConnectorModal } from '../shared/convert_connector_modal/convert_connector_modal';
import { docLinks } from '../shared/doc_links';
import { useAppContext } from '../../app_context';

export const ConnectorDetailOverview: React.FC = () => {
  const {
    services: { http },
  } = useKibana();
  const isCloud = useAppContext();
  const { indexData } = useValues(IndexViewLogic({ http }));
  const { connector, error, isWaitingOnAgentlessDeployment, connectorAgentlessPolicy } = useValues(
    ConnectorViewLogic({ http })
  );

  const { showModal } = useActions(ConvertConnectorLogic({ http }));
  const { isModalVisible } = useValues(ConvertConnectorLogic({ http }));

  return (
    <>
      {isWaitingOnAgentlessDeployment && (
        <>
          <EuiCallOut
            iconType="warning"
            color="warning"
            title={
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner />
                </EuiFlexItem>
                <EuiFlexItem>
                  {i18n.translate(
                    'xpack.contentConnectors.content.connectors.overview.agentlessDeploymentNotReadyCallOut.title',
                    {
                      defaultMessage: 'Provisioning infrastructure',
                    }
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          >
            <EuiSpacer size="s" />
            <EuiText size="s">
              {i18n.translate(
                'xpack.contentConnectors.content.connectors.overview.agentlessDeploymentNotReadyCallOut.description',
                {
                  defaultMessage: 'Setting up the agentless infrastructure to run the connector.',
                }
              )}
            </EuiText>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
      {error && (
        <>
          <EuiCallOut
            iconType="warning"
            color="danger"
            title={i18n.translate(
              'xpack.contentConnectors.content.connectors.overview.connectorErrorCallOut.title',
              {
                defaultMessage: 'Your connector has reported an error',
              }
            )}
          >
            <EuiSpacer size="s" />
            <EuiText size="s">{error}</EuiText>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
      {!!connector && !connector.index_name && (
        <>
          <EuiCallOut
            iconType="info"
            color="warning"
            title={i18n.translate(
              'xpack.contentConnectors.content.connectors.overview.connectorNoIndexCallOut.title',
              {
                defaultMessage: 'Connector has no attached index',
              }
            )}
          >
            <EuiSpacer size="s" />
            <EuiText size="s">
              {i18n.translate(
                'xpack.contentConnectors.content.connectors.overview.connectorNoIndexCallOut.description',
                {
                  defaultMessage:
                    "You won't be able to start syncing content until your connector is attached to an index.",
                }
              )}
            </EuiText>
            <EuiSpacer />
            <EuiButtonTo
              color="warning"
              fill
              to={`${generateEncodedPath(CONNECTOR_DETAIL_TAB_PATH, {
                connectorId: connector.id,
                tabId: ConnectorDetailTabId.CONFIGURATION,
              })}#attachIndexBox`}
            >
              {i18n.translate(
                'xpack.contentConnectors.content.connectors.overview.connectorNoIndexCallOut.buttonLabel',
                {
                  defaultMessage: 'Attach index',
                }
              )}
            </EuiButtonTo>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
      {!!connector?.index_name && !indexData && (
        <>
          <EuiCallOut
            iconType="info"
            title={i18n.translate(
              'xpack.contentConnectors.content.connectors.overview.connectorIndexDoesntExistCallOut.title',
              {
                defaultMessage: "Attached index doesn't exist",
              }
            )}
          >
            <EuiSpacer size="s" />
            <EuiText size="s">
              <FormattedMessage
                id="xpack.contentConnectors.content.connectors.overview.connectorIndexDoesntExistCallOut.description"
                defaultMessage="The connector will create the index on its next sync, or you can manually create the index {indexName} with your desired settings and mappings."
                values={{
                  indexName: <EuiCode>{connector.index_name}</EuiCode>,
                }}
              />
            </EuiText>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
      {connector?.is_native && !isCloud && (
        <>
          {isModalVisible && <ConvertConnectorModal />}
          <EuiCallOut
            iconType="warning"
            color="warning"
            title={i18n.translate(
              'xpack.enterpriseSearch.content.connectors.overview.nativeCloudCallout.title',
              {
                defaultMessage:
                  'Elastic managed connectors (formerly native connectors) are no longer supported outside Elastic Cloud',
              }
            )}
          >
            <EuiSpacer size="s" />
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.content.connectors.overview.nativeCloudCallout.content"
                  defaultMessage="Convert it to a {link}, to be self-hosted on your own infrastructure. Elastic managed connectors are available only in your Elastic Cloud deployment."
                  values={{
                    link: (
                      <EuiLink
                        data-test-subj="entSearchContent-connectorDetailOverview-nativeCloudCallout-connectorClientLink"
                        data-telemetry-id="entSearchContent-connectorDetailOverview-nativeCloudCallout-connectorClientLink"
                        href={docLinks.buildConnector}
                        target="_blank"
                      >
                        {i18n.translate(
                          'xpack.enterpriseSearch.content.connectors.overview.nativeCloudCallout.connectorClient',
                          { defaultMessage: 'self-managed connector' }
                        )}
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiButton
              data-test-subj="entSearchContent-connectorDetailOverview-nativeCloudCallout-convertToSelfManagedClientButton"
              color="warning"
              fill
              onClick={() => showModal()}
            >
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.connectors.overview.convertConnector.buttonLabel',
                { defaultMessage: 'Convert connector' }
              )}
            </EuiButton>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
      {connector && connector.service_type !== ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE && (
        <ConnectorStats
          connector={connector}
          indexData={indexData || undefined}
          agentlessOverview={connectorAgentlessPolicy}
        />
      )}
      {connector && connector.service_type !== ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE && (
        <>
          <EuiSpacer />
          <SyncJobs connector={connector} />
        </>
      )}
    </>
  );
};
