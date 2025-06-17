/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiPopover,
  EuiSearchBar,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

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
import { LEARN_MORE_LINK } from './translations';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';
import { useBreadcrumbs } from '../../utils/use_breadcrumbs';
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
  const [showMoreOptionsPopover, setShowMoreOptionsPopover] = useState<boolean>(false);
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

  return !isLoading && isEmpty && !isCrawler ? (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <CreateConnector />
    </Suspense>
  ) : (
    <SearchConnectorsPageTemplateWrapper
      isLoading={isLoading}
      pageHeader={{
        pageTitle: !isCrawler
          ? i18n.translate('xpack.contentConnectors.title', {
              defaultMessage: 'Content connectors',
            })
          : i18n.translate('xpack.contentConnectors.crawlers.title', {
              defaultMessage: 'Elastic Web Crawler',
            }),
        description: [
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.contentConnectors.webcrawlers.headerContent"
                defaultMessage="Discover extract and index searchable content from websites and knowledge bases {learnMoreLink}"
                values={{
                  learnMoreLink: (
                    <EuiLink
                      data-test-subj="entSearchContentConnectorsLearnMoreLink"
                      external
                      target="_blank"
                      href={'https://github.com/elastic/crawler'}
                    >
                      {LEARN_MORE_LINK}
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiText>,
        ],
        rightSideGroupProps: {
          gutterSize: 's',
          responsive: false,
        },
        rightSideItems: isLoading
          ? []
          : !isCrawler
          ? [
              <EuiFlexGroup gutterSize="xs">
                <EuiFlexItem>
                  <EuiButton
                    data-test-subj="entSearchContent-connectors-newConnectorButton"
                    data-telemetry-id="entSearchContent-connectors-newConnectorButton"
                    key="newConnector"
                    color="primary"
                    iconType="plusInCircle"
                    fill
                    onClick={() => {
                      const url = application?.getUrlForApp('management', {
                        path: `/data/content_connectors`,
                      });
                      application?.navigateToUrl(`${url}${NEW_INDEX_SELECT_CONNECTOR_PATH}`);
                    }}
                  >
                    <FormattedMessage
                      id="xpack.contentConnectors.connectors.newConnectorButtonLabel"
                      defaultMessage="New Connector"
                    />
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiPopover
                    isOpen={showMoreOptionsPopover}
                    closePopover={() => setShowMoreOptionsPopover(false)}
                    button={
                      <EuiButtonIcon
                        data-test-subj="entSearchContent-connectors-newConnector-moreOptionsButton"
                        data-telemetry-id="entSearchContent-connectors-newConnector-moreOptionsButton"
                        color="primary"
                        display="fill"
                        size="m"
                        iconType="boxesVertical"
                        aria-label={i18n.translate(
                          'xpack.enterpriseSearch.connectors.more.ariaLabel',
                          { defaultMessage: 'More options' }
                        )}
                        onClick={() => setShowMoreOptionsPopover(!showMoreOptionsPopover)}
                      />
                    }
                  >
                    <EuiContextMenuPanel
                      size="s"
                      items={[
                        <EuiContextMenuItem
                          size="s"
                          key="newConnectorNative"
                          onClick={() => {
                            const url = application?.getUrlForApp('management', {
                              path: `/data/content_connectors`,
                            });
                            application?.navigateToUrl(
                              `${url}${NEW_INDEX_SELECT_CONNECTOR_NATIVE_PATH}`
                            );
                          }}
                          icon="plusInCircle"
                        >
                          {i18n.translate(
                            'xpack.enterpriseSearch.connectors.newNativeConnectorButtonLabel',
                            {
                              defaultMessage: 'New Elastic managed Connector',
                            }
                          )}
                        </EuiContextMenuItem>,
                        <EuiContextMenuItem
                          size="s"
                          key="newConnectorClient"
                          icon="plusInCircle"
                          onClick={() => {
                            const url = application?.getUrlForApp('management', {
                              path: `/data/content_connectors`,
                            });
                            application?.navigateToUrl(
                              `${url}${NEW_INDEX_SELECT_CONNECTOR_CLIENTS_PATH}`
                            );
                          }}
                        >
                          {i18n.translate(
                            'xpack.enterpriseSearch.connectors.newConnectorsClientButtonLabel',
                            { defaultMessage: 'New Self-managed Connector' }
                          )}
                        </EuiContextMenuItem>,
                      ]}
                    />
                  </EuiPopover>
                </EuiFlexItem>
              </EuiFlexGroup>,
              ...[
                <EuiButton
                  color="primary"
                  data-test-subj="entSearchContent-searchIndices-defaultSettings"
                  onClick={() => setShowDefaultSettingsFlyout(true)}
                >
                  {i18n.translate('xpack.contentConnectors.content.searchIndices.defaultSettings', {
                    defaultMessage: 'Default settings',
                  })}
                </EuiButton>,
              ],
            ]
          : undefined,
      }}
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
              <EuiFlexItem>
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
              <EuiFlexItem>
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
