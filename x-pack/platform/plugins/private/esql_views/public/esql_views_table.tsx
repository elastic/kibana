/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo, useState } from 'react';
import type {
  DefaultItemAction,
  EuiBasicTableColumn,
  EuiInMemoryTableProps,
  EuiTableSelectionType,
} from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiCode,
  EuiCodeBlock,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiEmptyPrompt,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiPopover,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import type { EsqlView } from '@kbn/esql-types';
import { translations } from './translations';

const MAX_QUERY_PREVIEW_LENGTH = 200;

const ViewName: FunctionComponent<{ view: EsqlView }> = ({ view }) => (
  <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
    <EuiFlexItem grow={false}>{view.name}</EuiFlexItem>
    {view.reserved && (
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow" data-test-subj="esqlViewsReservedBadge">
          {translations.reservedBadgeLabel}
        </EuiBadge>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);

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

interface ViewActionsProps {
  view: EsqlView;
  isEnabled: boolean;
  onEdit?: (view: EsqlView) => void;
  onDelete?: (views: EsqlView[]) => void;
}

const ViewActions: FunctionComponent<ViewActionsProps> = ({
  view,
  isEnabled,
  onEdit,
  onDelete,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = () => setIsPopoverOpen(false);
  let actionsLabel = translations.actionsForViewAriaLabel(view.name);
  if (view.reserved) {
    actionsLabel = translations.reservedViewActionsDisabled;
  } else if (!isEnabled) {
    actionsLabel = translations.individualItemActionsDisabled;
  }

  return (
    <EuiPopover
      aria-label={actionsLabel}
      anchorPosition="downRight"
      button={
        <EuiToolTip content={actionsLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            aria-label={actionsLabel}
            color="text"
            data-test-subj="esqlViewsActionsButton"
            iconType="boxesVertical"
            isDisabled={!isEnabled}
            hasAriaDisabled={!isEnabled}
            onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}
          />
        </EuiToolTip>
      }
      closePopover={closePopover}
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel
        items={[
          ...(onEdit
            ? [
                <EuiContextMenuItem
                  data-test-subj="esqlViewsEditButton"
                  icon="pencil"
                  key="edit"
                  onClick={() => {
                    closePopover();
                    onEdit(view);
                  }}
                >
                  {translations.editViewButtonLabel}
                </EuiContextMenuItem>,
              ]
            : []),
          ...(onDelete
            ? [
                <EuiContextMenuItem
                  data-test-subj="esqlViewsDeleteButton"
                  icon="trash"
                  color="danger"
                  key="delete"
                  onClick={() => {
                    closePopover();
                    onDelete([view]);
                  }}
                >
                  {translations.deleteViewButtonLabel}
                </EuiContextMenuItem>,
              ]
            : []),
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
  onEdit?: (view: EsqlView) => void;
  onReload: () => void;
  /** Omitted when the user cannot delete views, which also hides row selection and bulk delete. */
  onDelete?: (views: EsqlView[]) => void;
  onOpenInDiscover: (view: EsqlView) => void;
}

export const EsqlViewsTable: FunctionComponent<EsqlViewsTableProps> = ({
  views,
  error,
  isLoading,
  isDiscoverAvailable,
  selectedViews,
  onSelectionChange,
  onEdit,
  onReload,
  onDelete,
  onOpenInDiscover,
}) => {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [showReservedViews, setShowReservedViews] = useState(true);
  const hasRowActionsMenu = onEdit !== undefined || onDelete !== undefined;
  const visibleViews = useMemo(
    () => (showReservedViews ? views : views.filter(({ reserved }) => !reserved)),
    [showReservedViews, views]
  );
  const columns = useMemo<Array<EuiBasicTableColumn<EsqlView>>>(
    () => [
      {
        field: 'name',
        name: translations.nameColumn,
        render: (_name: string, view: EsqlView) => <ViewName view={view} />,
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
        actions: [
          ...(isDiscoverAvailable
            ? [
                {
                  name: translations.openInDiscoverButtonLabel,
                  description: translations.openInDiscoverButtonTooltip,
                  type: 'icon',
                  icon: 'productDiscover',
                  color: 'text',
                  onClick: onOpenInDiscover,
                  'data-test-subj': 'esqlViewsOpenInDiscoverAction',
                } satisfies DefaultItemAction<EsqlView>,
              ]
            : []),
          ...(hasRowActionsMenu
            ? [
                {
                  enabled: (view: EsqlView) => !view.reserved,
                  render: (view: EsqlView, isEnabled: boolean) => (
                    <ViewActions
                      view={view}
                      isEnabled={isEnabled}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ),
                },
              ]
            : []),
        ],
        width: '120px',
        'data-test-subj': 'esqlViewsActionsColumn',
      },
    ],
    [hasRowActionsMenu, isDiscoverAvailable, onDelete, onEdit, onOpenInDiscover]
  );

  // Selection only exists to bulk delete, so it is hidden along with the delete actions.
  const selection = useMemo<EuiTableSelectionType<EsqlView> | undefined>(
    () =>
      onDelete
        ? {
            selected: selectedViews,
            onSelectionChange,
            selectable: ({ reserved }) => !reserved,
            selectableMessage: (selectable) =>
              selectable ? translations.selectRowAriaLabel : translations.reservedViewNotSelectable,
          }
        : undefined,
    [onDelete, onSelectionChange, selectedViews]
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
      filters: [
        {
          type: 'custom_component',
          component: () => (
            <EuiFilterGroup>
              <EuiFilterButton
                data-test-subj="esqlViewsReservedFilter"
                hasActiveFilters={showReservedViews}
                isSelected={showReservedViews}
                isToggle
                onClick={() => setShowReservedViews((isVisible) => !isVisible)}
              >
                {translations.reservedViewsFilterLabel}
              </EuiFilterButton>
            </EuiFilterGroup>
          ),
        },
      ],
      toolsLeft:
        onDelete && selectedViews.length > 0 ? (
          <EuiButton
            data-test-subj="esqlViewsBulkDeleteButton"
            color="danger"
            iconType="trash"
            onClick={() => onDelete(selectedViews)}
          >
            {translations.bulkDeleteButtonLabel(selectedViews.length)}
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
    [isLoading, onDelete, onReload, selectedViews, showReservedViews]
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
        items={visibleViews}
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
              title={<h2>{translations.emptyTitle}</h2>}
              titleSize="xs"
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
