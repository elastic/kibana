/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useActions, useValues } from 'kea';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSearchBar,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { AppHeader, type AppHeaderMenu } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DefaultSettingsFlyout } from '../settings/default_settings_flyout';

import { ConnectorStats } from './connector_stats';
import { ConnectorsLogic } from './connectors_logic';
import { ConnectorsTable } from './connectors_table';
import { DeleteConnectorModal } from './delete_connector_modal';
import { ElasticManagedWebCrawlerEmptyPrompt } from './elastic_managed_web_crawler_empty_prompt';
import { SelfManagedWebCrawlerEmptyPrompt } from './self_managed_web_crawler_empty_prompt';
import { handlePageChange } from './utils';
import {
  NEW_INDEX_SELECT_CONNECTOR_CLIENTS_PATH,
  NEW_INDEX_SELECT_CONNECTOR_NATIVE_PATH,
  NEW_INDEX_SELECT_CONNECTOR_PATH,
} from '../routes';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';
import { useBreadcrumbs } from '../../utils/use_breadcrumbs';
import { getContentConnectorsUrl } from '../../utils/get_content_connectors_url';
import { SearchConnectorsPageTemplateWrapper } from '../shared/page_template';
const CreateConnector = lazy(() => import('./create_connector/create_connector'));

export const connectorsBreadcrumbs = [
  {
    text: i18n.translate('xpack.contentConnectors.content.connectors.breadcrumb', {
      defaultMessage: 'Content Connectors',
    }),
    href: '/connectors',
  },
];

export const crawlersBreadcrumbs = [
  {
    text: i18n.translate('xpack.contentConnectors.content.crawlers.breadcrumb', {
      defaultMessage: 'Web Crawlers',
    }),
  },
];

