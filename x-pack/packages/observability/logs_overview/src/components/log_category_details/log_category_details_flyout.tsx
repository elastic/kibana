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
import { StateFrom } from 'xstate5';
import { i18n } from '@kbn/i18n';
import { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { LogCategory } from '../../types';
import { LogCategoryPattern } from '../shared/log_category_pattern';
import { categoryDetailsService } from '../../services/category_details_service';
import {
  LogCategoryDocumentExamplesTable,
  LogCategoryDocumentExamplesTableDependencies,
} from './log_category_document_examples_table';
import { type ResolvedIndexNameLogsSourceConfiguration } from '../../utils/logs_source';
import { LogCategoryDetailsLoadingContent } from './log_category_details_loading_content';
import { LogCategoryDetailsErrorContent } from './log_category_details_error_content';
import { DiscoverLink } from '../discover_link';
import { createCategoryQuery } from '../../services/categorize_logs_service/queries';

export type LogCategoriesFlyoutDependencies = LogCategoryDocumentExamplesTableDependencies;

interface LogCategoryDetailsFlyoutProps {
  onCloseFlyout: () => void;
  logCategory: LogCategory;
  categoryDetailsServiceState: StateFrom<typeof categoryDetailsService>;
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
  categoryDetailsServiceState,
  dependencies,
  logsSource,
  documentFilters,
  timeRange,
}) => {
  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'flyoutTitle',
  });

  const linkFilters = useMemo(() => {
    return [
      ...(documentFilters ? documentFilters.map((filter) => ({ filter })) : []),
      {
        filter: createCategoryQuery(logsSource.messageField)(logCategory.terms),
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
  }, [documentFilters, logCategory.terms, logsSource.messageField]);

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
      <EuiFlyoutBody>
        {categoryDetailsServiceState.matches({ hasCategory: 'fetchingDocuments' }) ? (
          <LogCategoryDetailsLoadingContent
            message={i18n.translate(
              'xpack.observabilityLogsOverview.logCategoryDetailsFlyout.loadingMessage',
              {
                defaultMessage: 'Loading latest documents',
              }
            )}
          />
        ) : categoryDetailsServiceState.matches({ hasCategory: 'error' }) ? (
          <LogCategoryDetailsErrorContent
            title={i18n.translate(
              'xpack.observabilityLogsOverview.logCategoryDetailsFlyout.fetchingDocumentsErrorTitle',
              {
                defaultMessage: 'Failed to fetch documents',
              }
            )}
          />
        ) : (
          <LogCategoryDocumentExamplesTable
            dependencies={dependencies}
            categoryDocuments={categoryDetailsServiceState.context.categoryDocuments}
            logsSource={logsSource}
          />
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
