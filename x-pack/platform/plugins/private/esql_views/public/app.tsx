/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiCode,
  EuiCodeBlock,
  EuiConfirmModal,
  EuiLink,
  EuiPopover,
  EuiSpacer,
  EuiInMemoryTable,
  useGeneratedHtmlId,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { mockEsqlViews, type EsqlView } from './mock_views';
import {
  CreateEditEsqlViewFlyout,
  type CreateEditEsqlViewFlyoutProps,
} from './create_edit_view_flyout';
import { deleteView } from './services/views_client';
import { getAllLocalViewMetadata, removeLocalViewMetadata } from './services/local_metadata';

export interface EsqlViewsAppProps {
  notifications: NotificationsStart;
  http: HttpStart;
  data: DataPublicPluginStart;
  share: SharePluginStart;
  /**
   * Lets prototype versions (see `versioned_app.tsx`) swap in an alternate take on the
   * create/edit flyout while reusing this table/list page as-is. Defaults to the V1 flyout.
   */
  FlyoutComponent?: React.FunctionComponent<CreateEditEsqlViewFlyoutProps>;
}

interface FlyoutState {
  mode: 'create' | 'edit';
  view?: EsqlView;
}

const truncatedQueryStyle = css`
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
`;

// Renders the query as a single truncated line; clicking it reveals the full query in a
// popover so the table stays scannable while keeping the whole query easily accessible.
const TruncatedQuery: React.FunctionComponent<{ query: string }> = ({ query }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <EuiPopover
      button={
        <EuiCode
          transparentBackground
          css={truncatedQueryStyle}
          onClick={() => setIsPopoverOpen((open) => !open)}
          data-test-subj="esqlViewsQueryCell"
        >
          {query}
        </EuiCode>
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
        css={css`
          max-width: 480px;
        `}
        isCopyable
      >
        {query}
      </EuiCodeBlock>
    </EuiPopover>
  );
};

// Merges the illustrative seed rows with anything created/edited in this browser (cached in
// localStorage, see `services/local_metadata.ts`), so views created via the real `_query/view`
// API don't just disappear from the table on refresh.
const buildInitialViews = (): EsqlView[] => {
  const localMetadata = getAllLocalViewMetadata();

  const seeded = mockEsqlViews.map((view) => {
    const local = localMetadata[view.name];
    return local ? { ...view, ...local } : view;
  });

  const seededNames = new Set(seeded.map((view) => view.name));
  const createdElsewhere = Object.entries(localMetadata)
    .filter(([name]) => !seededNames.has(name))
    .map(([name, metadata]) => ({
      name,
      description: metadata.description ?? '',
      query: metadata.query ?? '',
      source: metadata.query ? getIndexPatternFromESQLQuery(metadata.query) : '',
      createdBy: metadata.createdBy ?? '',
      lastUpdated: metadata.lastUpdated ?? '',
    }));

  return [...seeded, ...createdElsewhere];
};

