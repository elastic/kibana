/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { IUiSettingsClient } from '@kbn/core/public';
import { useHistory } from 'react-router-dom';
import {
  type TableListViewFindItemsFn,
  ContentListClientProvider,
} from '@kbn/content-list-provider-client';
import type {
  ContentListFeatures,
  ContentListItem,
  ContentListItemConfig,
} from '@kbn/content-list-provider';
import type { ContentClient } from '@kbn/content-management-plugin/public';
import { ContentListTable } from '@kbn/content-list-table';
import { ContentListToolbar } from '@kbn/content-list-toolbar';
import { ContentListFooter } from '@kbn/content-list-footer';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { GraphSearchIn, GraphSearchOut } from '../../../common/content_management';
import { CONTENT_ID } from '../../../common/content_management';
import { getEditPath, getEditUrl } from '../../services/url';
import { deleteSavedWorkspace } from '../../helpers/saved_workspace_utils';
import type { GraphEmptyPromptProps } from './empty_prompt';
import { GraphEmptyPrompt } from './empty_prompt';

const { Column, Action } = ContentListTable;

/** Singular/plural labels surfaced in the toolbar selection bar and footer. */
const labels = {
  entity: i18n.translate('xpack.graph.listing.table.entityName', {
    defaultMessage: 'graph',
  }),
  entityPlural: i18n.translate('xpack.graph.listing.table.entityNamePlural', {
    defaultMessage: 'graphs',
  }),
};

/**
 * Props for `GraphContentList`.
 *
 * Extends {@link GraphEmptyPromptProps} so the listing route can forward
 * `sampleDataUrl`, `onCreateGraph`, and `canSave` directly.
 */
export interface GraphContentListProps extends GraphEmptyPromptProps {
  /** Accessible title used as the table caption. */
  title: string;
  /** Initial search text to populate on mount. */
  initialFilter?: string;
  /** UI settings accessor for reading defaults like page size. */
  uiSettings: IUiSettingsClient;
  /** Content client for fetching and deleting graphs. */
  contentClient: ContentClient;
  /** Prepends the Kibana base path to a URL. */
  addBasePath: (url: string) => string;
  /** Whether the user can delete graphs. */
  canDelete: boolean;
}

/**
 * Composes the Content List UI for graph workspaces.
 *
 * Wraps {@link ContentListClientProvider} with graph-specific data fetching,
 * item actions (edit/delete), and the {@link GraphEmptyPrompt} empty state.
 * The toolbar, table, and footer are laid out vertically inside an
 * `EuiFlexGroup`.
 */
export const GraphContentList = ({
  title,
  initialFilter,
  uiSettings,
  contentClient,
  addBasePath,
  canDelete,
  canSave,
  ...emptyPromptProps
}: GraphContentListProps) => {
  const history = useHistory();

  const listingLimit = uiSettings.get<number>('savedObjects:listingLimit');

  /** Fetches graph workspaces via the content management API, respecting `listingLimit`. */
  const findItems: TableListViewFindItemsFn = useCallback(
    (search: string) =>
      contentClient
        .search<GraphSearchIn, GraphSearchOut>({
          contentTypeId: CONTENT_ID,
          query: { text: search ? `${search}*` : '', limit: listingLimit },
        })
        .then(({ hits, pagination }) => ({
          total: pagination.total,
          hits: hits.map(({ id, updatedAt, references, type, attributes }) => ({
            id,
            updatedAt: updatedAt!,
            references,
            type,
            attributes: {
              title: attributes.title,
              description: attributes.description,
            },
          })),
        })),
    [contentClient, listingLimit]
  );

  const getHref = useCallback(
    ({ id }: ContentListItem) => getEditUrl(addBasePath, { id }),
    [addBasePath]
  );

  const onEditItem = useCallback(
    ({ id }: ContentListItem) => history.push(getEditPath({ id })),
    [history]
  );

  const onDeleteItems = useCallback(
    async (items: ContentListItem[]) => {
      await deleteSavedWorkspace(
        contentClient,
        items.map(({ id }) => id)
      );
    },
    [contentClient]
  );

  /** Per-item config: link targets and capability-gated edit/delete handlers. */
  const item: ContentListItemConfig = useMemo(
    () => ({
      getHref,
      getEditUrl: canSave ? getHref : undefined,
      onEdit: canSave ? onEditItem : undefined,
      onDelete: canDelete ? onDeleteItems : undefined,
    }),
    [getHref, canSave, onEditItem, onDeleteItems, canDelete]
  );

  /** Feature flags for the Content List provider (search and default sort). */
  const features: ContentListFeatures = useMemo(
    () => ({
      search: initialFilter ? { initialSearch: initialFilter } : true,
      sorting: {
        initialSort: { field: 'updatedAt', direction: 'desc' },
      },
    }),
    [initialFilter]
  );

  const emptyState = useMemo(
    () => <GraphEmptyPrompt canSave={canSave} {...emptyPromptProps} />,
    [canSave, emptyPromptProps]
  );

  return (
    <ContentListClientProvider
      id="graph"
      isReadOnly={!canSave}
      {...{ labels, features, findItems, item }}
      services={{ uiSettings }}
    >
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <ContentListToolbar />
        </EuiFlexItem>
        <EuiFlexItem>
          <ContentListTable title={title} emptyState={emptyState}>
            <Column.Name showDescription />
            <Column.UpdatedAt />
            <Column.Actions>
              {canSave && <Action.Edit />}
              {canDelete && <Action.Delete />}
            </Column.Actions>
          </ContentListTable>
        </EuiFlexItem>
        <EuiFlexItem>
          <ContentListFooter />
        </EuiFlexItem>
      </EuiFlexGroup>
    </ContentListClientProvider>
  );
};