export interface ConnectorsProps {
  isCrawler: boolean;
  isCrawlerSelfManaged?: boolean;
}
const Connectors: React.FC<ConnectorsProps> = ({ isCrawler, isCrawlerSelfManaged }) => {
  const {
    services: { application, http },
  } = useKibana();

  const {
    services: { chrome, appParams },
  } = useKibanaContextForPlugin();
  const { fetchConnectors, onPaginate, setIsFirstRequest, openDeleteModal } = useActions(
    ConnectorsLogic({ http })
  );
  const { data, isLoading, searchParams, isEmpty, connectors } = useValues(
    ConnectorsLogic({ http })
  );
  const [searchQuery, setSearchValue] = useState('');
  const [showDefaultSettingsFlyout, setShowDefaultSettingsFlyout] = useState<boolean>(false);

  useBreadcrumbs(!isCrawler ? connectorsBreadcrumbs : crawlersBreadcrumbs, appParams, chrome);

  useEffect(() => {
    setIsFirstRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCrawler]);

  useEffect(() => {
    fetchConnectors({ ...searchParams, fetchCrawlersOnly: isCrawler, searchQuery, http });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.from, searchParams.size, searchQuery, isCrawler]);

  const newConnectorHref = getContentConnectorsUrl(
    application?.getUrlForApp,
    NEW_INDEX_SELECT_CONNECTOR_PATH
  );
  const newNativeConnectorHref = getContentConnectorsUrl(
    application?.getUrlForApp,
    NEW_INDEX_SELECT_CONNECTOR_NATIVE_PATH
  );
  const newSelfManagedConnectorHref = getContentConnectorsUrl(
    application?.getUrlForApp,
    NEW_INDEX_SELECT_CONNECTOR_CLIENTS_PATH
  );

  const newConnectorLabel = i18n.translate(
    'xpack.contentConnectors.connectors.newConnectorButtonLabel',
    { defaultMessage: 'New Connector' }
  );

  const listingMenu = useMemo<AppHeaderMenu | undefined>(() => {
    if (isLoading || isCrawler) {
      return undefined;
    }

    return {
      items: [
        {
          id: 'defaultSettings',
          label: i18n.translate('xpack.contentConnectors.content.searchIndices.defaultSettings', {
            defaultMessage: 'Default settings',
          }),
          iconType: 'gear',
          testId: 'entSearchContent-searchIndices-defaultSettings',
          run: () => setShowDefaultSettingsFlyout(true),
        },
      ],
      primaryActionItem: {
        id: 'newConnector',
        label: newConnectorLabel,
        iconType: 'plusCircle',
        testId: 'entSearchContent-connectors-newConnectorButton',
        popoverTestId: 'entSearchContent-connectors-newConnector-moreOptionsButton',
        popoverWidth: 280,
        items: [
          {
            id: 'newConnectorDefault',
            label: newConnectorLabel,
            iconType: 'plusCircle',
            href: newConnectorHref,
            testId: 'entSearchContent-connectors-newConnectorMenuItem',
          },
          {
            id: 'newConnectorNative',
            label: i18n.translate(
              'xpack.enterpriseSearch.connectors.newNativeConnectorButtonLabel',
              {
                defaultMessage: 'New Elastic managed Connector',
              }
            ),
            iconType: 'plusCircle',
            href: newNativeConnectorHref,
            testId: 'entSearchContent-connectors-newNativeConnectorMenuItem',
          },
          {
            id: 'newConnectorClient',
            label: i18n.translate(
              'xpack.enterpriseSearch.connectors.newConnectorsClientButtonLabel',
              { defaultMessage: 'New Self-managed Connector' }
            ),
            iconType: 'plusCircle',
            href: newSelfManagedConnectorHref,
            testId: 'entSearchContent-connectors-newSelfManagedConnectorMenuItem',
          },
        ],
      },
    };
  }, [
    isCrawler,
    isLoading,
    newConnectorHref,
    newConnectorLabel,
    newNativeConnectorHref,
    newSelfManagedConnectorHref,
  ]);

  return !isLoading && isEmpty && !isCrawler ? (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <CreateConnector />
    </Suspense>
  ) : (
    <SearchConnectorsPageTemplateWrapper
      isLoading={isLoading}
      appHeader={
        <AppHeader
          title={
            !isCrawler
              ? i18n.translate('xpack.contentConnectors.title', {
                  defaultMessage: 'Content connectors',
                })
              : i18n.translate('xpack.contentConnectors.crawlers.title', {
                  defaultMessage: 'Elastic Web Crawler',
                })
          }
          description={{
            text: i18n.translate('xpack.contentConnectors.headerContent', {
              defaultMessage:
                'Discover, extract and index searchable content from websites and knowledge bases',
            }),
            learnMoreUrl: 'https://github.com/elastic/crawler',
          }}
          menu={listingMenu}
          spacing="bleed"
        />
      }
    >
      <DeleteConnectorModal isCrawler={isCrawler} />
      <>
        {showDefaultSettingsFlyout && (
          <DefaultSettingsFlyout closeFlyout={() => setShowDefaultSettingsFlyout(false)} />
        )}
        {!isCrawler && (
          <>
            <ConnectorStats isCrawler={isCrawler} />
            <EuiSpacer />
          </>
        )}

        <EuiFlexGroup direction="column">
          {isEmpty && isCrawler ? (
            isCrawlerSelfManaged ? (
              <SelfManagedWebCrawlerEmptyPrompt />
            ) : (
              <ElasticManagedWebCrawlerEmptyPrompt />
            )
          ) : (
            <>
              <EuiFlexItem grow={false}>
                <EuiTitle>
                  <h2>
                    {!isCrawler ? (
                      <FormattedMessage
                        id="xpack.contentConnectors.connectorsTable.h2.availableConnectorsLabel"
                        defaultMessage="Available connectors"
                      />
                    ) : (
                      <FormattedMessage
                        id="xpack.contentConnectors.connectorsTable.h2.availableCrawlersLabel"
                        defaultMessage="Available web crawlers"
                      />
                    )}
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSearchBar
                  query={searchQuery}
                  box={{
                    incremental: true,
                    placeholder: !isCrawler
                      ? i18n.translate(
                          'xpack.contentConnectorsTable.euiSearchBar.filterConnectorsPlaceholder',
                          { defaultMessage: 'Filter connectors' }
                        )
                      : i18n.translate(
                          'xpack.contentConnectorsTable.euiSearchBar.filterCrawlersPlaceholder',
                          { defaultMessage: 'Filter web crawlers' }
                        ),
                  }}
                  aria-label={
                    !isCrawler
                      ? i18n.translate(
                          'xpack.contentConnectorsTable.euiSearchBar.filterConnectorsLabel',
                          { defaultMessage: 'Filter connectors' }
                        )
                      : i18n.translate(
                          'xpack.contentConnectorsTable.euiSearchBar.filterCrawlersLabel',
                          { defaultMessage: 'Filter web crawlers' }
                        )
                  }
                  onChange={(event) => setSearchValue(event.queryText)}
                />
              </EuiFlexItem>
              <ConnectorsTable
                isCrawler={isCrawler}
                items={connectors || []}
                meta={data?.meta}
                onChange={handlePageChange(onPaginate)}
                onDelete={openDeleteModal}
              />
            </>
          )}
        </EuiFlexGroup>
      </>
    </SearchConnectorsPageTemplateWrapper>
  );
};
// eslint-disable-next-line import/no-default-export
export { Connectors as default };
