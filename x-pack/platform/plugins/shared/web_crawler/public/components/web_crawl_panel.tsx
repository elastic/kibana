/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { MouseEvent } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  INDEX_MANAGEMENT_LOCATOR_ID,
  type IndexManagementLocatorParams,
} from '@kbn/index-management-shared-types';
import type { WebCrawl } from '../../common/types';
import { useWebCrawlerConfig, useWebCrawlerServices, useTelemetryId } from '../context';
import { useWebCrawl } from '../hooks/use_web_crawl';
import { WebCrawlForm } from './web_crawl_form';

const getStatusMessage = ({ status, documentsCount, url, error }: WebCrawl) => {
  switch (status) {
    case 'running':
      return i18n.translate('xpack.webCrawler.panel.status.running', {
        defaultMessage:
          'Crawling {url}: {documentsCount, plural, one {# page} other {# pages}} indexed so far.',
        values: { url, documentsCount },
      });
    case 'completed':
      return i18n.translate('xpack.webCrawler.panel.status.completed', {
        defaultMessage:
          'Crawled {url}: {documentsCount, plural, one {# page} other {# pages}} indexed.',
        values: { url, documentsCount },
      });
    case 'canceled':
      return i18n.translate('xpack.webCrawler.panel.status.canceled', {
        defaultMessage:
          'Stopped crawling {url}: {documentsCount, plural, one {# page} other {# pages}} indexed.',
        values: { url, documentsCount },
      });
    case 'failed':
      return i18n.translate('xpack.webCrawler.panel.status.failed', {
        defaultMessage:
          'Crawling {url} failed after {documentsCount, plural, one {# page} other {# pages}}: {error}',
        values: { url, documentsCount, error: error ?? '' },
      });
  }
};

const STATUS_ICONS = {
  completed: { type: 'checkInCircleFilled', color: 'success' },
  canceled: { type: 'minusInCircle', color: 'subdued' },
  failed: { type: 'warning', color: 'danger' },
} as const;

export const WebCrawlPanel = () => {
  const { share } = useWebCrawlerServices();
  const { onManageWebCrawls } = useWebCrawlerConfig();
  const getTelemetryId = useTelemetryId();
  const { crawl, startCrawl, isStarting, startErrorMessage } = useWebCrawl();

  const indexLocator = share.url.locators.get<IndexManagementLocatorParams>(
    INDEX_MANAGEMENT_LOCATOR_ID
  );
  const indexLocatorParams: IndexManagementLocatorParams | undefined = crawl && {
    page: 'index_details',
    indexName: crawl.indexName,
  };

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="webCrawl">
      <WebCrawlForm
        onSubmit={startCrawl}
        isStarting={isStarting}
        errorMessage={startErrorMessage}
      />
      {crawl && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup
            alignItems="center"
            gutterSize="s"
            responsive={false}
            data-test-subj="webCrawlStatus"
          >
            <EuiFlexItem grow={false}>
              {crawl.status === 'running' ? (
                <EuiLoadingSpinner size="s" />
              ) : (
                <EuiIcon {...STATUS_ICONS[crawl.status]} aria-hidden />
              )}
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs" role="status">
                {getStatusMessage(crawl)}{' '}
                <EuiLink
                  href={indexLocatorParams && indexLocator?.getRedirectUrl(indexLocatorParams)}
                  onClick={(event: MouseEvent) => {
                    if (indexLocator && indexLocatorParams) {
                      event.preventDefault();
                      indexLocator.navigate(indexLocatorParams);
                    }
                  }}
                  data-test-subj="webCrawlIndexLink"
                  data-telemetry-id={getTelemetryId('webCrawl-openIndex')}
                >
                  {crawl.indexName}
                </EuiLink>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
      {onManageWebCrawls && (
        <>
          <EuiSpacer size="s" />
          <EuiButtonEmpty
            size="xs"
            flush="left"
            iconType="gear"
            onClick={onManageWebCrawls}
            data-test-subj="webCrawlManage"
            data-telemetry-id={getTelemetryId('webCrawl-manage')}
          >
            {i18n.translate('xpack.webCrawler.panel.manage', {
              defaultMessage: 'Manage and schedule crawls',
            })}
          </EuiButtonEmpty>
        </>
      )}
    </EuiPanel>
  );
};
