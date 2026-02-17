/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiPanel } from '@elastic/eui';

import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { type DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';

import { useAppContext } from '../../../../../app_context';
import { DEFAULT_DOCUMENT_PAGE_SIZE } from '../../../../../../../common/constants';

export interface RecentDocsActionMessageProps {
  indexName: string;
}

export const RecentDocsActionMessage: React.FC<RecentDocsActionMessageProps> = ({ indexName }) => {
  const { url } = useAppContext();

  const discoverLocator = url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);

  const onClick = async () => {
    await discoverLocator?.navigate({ dataViewSpec: { title: indexName } });
  };

  return (
    <EuiPanel hasBorder={false} hasShadow={false} color="subdued" borderRadius="none">
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiIcon aria-hidden={true} type="calendar" />
        </EuiFlexItem>
        <EuiFlexItem>
          <p>
            {i18n.translate('xpack.idxMgmt.indexDetails.recentDocsActionMessage', {
              defaultMessage:
                'You are viewing the {pageSize} most recently ingested documents in this index. To see all documents, view in',
              values: {
                pageSize: DEFAULT_DOCUMENT_PAGE_SIZE,
              },
            })}{' '}
            <EuiLink onClick={onClick}>
              {i18n.translate('xpack.idxMgmt.indexDetails.recentDocsActionMessageLink', {
                defaultMessage: 'Discover.',
              })}
            </EuiLink>
          </p>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