export const EsqlViewsApp: React.FunctionComponent<EsqlViewsAppProps> = ({
  notifications,
  http,
  data,
  share,
  FlyoutComponent = CreateEditEsqlViewFlyout,
}) => {
  const discoverLocator = share.url.locators.get(DISCOVER_APP_LOCATOR);
  const [views, setViews] = useState<EsqlView[]>(buildInitialViews);
  const [flyoutState, setFlyoutState] = useState<FlyoutState | null>(null);
  const [selectedItems, setSelectedItems] = useState<EsqlView[]>([]);
  const [viewsPendingDelete, setViewsPendingDelete] = useState<EsqlView[] | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteModalTitleId = useGeneratedHtmlId({ prefix: 'esqlViewsDeleteModalTitle' });

  const openCreateFlyout = useCallback(() => setFlyoutState({ mode: 'create' }), []);
  const openEditFlyout = useCallback(
    (view: EsqlView) => setFlyoutState({ mode: 'edit', view }),
    []
  );
  const closeFlyout = useCallback(() => setFlyoutState(null), []);

  const handleFlyoutSaved = useCallback((savedView: EsqlView) => {
    setViews((prev) => {
      const index = prev.findIndex((view) => view.name === savedView.name);
      if (index === -1) {
        return [...prev, savedView];
      }
      const next = [...prev];
      next[index] = savedView;
      return next;
    });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!viewsPendingDelete || viewsPendingDelete.length === 0) {
      return;
    }
    setIsDeleting(true);

    const results = await Promise.allSettled(
      viewsPendingDelete.map(async (view) => {
        await deleteView(http, view.name);
        removeLocalViewMetadata(view.name);
        return view.name;
      })
    );

    const deletedNames = new Set(
      results
        .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
        .map((result) => result.value)
    );
    const failedCount = results.length - deletedNames.size;

    if (deletedNames.size > 0) {
      setViews((prev) => prev.filter((view) => !deletedNames.has(view.name)));
      setSelectedItems((prev) => prev.filter((view) => !deletedNames.has(view.name)));
      notifications.toasts.addSuccess(
        deletedNames.size === 1
          ? i18n.translate('esqlViews.deleteModal.successToast', {
              defaultMessage: 'View "{name}" was deleted.',
              values: { name: [...deletedNames][0] },
            })
          : i18n.translate('esqlViews.deleteModal.bulkSuccessToast', {
              defaultMessage: '{count} views were deleted.',
              values: { count: deletedNames.size },
            })
      );
    }

    if (failedCount > 0) {
      notifications.toasts.addDanger(
        viewsPendingDelete.length === 1
          ? i18n.translate('esqlViews.deleteModal.errorToast', {
              defaultMessage: 'Failed to delete view "{name}"',
              values: { name: viewsPendingDelete[0].name },
            })
          : i18n.translate('esqlViews.deleteModal.bulkErrorToast', {
              defaultMessage: 'Failed to delete {count} views.',
              values: { count: failedCount },
            })
      );
    }

    setIsDeleting(false);
    setViewsPendingDelete(null);
  }, [http, notifications, viewsPendingDelete]);

  const menu = useMemo(
    () => ({
      primaryActionItem: {
        id: 'createEsqlView',
        label: i18n.translate('esqlViews.createButtonLabel', { defaultMessage: 'Create view' }),
        iconType: '',
        run: openCreateFlyout,
        testId: 'esqlViewsCreateButton',
      },
    }),
    [openCreateFlyout]
  );

  const columns: Array<EuiBasicTableColumn<EsqlView>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.translate('esqlViews.table.nameColumn', { defaultMessage: 'Name' }),
        sortable: true,
        render: (name: string, item: EsqlView) => (
          <EuiLink onClick={() => openEditFlyout(item)} data-test-subj="esqlViewsNameLink">
            {name}
          </EuiLink>
        ),
      },
      {
        field: 'description',
        name: i18n.translate('esqlViews.table.descriptionColumn', {
          defaultMessage: 'Description',
        }),
      },
      {
        field: 'query',
        name: i18n.translate('esqlViews.table.queryColumn', { defaultMessage: 'Query' }),
        width: '30%',
        render: (query: string) => <TruncatedQuery query={query} />,
      },
      {
        field: 'lastUpdated',
        name: i18n.translate('esqlViews.table.lastUpdatedColumn', {
          defaultMessage: 'Last updated',
        }),
        sortable: true,
        width: '160px',
        render: (lastUpdated: string) =>
          lastUpdated ? <FormattedRelative value={new Date(lastUpdated)} /> : null,
      },
      {
        name: i18n.translate('esqlViews.table.actionsColumn', { defaultMessage: 'Actions' }),
        width: '120px',
        actions: [
          {
            name: i18n.translate('esqlViews.table.editAction', { defaultMessage: 'Edit' }),
            description: i18n.translate('esqlViews.table.editActionDescription', {
              defaultMessage: 'Edit this view',
            }),
            icon: 'pencil',
            type: 'icon',
            onClick: openEditFlyout,
          },
          {
            name: i18n.translate('esqlViews.table.openInDiscoverAction', {
              defaultMessage: 'Open in Discover',
            }),
            description: i18n.translate('esqlViews.table.openInDiscoverActionDescription', {
              defaultMessage: 'Open this view in Discover',
            }),
            icon: 'discoverApp',
            type: 'icon',
            enabled: () => Boolean(discoverLocator),
            onClick: (item: EsqlView) => {
              discoverLocator?.navigate({ query: { esql: `FROM ${item.name}` } });
            },
          },
          {
            name: i18n.translate('esqlViews.table.deleteAction', { defaultMessage: 'Delete' }),
            description: i18n.translate('esqlViews.table.deleteActionDescription', {
              defaultMessage: 'Delete this view',
            }),
            icon: 'trash',
            type: 'icon',
            color: 'danger',
            onClick: (item: EsqlView) => setViewsPendingDelete([item]),
          },
        ],
      },
    ],
    [openEditFlyout, discoverLocator]
  );

  return (
    <>
      <AppHeader
        title={i18n.translate('esqlViews.pageTitle', { defaultMessage: 'ES|QL Views' })}
        menu={menu}
        padding={{ bleed: 'm' }}
      />
      <EuiSpacer size="l" />
      <EuiInMemoryTable
        tableCaption={i18n.translate('esqlViews.table.caption', {
          defaultMessage: 'ES|QL views',
        })}
        items={views}
        columns={columns}
        search={{
          box: { incremental: true, placeholder: 'Search views' },
          toolsLeft:
            selectedItems.length === 0
              ? undefined
              : [
                  <EuiButton
                    key="bulkDelete"
                    color="danger"
                    iconType="trash"
                    onClick={() => setViewsPendingDelete(selectedItems)}
                    data-test-subj="esqlViewsBulkDeleteButton"
                  >
                    {i18n.translate('esqlViews.table.bulkDeleteButton', {
                      defaultMessage: 'Delete {count} views',
                      values: { count: selectedItems.length },
                    })}
                  </EuiButton>,
                ],
        }}
        selection={{
          selectable: () => true,
          onSelectionChange: setSelectedItems,
        }}
        sorting={{ sort: { field: 'lastUpdated', direction: 'desc' } }}
        pagination={{ initialPageSize: 10, pageSizeOptions: [10, 25, 50] }}
        itemId="name"
        data-test-subj="esqlViewsTable"
      />
      {flyoutState && (
        <FlyoutComponent
          mode={flyoutState.mode}
          initialView={flyoutState.view}
          http={http}
          data={data}
          notifications={notifications}
          onClose={closeFlyout}
          onSaved={handleFlyoutSaved}
        />
      )}
      {viewsPendingDelete && viewsPendingDelete.length > 0 && (
        <EuiConfirmModal
          title={
            viewsPendingDelete.length === 1
              ? i18n.translate('esqlViews.deleteModal.title', {
                  defaultMessage: 'Delete view "{name}"?',
                  values: { name: viewsPendingDelete[0].name },
                })
              : i18n.translate('esqlViews.deleteModal.bulkTitle', {
                  defaultMessage: 'Delete {count} views?',
                  values: { count: viewsPendingDelete.length },
                })
          }
          titleProps={{ id: deleteModalTitleId }}
          aria-labelledby={deleteModalTitleId}
          onCancel={() => setViewsPendingDelete(null)}
          onConfirm={handleConfirmDelete}
          cancelButtonText={i18n.translate('esqlViews.deleteModal.cancelButton', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('esqlViews.deleteModal.confirmButton', {
            defaultMessage: 'Delete',
          })}
          buttonColor="danger"
          isLoading={isDeleting}
          data-test-subj="esqlViewsDeleteConfirmModal"
        >
          <p>
            {viewsPendingDelete.length === 1
              ? i18n.translate('esqlViews.deleteModal.body', {
                  defaultMessage:
                    'This permanently deletes the view from Elasticsearch. This action cannot be undone.',
                })
              : i18n.translate('esqlViews.deleteModal.bulkBody', {
                  defaultMessage:
                    'This permanently deletes {count} views from Elasticsearch. This action cannot be undone.',
                  values: { count: viewsPendingDelete.length },
                })}
          </p>
        </EuiConfirmModal>
      )}
    </>
  );
};
