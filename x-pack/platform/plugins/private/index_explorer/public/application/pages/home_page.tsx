/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiDescriptionList,
  EuiInMemoryTable,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { IndexKind, IndexSummary, MetadataResponse } from '../../../common/types';
import { AppButton, AppLink } from '../components/app_link';
import { ErrorCallout } from '../components/error_callout';
import { PageLayout } from '../components/page_layout';
import { cannedQueryPath, indexPath, queryPath } from '../lib/paths';
import { useServices } from '../services';
import { i18nTexts } from '../translations';

const KIND_COLORS: Record<IndexKind, string> = {
  index: 'default',
  data_stream: 'primary',
  alias: 'accent',
};

/** Landing page listing indices, data streams, aliases and canned queries. */
export function HomePage({ metadata }: { metadata: MetadataResponse }) {
  const { api } = useServices();
  const [includeHidden, setIncludeHidden] = useState(false);
  const { value, error, loading } = useAsync(
    () => api.listIndices(includeHidden),
    [api, includeHidden]
  );

  const columns: Array<EuiBasicTableColumn<IndexSummary>> = [
    {
      field: 'name',
      name: i18nTexts.nameColumn,
      sortable: true,
      render: (name: string, { title }: IndexSummary) => (
        <AppLink path={indexPath(name)} data-test-subj="indexExplorerIndexLink">
          {title ? `${title} (${name})` : name}
        </AppLink>
      ),
    },
    {
      field: 'kind',
      name: i18nTexts.kindColumn,
      sortable: true,
      width: '140px',
      render: (kind: IndexKind) => (
        <EuiBadge color={KIND_COLORS[kind]}>{i18nTexts.kinds[kind]}</EuiBadge>
      ),
    },
    {
      field: 'docsCount',
      name: i18nTexts.docsCountColumn,
      sortable: true,
      align: 'right',
      width: '160px',
      render: (docsCount?: number) => (docsCount === undefined ? '' : docsCount.toLocaleString()),
    },
    {
      field: 'description',
      name: i18nTexts.descriptionColumn,
      render: (description?: string) => description ?? '',
    },
  ];

  return (
    <PageLayout
      title={metadata.title ?? i18nTexts.appTitle}
      documentTitle={metadata.title ?? i18nTexts.appTitle}
      description={metadata.description ?? i18nTexts.appDescription}
      breadcrumbs={[]}
      rightSideItems={[
        <AppButton
          fill
          iconType="editorCodeBlock"
          path={queryPath()}
          key="query"
          data-test-subj="indexExplorerNewQuery"
        >
          {i18nTexts.runEsqlQuery}
        </AppButton>,
      ]}
    >
      {metadata.queries.length > 0 ? (
        <>
          <EuiTitle size="s">
            <h2>{i18nTexts.cannedQueriesTitle}</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiDescriptionList
            data-test-subj="indexExplorerCannedQueries"
            listItems={metadata.queries.map(({ id, title, description }) => ({
              title: <AppLink path={cannedQueryPath(id)}>{title}</AppLink>,
              description: description ?? '',
            }))}
          />
          <EuiSpacer size="l" />
        </>
      ) : null}
      <EuiTitle size="s">
        <h2>{i18nTexts.indicesTitle}</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      {error ? (
        <ErrorCallout title={i18nTexts.loadIndicesError} error={error} />
      ) : (
        <EuiInMemoryTable<IndexSummary>
          tableCaption={i18nTexts.indicesTitle}
          items={value?.indices ?? []}
          itemId="name"
          columns={columns}
          loading={loading}
          search={{
            box: { incremental: true, placeholder: i18nTexts.filterIndicesPlaceholder },
            toolsRight: (
              <EuiSwitch
                label={i18nTexts.includeHidden}
                checked={includeHidden}
                onChange={(event) => setIncludeHidden(event.target.checked)}
                data-test-subj="indexExplorerIncludeHidden"
              />
            ),
          }}
          pagination={{ initialPageSize: 50, pageSizeOptions: [25, 50, 100] }}
          sorting={{ sort: { field: 'name', direction: 'asc' } }}
          noItemsMessage={
            <EuiText size="s">{loading ? i18nTexts.loading : i18nTexts.noIndices}</EuiText>
          }
          data-test-subj="indexExplorerIndicesTable"
        />
      )}
    </PageLayout>
  );
}
