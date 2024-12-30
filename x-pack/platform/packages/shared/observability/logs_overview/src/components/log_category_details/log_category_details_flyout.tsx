/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { css } from '@emotion/react';
import { FilterStateStore, buildCustomFilter } from '@kbn/es-query';
import { LogCategory } from '../../types';
import { LogCategoryPattern } from '../shared/log_category_pattern';
import {
  LogCategoryDocumentExamplesTable,
  LogCategoryDocumentExamplesTableDependencies,
} from './log_category_document_examples_table';
import { type ResolvedIndexNameLogsSourceConfiguration } from '../../utils/logs_source';
import { DiscoverLink, DiscoverLinkDependencies } from '../discover_link';
import { createCategoryQuery } from '../../services/categorize_logs_service/queries';

export type LogCategoriesFlyoutDependencies = LogCategoryDocumentExamplesTableDependencies &
  DiscoverLinkDependencies;

const flyoutBodyCss = css`
  .euiFlyoutBody__overflowContent {
    height: 100%;
  }
`;

interface LogCategoryDetailsFlyoutProps {
  onCloseFlyout: () => void;
  logCategory: LogCategory;
  dependencies: LogCategoriesFlyoutDependencies;
  logsSource: ResolvedIndexNameLogsSourceConfiguration;
  documentFilters?: QueryDslQueryContainer[];
  timeRange: {
    start: string;
    end: string;
  };
}

export const LogCategoryDetailsFlyout: React.FC<LogCategoryDetailsFlyoutProps> = ({
  onCloseFlyout,
  logCategory,
  dependencies,
  logsSource,
  documentFilters,
  timeRange,
}) => {
  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'flyoutTitle',
  });

  const categoryFilter = useMemo(() => {
    return createCategoryQuery(logsSource.messageField)(logCategory.terms);
  }, [logCategory.terms, logsSource.messageField]);

  const documentAndCategoryFilters = useMemo(() => {
    return [...(documentFilters ?? []), categoryFilter];
  }, [categoryFilter, documentFilters]);

  const linkFilters = useMemo(() => {
    return [
      ...(documentFilters ? documentFilters.map((filter) => ({ filter })) : []),
      {
        filter: categoryFilter,
        meta: {
          name: i18n.translate(
            'xpack.observabilityLogsOverview.logCategoryDetailsFlyout.discoverLinkFilterName',
            {
              defaultMessage: 'Category: {terms}',
              values: {
                terms: logCategory.terms,
              },
            }
          ),
        },
      },
    ];
  }, [categoryFilter, documentFilters, logCategory.terms]);

  const filters = useMemo(() => {
    return documentAndCategoryFilters.map((filter) =>
      buildCustomFilter(
        logsSource.indexName,
        filter,
        false,
        false,
        'Document filters',
        FilterStateStore.APP_STATE
      )
    );
  }, [documentAndCategoryFilters, logsSource.indexName]);

  return (
    <EuiFlyout ownFocus onClose={() => onCloseFlyout()} aria-labelledby={flyoutTitleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id={flyoutTitleId}>
                <FormattedMessage
                  id="xpack.observabilityLogsOverview.logCategoryDetailsFlyout.title"
                  defaultMessage="Category details"
                />
              </h2>
            </EuiTitle>
            <EuiSpacer size="s" />
            <LogCategoryPattern logCategory={logCategory} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <DiscoverLink
              dependencies={dependencies}
              timeRange={timeRange}
              logsSource={logsSource}
              documentFilters={linkFilters}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody css={flyoutBodyCss}>
        <LogCategoryDocumentExamplesTable
          dependencies={dependencies}
          logsSource={logsSource}
          filters={filters}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
