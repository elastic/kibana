/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { useActions, useValues } from 'kea';
import { i18n } from '@kbn/i18n';
import { AppHeader, type AppHeaderTab, type AppHeaderTitle } from '@kbn/app-header';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { EuiButton, EuiPageTemplate } from '@elastic/eui';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import { CONNECTOR_DETAIL_TAB_PATH, CONNECTORS_PATH } from '../routes';
import { ConnectorScheduling } from '../search_index/connector/connector_scheduling';
import { ConnectorSyncRules } from '../search_index/connector/sync_rules/connector_rules';

import { ConnectorConfiguration } from './connector_configuration';
import { ConnectorViewLogic } from './connector_view_logic';
import { ConnectorDetailOverview } from './overview';
import { generateEncodedPath } from '../shared/encode_path_params';
import { SearchIndexDocuments } from '../search_index/documents';
import { SearchIndexIndexMappings } from '../search_index/index_mappings';
import { SearchConnectorsPageTemplateWrapper } from '../shared/page_template';
import { connectorsBreadcrumbs } from '../connectors/connectors';
import { useBreadcrumbs } from '../../utils/use_breadcrumbs';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';
import { getContentConnectorsUrl } from '../../utils/get_content_connectors_url';
import { putConnectorNameAndDescription } from '../../api/connector/update_connector_name_and_description_api_logic';
import { flashSuccessToast } from '../shared/flash_messages';

export enum ConnectorDetailTabId {
  // all indices
  OVERVIEW = 'overview',
  DOCUMENTS = 'documents',
  INDEX_MAPPINGS = 'index_mappings',
  PIPELINES = 'pipelines',
  // connector indices
  CONFIGURATION = 'configuration',
  SYNC_RULES = 'sync_rules',
  SCHEDULING = 'scheduling',
}

export const detailsConnectorBreadcrumbs: ChromeBreadcrumb[] = [
  ...connectorsBreadcrumbs,
  {
    text: i18n.translate('xpack.contentConnectors.content.connectors.detailsBreadcrumb', {
      defaultMessage: 'Connector Details',
    }),
  },
];

