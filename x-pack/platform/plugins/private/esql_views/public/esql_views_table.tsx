/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo, useState } from 'react';
import type { EuiBasicTableColumn, EuiInMemoryTableProps } from '@elastic/eui';
import {
  EuiButton,
  EuiCode,
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiInMemoryTable,
  EuiPopover,
} from '@elastic/eui';
import type { EsqlView } from '@kbn/esql-types';
import { translations } from './translations';

const MAX_QUERY_PREVIEW_LENGTH = 200;

export const getQueryPreview = (query: string): string => {
  const normalizedQuery = query.replace(/\s+/g, ' ').trim();
  return normalizedQuery.length > MAX_QUERY_PREVIEW_LENGTH
    ? `${normalizedQuery.slice(0, MAX_QUERY_PREVIEW_LENGTH)}…`
    : normalizedQuery;
};

const QueryPreview: FunctionComponent<{ query: string }> = ({ query }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <EuiPopover
      aria-label={translations.showFullQuery}
      button={
        <button
          type="button"
          aria-label={translations.showFullQuery}
          data-test-subj="esqlViewsQueryCell"
          onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}
          css={{
            appearance: 'none',
            background: 'none',
            border: 0,
            cursor: 'pointer',
            display: 'block',
            maxWidth: '100%',
            padding: 0,
            textAlign: 'left',
          }}
        >
          <EuiCode
            transparentBackground
            css={{
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {getQueryPreview(query)}
          </EuiCode>
        </button>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      anchorPosition="downLeft"
      panelPaddingSize="s"
    >
      <EuiCodeBlock
        language="esql"
        fontSize="s"
        paddingSize="s"
        isCopyable
        data-test-subj="esqlViewsQueryPopover"
        css={{ maxWidth: '480px' }}
      >
        {query}
      </EuiCodeBlock>
    </EuiPopover>
  );
};

interface EsqlViewsTableProps {
  views: EsqlView[];
  onReload: () => void;
}

export const EsqlViewsTable: FunctionComponent<EsqlViewsTableProps> = ({ views, onReload }) => {
  const columns = useMemo<Array<EuiBasicTableColumn<EsqlView>>>(
    () => [
      {
        field: 'name',
        name: translations.nameColumn,
        sortable: true,
        width: '20em',
        'data-test-subj': 'esqlViewsNameColumn',
      },
      {
        field: 'description',
        name: translations.descriptionColumn,
        sortable: true,
        truncateText: true,
        width: '24em',
        'data-test-subj': 'esqlViewsDescriptionColumn',
      },
      {
        field: 'query',
        name: translations.queryColumn,
        render: (query: string) => <QueryPreview query={query} />,
        'data-test-subj': 'esqlViewsQueryColumn',
      },
    ],
    []
  );

  const search = useMemo<EuiInMemoryTableProps<EsqlView>['search']>(
    () => ({
      box: {
        incremental: true,
        placeholder: translations.searchPlaceholder,
        'data-test-subj': 'esqlViewsSearch',
        schema: {
          fields: {
            name: { type: 'string' },
            description: { type: 'string' },
            query: { type: 'string' },
          },
        },
      },
      toolsRight: (
        <EuiButton data-test-subj="esqlViewsReloadButton" iconType="refresh" onClick={onReload}>
          {translations.reloadButton}
        </EuiButton>
      ),
    }),
    [onReload]
  );

  return (
    <EuiInMemoryTable<EsqlView>
      items={views}
      itemId="name"
      columns={columns}
      search={search}
      sorting={{
        sort: {
          field: 'name',
          direction: 'asc',
        },
      }}
      pagination={{
        initialPageSize: 10,
        pageSizeOptions: [10, 25, 50],
      }}
      rowHeader="name"
      data-test-subj="esqlViewsTable"
      tableCaption={translations.tableCaption}
      noItemsMessage={
        <EuiEmptyPrompt
          iconType="inspect"
          title={<h2>{translations.emptyTitle}</h2>}
          body={<p>{translations.emptyDescription}</p>}
        />
      }
      tableLayout="fixed"
      responsiveBreakpoint={false}
    />
  );
};
