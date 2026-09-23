/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo, useState } from 'react';
import type {
  EuiBasicTableColumn,
  EuiInMemoryTableProps,
  EuiTableSelectionType,
} from '@elastic/eui';
import {
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiCode,
  EuiCodeBlock,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiEmptyPrompt,
  EuiInMemoryTable,
  EuiPopover,
  EuiSpacer,
  EuiToolTip,
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

const QueryPreview: FunctionComponent<{ query: string; viewName: string }> = ({
  query,
  viewName,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <EuiPopover
      aria-label={translations.fullQueryPopover}
      button={
        <button
          type="button"
          aria-label={translations.showFullQueryForView(viewName)}
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

interface ViewRowActionsMenuProps {
  view: EsqlView;
  isEnabled: boolean;
  onDelete: (views: EsqlView[]) => void;
}

const ViewRowActionsMenu: FunctionComponent<ViewRowActionsMenuProps> = ({
  view,
  isEnabled,
  onDelete,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = () => setIsPopoverOpen(false);

  return (
    <EuiPopover
      aria-label={translations.allActions}
      button={
        <EuiToolTip content={translations.allActions} disableScreenReaderOutput>
          <EuiButtonIcon
            aria-label={translations.allActionsForView(view.name)}
            color="text"
            iconType="ellipsis"
            isDisabled={!isEnabled}
            hasAriaDisabled={!isEnabled}
            onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}
            data-test-subj="esqlViewsRowActionsButton"
          />
        </EuiToolTip>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="leftCenter"
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem
            key="delete"
            icon="trash"
            color="danger"
            data-test-subj="esqlViewsDeleteAction"
            onClick={() => {
              closePopover();
              onDelete([view]);
            }}
          >
            {translations.deleteAction}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};

interface EsqlViewsTableProps {
  views: EsqlView[];
  error?: Error;
  isLoading: boolean;
  isDiscoverAvailable: boolean;
  selectedViews: EsqlView[];
  onSelectionChange: (views: EsqlView[]) => void;
  onReload: () => void;
  onDelete: (views: EsqlView[]) => void;
  onOpenInDiscover: (view: EsqlView) => void;
}

export const EsqlViewsTable: FunctionComponent<EsqlViewsTableProps> = ({
  views,
  error,
  isLoading,
  isDiscoverAvailable,
  selectedViews,
  onSelectionChange,
  onReload,
  onDelete,
  onOpenInDiscover,
}) => {
  const [isSearchActive, setIsSearchActive] = useState(false);
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
        render: (query: string, view: EsqlView) => (
          <QueryPreview query={query} viewName={view.name} />
        ),
        'data-test-subj': 'esqlViewsQueryColumn',
      },
      {
        name: translations.actionsColumn,
        width: '120px',
        actions: [
          {
            name: translations.openInDiscoverAction,
            description: translations.openInDiscoverActionDescription,
            type: 'icon',
            icon: 'discoverApp',
            color: 'text',
            enabled: () => isDiscoverAvailable,
            onClick: onOpenInDiscover,
            'data-test-subj': 'esqlViewsOpenInDiscoverAction',
          },
          {
            name: translations.allActions,
            render: (view, isEnabled) => (
              <ViewRowActionsMenu view={view} isEnabled={isEnabled} onDelete={onDelete} />
            ),
          },
        ],
      },
    ],
    [isDiscoverAvailable, onDelete, onOpenInDiscover]
  );

  const selection = useMemo<EuiTableSelectionType<EsqlView>>(
    () => ({
      selected: selectedViews,
      onSelectionChange,
      selectableMessage: () => translations.selectRow,
    }),
    [onSelectionChange, selectedViews]
  );

  const search = useMemo<EuiInMemoryTableProps<EsqlView>['search']>(
    () => ({
      onChange: ({ queryText, error: searchError }) => {
        if (searchError) {
          return false;
        }

        setIsSearchActive(queryText.trim().length > 0);
        return true;
      },
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
      toolsLeft:
        selectedViews.length > 0 ? (
          <EuiButton
            data-test-subj="esqlViewsBulkDeleteButton"
            color="danger"
            iconType="trash"
            onClick={() => onDelete(selectedViews)}
          >
            {translations.bulkDeleteButton(selectedViews.length)}
          </EuiButton>
        ) : undefined,
      toolsRight: (
        <EuiButton
          data-test-subj="esqlViewsReloadButton"
          iconType="refresh"
          isLoading={isLoading}
          onClick={onReload}
        >
          {translations.reloadButton}
        </EuiButton>
      ),
    }),
    [isLoading, onDelete, onReload, selectedViews]
  );

  return (
    <>
      {error && (
        <>
          <EuiCallOut
            announceOnMount
            data-test-subj="esqlViewsReloadError"
            color="danger"
            iconType="warning"
            title={translations.reloadErrorTitle}
          >
            <p>{error.message}</p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}
      <EuiInMemoryTable<EsqlView>
        items={views}
        itemId="name"
        columns={columns}
        loading={isLoading}
        search={search}
        selection={selection}
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
          isSearchActive ? (
            <EuiEmptyPrompt
              data-test-subj="esqlViewsNoSearchResults"
              iconType="magnify"
              title={<h2>{translations.noSearchResultsTitle}</h2>}
            />
          ) : (
            <EuiEmptyPrompt
              iconType="inspect"
              title={<h2>{translations.emptyTitle}</h2>}
              body={<p>{translations.emptyDescription}</p>}
            />
          )
        }
        tableLayout="fixed"
        responsiveBreakpoint={false}
      />
    </>
  );
};
