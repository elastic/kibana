/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSearchBar,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { NEW_INDEX_SELECT_CONNECTOR_PATH } from '../routes';
// import { EnterpriseSearchContentPageTemplate } from '../layout';

import { DefaultSettingsFlyout } from '../settings/default_settings_flyout';

import { ConnectorStats } from './connector_stats';
import { ConnectorsLogic } from './connectors_logic';
import { ConnectorsTable } from './connectors_table';
import { CreateConnector } from './create_connector';
import { DeleteConnectorModal } from './delete_connector_modal';
import { ElasticManagedWebCrawlerEmptyPrompt } from './elastic_managed_web_crawler_empty_prompt';
import { SelfManagedWebCrawlerEmptyPrompt } from './self_managed_web_crawler_empty_prompt';
import { LEARN_MORE_LINK } from './translations';
import { handlePageChange } from './utils';

export const connectorsBreadcrumbs = [
  i18n.translate('xpack.enterpriseSearch.content.connectors.breadcrumb', {
    defaultMessage: 'Connectors',
  }),
];

export const crawlersBreadcrumbs = [
  i18n.translate('xpack.enterpriseSearch.content.crawlers.breadcrumb', {
    defaultMessage: 'Web Crawlers',
  }),
];

export interface ConnectorsProps {
  isCrawler: boolean;
  isCrawlerSelfManaged?: boolean;
}
export const Connectors: React.FC<ConnectorsProps> = ({ isCrawler, isCrawlerSelfManaged }) => {
  const { fetchConnectors, onPaginate, setIsFirstRequest, openDeleteModal } =
    useActions(ConnectorsLogic);
  const { data, isLoading, searchParams, isEmpty, connectors } = useValues(ConnectorsLogic);
  const [searchQuery, setSearchValue] = useState('');
  const [showDefaultSettingsFlyout, setShowDefaultSettingsFlyout] = useState<boolean>(false);

  const {
    services: { application },
  } = useKibana();

  useEffect(() => {
    setIsFirstRequest();
  }, [isCrawler, setIsFirstRequest]);

  useEffect(() => {
    fetchConnectors({ ...searchParams, fetchCrawlersOnly: isCrawler, searchQuery });
  }, [searchParams.from, searchParams.size, searchQuery, isCrawler, fetchConnectors, searchParams]);

  return !isLoading && isEmpty && !isCrawler ? (
    <CreateConnector />
  ) : (
    <>
      <DeleteConnectorModal isCrawler={isCrawler} />
      <>
        {application?.capabilities.hasDefaultIngestPipeline && showDefaultSettingsFlyout && (
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
              <EuiFlexItem>
                <EuiTitle>
                  <h2>
                    {!isCrawler ? (
                      <FormattedMessage
                        id="xpack.enterpriseSearch.connectorsTable.h2.availableConnectorsLabel"
                        defaultMessage="Available connectors"
                      />
                    ) : (
                      <FormattedMessage
                        id="xpack.enterpriseSearch.connectorsTable.h2.availableCrawlersLabel"
                        defaultMessage="Available web crawlers"
                      />
                    )}
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiSearchBar
                  query={searchQuery}
                  box={{
                    incremental: true,
                    placeholder: !isCrawler
                      ? i18n.translate(
                          'xpack.enterpriseSearch.connectorsTable.euiSearchBar.filterConnectorsPlaceholder',
                          { defaultMessage: 'Filter connectors' }
                        )
                      : i18n.translate(
                          'xpack.enterpriseSearch.connectorsTable.euiSearchBar.filterCrawlersPlaceholder',
                          { defaultMessage: 'Filter web crawlers' }
                        ),
                  }}
                  aria-label={
                    !isCrawler
                      ? i18n.translate(
                          'xpack.enterpriseSearch.connectorsTable.euiSearchBar.filterConnectorsLabel',
                          { defaultMessage: 'Filter connectors' }
                        )
                      : i18n.translate(
                          'xpack.enterpriseSearch.connectorsTable.euiSearchBar.filterCrawlersLabel',
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
    </>
  );
};