export const ConnectorDetail: React.FC = () => {
  const connectorId = decodeURIComponent(useParams<{ connectorId: string }>().connectorId);
  const {
    services: { chrome, appParams },
  } = useKibanaContextForPlugin();
  useBreadcrumbs(detailsConnectorBreadcrumbs, appParams, chrome);
  const {
    services: { application, http },
  } = useKibana();
  const { hasFilteringFeature, index, connector, isLoading } = useValues(
    ConnectorViewLogic({ http })
  );
  const { fetchConnectorApiReset, startConnectorPoll, stopConnectorPoll, updateConnectorData } =
    useActions(ConnectorViewLogic({ http }));
  useEffect(() => {
    stopConnectorPoll();
    fetchConnectorApiReset();
    startConnectorPoll(connectorId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectorId]);

  const { tabId = ConnectorDetailTabId.OVERVIEW } = useParams<{
    tabId?: string;
  }>();

  const tabs = useMemo(() => {
    const getTabHref = (nextTabId: ConnectorDetailTabId) =>
      getContentConnectorsUrl(
        application?.getUrlForApp,
        generateEncodedPath(CONNECTOR_DETAIL_TAB_PATH, {
          connectorId,
          tabId: nextTabId,
        })
      );

    return [
      {
        content: <ConnectorDetailOverview />,
        id: ConnectorDetailTabId.OVERVIEW,
        isSelected: tabId === ConnectorDetailTabId.OVERVIEW,
        label: i18n.translate(
          'xpack.contentConnectors.connectors.connectorDetail.overviewTabLabel',
          {
            defaultMessage: 'Overview',
          }
        ),
        href: getTabHref(ConnectorDetailTabId.OVERVIEW),
      },
      {
        content: <SearchIndexDocuments />,
        disabled: !index,
        id: ConnectorDetailTabId.DOCUMENTS,
        isSelected: tabId === ConnectorDetailTabId.DOCUMENTS,
        label: i18n.translate(
          'xpack.contentConnectors.connectors.connectorDetail.documentsTabLabel',
          {
            defaultMessage: 'Documents',
          }
        ),
        href: getTabHref(ConnectorDetailTabId.DOCUMENTS),
      },
      {
        content: <SearchIndexIndexMappings />,
        disabled: !index,
        id: ConnectorDetailTabId.INDEX_MAPPINGS,
        isSelected: tabId === ConnectorDetailTabId.INDEX_MAPPINGS,
        label: i18n.translate(
          'xpack.contentConnectors.connectors.connectorDetail.indexMappingsTabLabel',
          {
            defaultMessage: 'Mappings',
          }
        ),
        href: getTabHref(ConnectorDetailTabId.INDEX_MAPPINGS),
      },
      {
        content: <ConnectorSyncRules />,
        disabled: !index || !hasFilteringFeature,
        id: ConnectorDetailTabId.SYNC_RULES,
        isSelected: tabId === ConnectorDetailTabId.SYNC_RULES,
        label: i18n.translate(
          'xpack.contentConnectors.connectors.connectorDetail.syncRulesTabLabel',
          {
            defaultMessage: 'Sync rules',
          }
        ),
        href: getTabHref(ConnectorDetailTabId.SYNC_RULES),
      },
      {
        content: <ConnectorScheduling />,
        disabled: !connector?.index_name,
        id: ConnectorDetailTabId.SCHEDULING,
        isSelected: tabId === ConnectorDetailTabId.SCHEDULING,
        label: i18n.translate(
          'xpack.contentConnectors.connectors.connectorDetail.schedulingTabLabel',
          {
            defaultMessage: 'Scheduling',
          }
        ),
        href: getTabHref(ConnectorDetailTabId.SCHEDULING),
      },
      {
        content: <ConnectorConfiguration />,
        id: ConnectorDetailTabId.CONFIGURATION,
        isSelected: tabId === ConnectorDetailTabId.CONFIGURATION,
        label: i18n.translate(
          'xpack.contentConnectors.connectors.connectorDetail.configurationTabLabel',
          {
            defaultMessage: 'Configuration',
          }
        ),
        href: getTabHref(ConnectorDetailTabId.CONFIGURATION),
      },
    ];
  }, [
    application?.getUrlForApp,
    connector?.index_name,
    connectorId,
    hasFilteringFeature,
    index,
    tabId,
  ]);

  const selectedTab = useMemo(() => tabs.find((tab) => tab.id === tabId), [tabId, tabs]);

  const onSaveTitle = useCallback(
    async (nextTitle: string) => {
      if (!connector) {
        return;
      }

      const name = nextTitle.trim();
      if (!name) {
        return i18n.translate('xpack.contentConnectors.nameAndDescription.name.error.empty', {
          defaultMessage: 'Connector name cannot be empty',
        });
      }

      try {
        await putConnectorNameAndDescription({
          connectorId: connector.id,
          description: connector.description,
          http,
          name,
        });
        updateConnectorData({ name });
        flashSuccessToast(
          i18n.translate(
            'xpack.contentConnectors.content.indices.configurationConnector.nameAndDescription.successToast.title',
            { defaultMessage: 'Connector name and description updated' }
          )
        );
      } catch {
        return i18n.translate(
          'xpack.contentConnectors.connectors.nameAndDescription.name.error.saveFailed',
          { defaultMessage: 'Unable to update connector name' }
        );
      }
    },
    [connector, http, updateConnectorData]
  );

  const headerTitle = useMemo<AppHeaderTitle>(
    () => ({
      ariaLabel: i18n.translate(
        'xpack.contentConnectors.connectors.nameAndDescription.name.ariaLabel',
        {
          defaultMessage: 'Edit connector name',
        }
      ),
      onSave: onSaveTitle,
      placeholder: i18n.translate(
        'xpack.contentConnectors.connectors.nameAndDescription.name.placeholder',
        { defaultMessage: 'Add a name to your connector' }
      ),
      text: connector?.name ?? '',
    }),
    [connector?.name, onSaveTitle]
  );

  const headerTabs = useMemo<AppHeaderTab[]>(
    () =>
      tabs.map((tab) => ({
        'data-test-subj': `contentConnectorsConnectorDetail-${tab.id}Tab`,
        disabled: tab.disabled,
        href: tab.href,
        id: tab.id,
        isSelected: tab.isSelected,
        label: tab.label,
      })),
    [tabs]
  );

  if (!connector || connector?.deleted) {
    return (
      <EuiPageTemplate offset={0} grow restrictWidth data-test-subj="svlSearchEditConnectorsPage">
        <EuiPageTemplate.EmptyPrompt
          title={
            <h1>
              {i18n.translate('xpack.serverlessSearch.connectors.notFound', {
                defaultMessage: 'Could not find connector {connectorId}',
                values: { connectorId },
              })}
            </h1>
          }
          actions={
            <EuiButton
              data-test-subj="serverlessSearchEditConnectorGoBackButton"
              color="primary"
              fill
              onClick={() => application?.navigateToUrl(`./`)}
            >
              {i18n.translate('xpack.serverlessSearch.connectors.goBack', {
                defaultMessage: 'Go back',
              })}
            </EuiButton>
          }
        />
      </EuiPageTemplate>
    );
  }

  return (
    <SearchConnectorsPageTemplateWrapper
      isLoading={isLoading}
      appHeader={
        <AppHeader
          title={headerTitle}
          back={{
            href: getContentConnectorsUrl(application?.getUrlForApp, CONNECTORS_PATH),
            label: i18n.translate('xpack.contentConnectors.content.connectors.breadcrumb', {
              defaultMessage: 'Content Connectors',
            }),
          }}
          tabs={headerTabs}
          spacing="bleed"
        />
      }
    >
      {selectedTab?.content || null}
    </SearchConnectorsPageTemplateWrapper>
  );
};
