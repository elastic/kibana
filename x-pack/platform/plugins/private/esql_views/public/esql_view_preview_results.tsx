/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { Suspense } from 'react';
import {
  EuiAccordion,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiNotificationBadge,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import type { EsqlViewPreviewResult } from './use_esql_view_preview';
import { translations } from './translations';

const LazyEsqlDataGrid = React.lazy(async () => {
  const { ESQLDataGrid } = await import('@kbn/esql-datagrid/public');
  return { default: ESQLDataGrid };
});

interface EsqlViewPreviewResultsProps {
  error?: Error;
  hasRun: boolean;
  isLoading: boolean;
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
  result?: EsqlViewPreviewResult;
}

export const EsqlViewPreviewResults: FunctionComponent<EsqlViewPreviewResultsProps> = ({
  error,
  hasRun,
  isLoading,
  isOpen,
  onToggle,
  result,
}) => {
  let content: React.ReactNode;

  if (isLoading) {
    content = (
      <EuiEmptyPrompt
        data-test-subj="esqlViewPreviewLoading"
        icon={<EuiLoadingSpinner size="l" />}
        title={<h4>{translations.previewLoadingTitle}</h4>}
        titleSize="xs"
      />
    );
  } else if (error) {
    content = (
      <EuiCallOut
        announceOnMount
        color="danger"
        data-test-subj="esqlViewPreviewError"
        iconType="warning"
        title={translations.previewErrorTitle}
      >
        <p>{error.message}</p>
      </EuiCallOut>
    );
  } else if (result && result.rows.length > 0) {
    content = (
      <Suspense
        fallback={
          <EuiEmptyPrompt
            data-test-subj="esqlViewPreviewGridLoading"
            icon={<EuiLoadingSpinner size="l" />}
            title={<h4>{translations.previewGridLoadingTitle}</h4>}
            titleSize="xs"
          />
        }
      >
        <LazyEsqlDataGrid
          columns={result.columns}
          controlColumnIds={['openDetails']}
          dataView={result.dataView}
          flyoutType="overlay"
          initialRowHeight={0}
          isTableView
          query={result.query}
          rows={result.rows}
        />
      </Suspense>
    );
  } else {
    const noResults = hasRun && result !== undefined;
    content = (
      <EuiEmptyPrompt
        body={
          <p>
            {noResults
              ? translations.previewNoResultsDescription
              : translations.previewEmptyDescription}
          </p>
        }
        data-test-subj={noResults ? 'esqlViewPreviewNoResults' : 'esqlViewPreviewEmptyPrompt'}
        iconType="search"
        title={
          <h4>{noResults ? translations.previewNoResultsTitle : translations.previewEmptyTitle}</h4>
        }
        titleSize="xs"
      />
    );
  }

  return (
    <EuiAccordion
      buttonContent={
        <EuiTitle size="xxs">
          <h4>{translations.previewResultsTitle}</h4>
        </EuiTitle>
      }
      data-test-subj="esqlViewPreviewResultsAccordion"
      extraAction={
        result ? (
          <EuiNotificationBadge color="subdued" size="m">
            {result.rows.length}
          </EuiNotificationBadge>
        ) : undefined
      }
      forceState={isOpen ? 'open' : 'closed'}
      id="esqlViewPreviewResultsAccordion"
      onToggle={onToggle}
    >
      <EuiSpacer size="s" />
      {content}
    </EuiAccordion>
  );
};
