/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiCode,
  EuiConfirmModal,
  EuiLink,
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
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { mockEsqlViews, type EsqlView } from './mock_views';
import { CreateEditEsqlViewFlyout } from './create_edit_view_flyout';
import { deleteView } from './services/views_client';
import { getAllLocalViewMetadata, removeLocalViewMetadata } from './services/local_metadata';

export interface EsqlViewsAppProps {
  notifications: NotificationsStart;
  http: HttpStart;
  data: DataPublicPluginStart;
}

interface FlyoutState {
  mode: 'create' | 'edit';
  view?: EsqlView;
}

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
}) => {
  const [views, setViews] = useState<EsqlView[]>(buildInitialViews);
  const [flyoutState, setFlyoutState] = useState<FlyoutState | null>(null);
  const [viewPendingDelete, setViewPendingDelete] = useState<EsqlView | null>(null);
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
    if (!viewPendingDelete) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteView(http, viewPendingDelete.name);
      removeLocalViewMetadata(viewPendingDelete.name);
      setViews((prev) => prev.filter((view) => view.name !== viewPendingDelete.name));
      notifications.toasts.addSuccess(
        i18n.translate('esqlViews.deleteModal.successToast', {
          defaultMessage: 'View "{name}" was deleted.',
          values: { name: viewPendingDelete.name },
        })
      );
      setViewPendingDelete(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      notifications.toasts.addDanger({
        title: i18n.translate('esqlViews.deleteModal.errorToast', {
          defaultMessage: 'Failed to delete view "{name}"',
          values: { name: viewPendingDelete.name },
        }),
        text: message,
      });
    } finally {
      setIsDeleting(false);
    }
  }, [http, notifications, viewPendingDelete]);

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
        render: (query: string) => <EuiCode transparentBackground>{query}</EuiCode>,
      },
      {
        field: 'createdBy',
        name: i18n.translate('esqlViews.table.createdByColumn', { defaultMessage: 'Created by' }),
        sortable: true,
        width: '140px',
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
        width: '80px',
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
            name: i18n.translate('esqlViews.table.deleteAction', { defaultMessage: 'Delete' }),
            description: i18n.translate('esqlViews.table.deleteActionDescription', {
              defaultMessage: 'Delete this view',
            }),
            icon: 'trash',
            type: 'icon',
            color: 'danger',
            onClick: (item: EsqlView) => setViewPendingDelete(item),
          },
        ],
      },
    ],
    [openEditFlyout]
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
        search={{ box: { incremental: true, placeholder: 'Search views' } }}
        sorting={{ sort: { field: 'lastUpdated', direction: 'desc' } }}
        pagination={{ initialPageSize: 10, pageSizeOptions: [10, 25, 50] }}
        itemId="name"
        data-test-subj="esqlViewsTable"
      />
      {flyoutState && (
        <CreateEditEsqlViewFlyout
          mode={flyoutState.mode}
          initialView={flyoutState.view}
          http={http}
          data={data}
          notifications={notifications}
          onClose={closeFlyout}
          onSaved={handleFlyoutSaved}
        />
      )}
      {viewPendingDelete && (
        <EuiConfirmModal
          title={i18n.translate('esqlViews.deleteModal.title', {
            defaultMessage: 'Delete view "{name}"?',
            values: { name: viewPendingDelete.name },
          })}
          titleProps={{ id: deleteModalTitleId }}
          aria-labelledby={deleteModalTitleId}
          onCancel={() => setViewPendingDelete(null)}
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
            {i18n.translate('esqlViews.deleteModal.body', {
              defaultMessage:
                'This permanently deletes the view from Elasticsearch. This action cannot be undone.',
            })}
          </p>
        </EuiConfirmModal>
      )}
    </>
  );
};
