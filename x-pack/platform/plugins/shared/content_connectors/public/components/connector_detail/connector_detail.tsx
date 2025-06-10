/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { useActions, useValues } from 'kea';
import { i18n } from '@kbn/i18n';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { EuiButton, EuiPageTemplate, EuiTabProps } from '@elastic/eui';
import { ChromeBreadcrumb } from '@kbn/core/public';
import { CONNECTOR_DETAIL_TAB_PATH } from '../routes';
import { ConnectorScheduling } from '../search_index/connector/connector_scheduling';
import { ConnectorSyncRules } from '../search_index/connector/sync_rules/connector_rules';

import { ConnectorConfiguration } from './connector_configuration';
import { ConnectorViewLogic } from './connector_view_logic';
import { ConnectorDetailOverview } from './overview';
import { generateEncodedPath } from '../shared/encode_path_params';
import { useAppContext } from '../../app_context';
import { SearchIndexDocuments } from '../search_index/documents';
import { SearchIndexIndexMappings } from '../search_index/index_mappings';
import { ConnectorName } from './connector_name';
import { ConnectorDescription } from './connector_description';
import { SearchConnectorsPageTemplateWrapper } from '../shared/page_template';
import { connectorsBreadcrumbs } from '../connectors/connectors';
import { useBreadcrumbs } from '../../utils/use_breadcrumbs';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';

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
  const { fetchConnectorApiReset, startConnectorPoll, stopConnectorPoll } = useActions(
    ConnectorViewLogic({ http })
  );
  useEffect(() => {
    stopConnectorPoll();
    fetchConnectorApiReset();
    startConnectorPoll(connectorId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectorId]);

  const { tabId = ConnectorDetailTabId.OVERVIEW } = useParams<{
    tabId?: string;
  }>();

  const {
    plugins: { guidedOnboarding },
  } = useAppContext();

  useEffect(() => {
    const subscription = guidedOnboarding?.guidedOnboardingApi
      ?.isGuideStepActive$('databaseSearch', 'add_data')
      .subscribe((isStepActive) => {
        if (isStepActive && index?.count) {
          guidedOnboarding.guidedOnboardingApi?.completeGuideStep('databaseSearch', 'add_data');
        }
      });
    return () => subscription?.unsubscribe();
  }, [guidedOnboarding, index?.count]);

  const ALL_INDICES_TABS = [
    {
      content: <ConnectorDetailOverview />,
      id: ConnectorDetailTabId.OVERVIEW,
      isSelected: tabId === ConnectorDetailTabId.OVERVIEW,
      label: i18n.translate('xpack.contentConnectors.connectors.connectorDetail.overviewTabLabel', {
        defaultMessage: 'Overview',
      }),
      onClick: () => {
        application?.navigateToUrl(
          `${generateEncodedPath(
            `/app/management/data/content_connectors${CONNECTOR_DETAIL_TAB_PATH}`,
            {
              connectorId,
              tabId: ConnectorDetailTabId.OVERVIEW,
            }
          )}`
        );
      },
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
      onClick: () => {
        application?.navigateToUrl(
          `${generateEncodedPath(
            `/app/management/data/content_connectors${CONNECTOR_DETAIL_TAB_PATH}`,
            {
              connectorId,
              tabId: ConnectorDetailTabId.DOCUMENTS,
            }
          )}`
        );
      },
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
      onClick: () =>
        application?.navigateToUrl(
          generateEncodedPath(
            `/app/management/data/content_connectors${CONNECTOR_DETAIL_TAB_PATH}`,
            {
              connectorId,
              tabId: ConnectorDetailTabId.INDEX_MAPPINGS,
            }
          )
        ),
    },
  ];

  const CONNECTOR_TABS = [
    ...(hasFilteringFeature
      ? [
          {
            content: <ConnectorSyncRules />,
            disabled: !index,
            id: ConnectorDetailTabId.SYNC_RULES,
            isSelected: tabId === ConnectorDetailTabId.SYNC_RULES,
            label: i18n.translate(
              'xpack.contentConnectors.connectors.connectorDetail.syncRulesTabLabel',
              {
                defaultMessage: 'Sync rules',
              }
            ),
            onClick: () =>
              application?.navigateToUrl(
                generateEncodedPath(
                  `/app/management/data/content_connectors${CONNECTOR_DETAIL_TAB_PATH}`,
                  {
                    connectorId,
                    tabId: ConnectorDetailTabId.SYNC_RULES,
                  }
                )
              ),
          },
        ]
      : []),
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
      onClick: () =>
        application?.navigateToUrl(
          generateEncodedPath(
            `/app/management/data/content_connectors${CONNECTOR_DETAIL_TAB_PATH}`,
            {
              connectorId,
              tabId: ConnectorDetailTabId.SCHEDULING,
            }
          )
        ),
    },
  ];

  const CONFIG_TAB = [
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
      onClick: () =>
        application?.navigateToUrl(
          generateEncodedPath(
            `/app/management/data/content_connectors${CONNECTOR_DETAIL_TAB_PATH}`,
            {
              connectorId,
              tabId: ConnectorDetailTabId.CONFIGURATION,
            }
          )
        ),
    },
  ];

  /* const PIPELINES_TAB = {
    content: <SearchIndexPipelines />,
    disabled: !index,
    id: ConnectorDetailTabId.PIPELINES,
    isSelected: tabId === ConnectorDetailTabId.PIPELINES,
    label: i18n.translate(
      'xpack.contentConnectors.connectors.connectorDetail.pipelinesTabLabel',
      {
        defaultMessage: 'Pipelines',
      }
    ),
    onClick: () =>
      application?.navigateToUrl(
        generateEncodedPath(CONNECTOR_DETAIL_TAB_PATH, {
          connectorId,
          tabId: ConnectorDetailTabId.PIPELINES,
        })
      ),
  }; */

  interface TabMenuItem {
    content: JSX.Element;
    disabled?: boolean;
    id: string;
    label: string;
    onClick?: () => void;
    prepend?: React.ReactNode;
    route?: string;
    testSubj?: string;
  }

  const tabs: TabMenuItem[] = [
    ...ALL_INDICES_TABS,
    ...CONNECTOR_TABS,
    // ...[PIPELINES_TAB],
    ...CONFIG_TAB,
  ];

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const selectedTab = useMemo(() => tabs.find((tab) => tab.id === tabId), [tabId]);

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
      pageHeader={{
        description: connector ? <ConnectorDescription connector={connector} /> : '...',
        pageTitle: connector ? <ConnectorName connector={connector} /> : '...',
        rightSideGroupProps: {
          gutterSize: 's',
          responsive: false,
          wrap: false,
        },
        tabs: tabs as Array<EuiTabProps & { label: React.ReactNode }>,
      }}
    >
      {selectedTab?.content || null}
    </SearchConnectorsPageTemplateWrapper>
  );
};
