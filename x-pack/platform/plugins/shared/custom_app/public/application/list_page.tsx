/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useId, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  EuiBasicTable,
  EuiButton,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiLink,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
  type CriteriaWithPagination,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { AppServices } from './app';
import type { SavedAppList, SavedAppListItem } from './saved_apps_client';

const PAGE_SIZE = 20;
const SEARCH_DELAY_MS = 300;

type ListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; list: SavedAppList };

const toMessage = (error: unknown): string =>
  (error as { body?: { message?: string } })?.body?.message ??
  (error instanceof Error ? error.message : String(error));

export const ListPage = ({ client, chrome, notifications, canSave }: AppServices) => {
  const history = useHistory();
  const deleteTitleId = useId();
  const [search, setSearch] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [reloads, setReloads] = useState(0);
  const [state, setState] = useState<ListState>({ status: 'loading' });
  const [toDelete, setToDelete] = useState<SavedAppListItem>();

  useEffect(() => {
    chrome.setBreadcrumbs([
      {
        text: i18n.translate('xpack.customApp.standalone.breadcrumb', {
          defaultMessage: 'Custom apps',
        }),
      },
    ]);
  }, [chrome]);

  useEffect(() => {
    let isCurrent = true;
    // A short wait, so that typing does not ask for a list per letter.
    const timeout = setTimeout(() => {
      client
        .find({ search, page: pageIndex + 1, perPage: PAGE_SIZE })
        .then((list) => isCurrent && setState({ status: 'success', list }))
        .catch((error) => isCurrent && setState({ status: 'error', message: toMessage(error) }));
    }, SEARCH_DELAY_MS);
    return () => {
      isCurrent = false;
      clearTimeout(timeout);
    };
  }, [client, search, pageIndex, reloads]);

  const remove = useCallback(async () => {
    if (!toDelete) return;
    const { id } = toDelete;
    setToDelete(undefined);
    try {
      await client.remove(id);
      setReloads((count) => count + 1);
    } catch (error) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.customApp.standalone.deleteError', {
          defaultMessage: 'The app could not be deleted',
        }),
        text: toMessage(error),
      });
    }
  }, [client, notifications, toDelete]);

  const createButton = canSave ? (
    <EuiButton
      fill
      iconType="plus"
      onClick={() => history.push('/create')}
      data-test-subj="customAppCreate"
    >
      {i18n.translate('xpack.customApp.standalone.create', { defaultMessage: 'Create app' })}
    </EuiButton>
  ) : undefined;

  const columns: Array<EuiBasicTableColumn<SavedAppListItem>> = [
    {
      field: 'title',
      name: i18n.translate('xpack.customApp.standalone.column.title', { defaultMessage: 'Name' }),
      render: (title: string, { id }) => {
        const path = `/view/${encodeURIComponent(id)}`;
        return (
          // A real link, so that it can be opened in another tab; a plain click stays in the app.
          <EuiLink
            href={history.createHref({ pathname: path })}
            onClick={(event: React.MouseEvent) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
              event.preventDefault();
              history.push(path);
            }}
          >
            {title}
          </EuiLink>
        );
      },
    },
    {
      field: 'description',
      name: i18n.translate('xpack.customApp.standalone.column.description', {
        defaultMessage: 'Description',
      }),
    },
    {
      field: 'updatedAt',
      name: i18n.translate('xpack.customApp.standalone.column.updated', {
        defaultMessage: 'Last updated',
      }),
      render: (updatedAt?: string) => (updatedAt ? new Date(updatedAt).toLocaleString() : ''),
    },
    ...(canSave
      ? [
          {
            name: i18n.translate('xpack.customApp.standalone.column.actions', {
              defaultMessage: 'Actions',
            }),
            actions: [
              {
                name: i18n.translate('xpack.customApp.standalone.delete', {
                  defaultMessage: 'Delete',
                }),
                description: i18n.translate('xpack.customApp.standalone.deleteDescription', {
                  defaultMessage: 'Delete this app',
                }),
                icon: 'trash' as const,
                type: 'icon' as const,
                color: 'danger' as const,
                onClick: (item: SavedAppListItem) => setToDelete(item),
                'data-test-subj': 'customAppDelete',
              },
            ],
          },
        ]
      : []),
  ];

  const isEmpty = state.status === 'success' && state.list.total === 0 && search === '';

  return (
    <EuiPageTemplate offset={0} restrictWidth={false} data-test-subj="customAppListPage">
      <EuiPageTemplate.Header
        pageTitle={i18n.translate('xpack.customApp.standalone.title', {
          defaultMessage: 'Custom apps',
        })}
        description={i18n.translate('xpack.customApp.standalone.description', {
          defaultMessage:
            'Interactive apps built from your data: filters, charts, tables and details that work together.',
        })}
        rightSideItems={createButton ? [createButton] : []}
      />
      <EuiPageTemplate.Section>
        {state.status === 'error' && (
          <KbnDangerCallout
            size="s"
            announceOnMount={false}
            title={i18n.translate('xpack.customApp.standalone.listError', {
              defaultMessage: 'The apps could not be loaded',
            })}
          >
            <p>{state.message}</p>
          </KbnDangerCallout>
        )}
        {isEmpty ? (
          <EuiEmptyPrompt
            iconType="apps"
            title={
              <h2>
                {i18n.translate('xpack.customApp.standalone.emptyTitle', {
                  defaultMessage: 'No apps yet',
                })}
              </h2>
            }
            body={
              <p>
                {i18n.translate('xpack.customApp.standalone.emptyBody', {
                  defaultMessage:
                    'Create an app here, or describe one to the AI assistant and save it.',
                })}
              </p>
            }
            actions={createButton}
          />
        ) : (
          state.status !== 'error' && (
            <>
              <EuiFieldSearch
                fullWidth
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPageIndex(0);
                }}
                placeholder={i18n.translate('xpack.customApp.standalone.searchPlaceholder', {
                  defaultMessage: 'Search apps',
                })}
                aria-label={i18n.translate('xpack.customApp.standalone.searchLabel', {
                  defaultMessage: 'Search apps',
                })}
                data-test-subj="customAppSearch"
              />
              <EuiSpacer size="m" />
              <EuiBasicTable
                tableCaption={i18n.translate('xpack.customApp.standalone.tableCaption', {
                  defaultMessage: 'Custom apps',
                })}
                items={state.status === 'success' ? state.list.apps : []}
                columns={columns}
                loading={state.status === 'loading'}
                noItemsMessage={
                  <EuiText size="s" color="subdued">
                    <p>
                      {i18n.translate('xpack.customApp.standalone.noMatches', {
                        defaultMessage: 'No apps match your search',
                      })}
                    </p>
                  </EuiText>
                }
                pagination={{
                  pageIndex,
                  pageSize: PAGE_SIZE,
                  totalItemCount: state.status === 'success' ? state.list.total : 0,
                  showPerPageOptions: false,
                }}
                onChange={({ page }: CriteriaWithPagination<SavedAppListItem>) =>
                  setPageIndex(page.index)
                }
              />
            </>
          )
        )}
      </EuiPageTemplate.Section>

      {toDelete && (
        <EuiConfirmModal
          aria-labelledby={deleteTitleId}
          titleProps={{ id: deleteTitleId }}
          title={i18n.translate('xpack.customApp.standalone.deleteTitle', {
            defaultMessage: 'Delete "{title}"?',
            values: { title: toDelete.title },
          })}
          onCancel={() => setToDelete(undefined)}
          onConfirm={remove}
          cancelButtonText={i18n.translate('xpack.customApp.standalone.deleteCancel', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('xpack.customApp.standalone.deleteConfirm', {
            defaultMessage: 'Delete',
          })}
          buttonColor="danger"
        >
          <p>
            {i18n.translate('xpack.customApp.standalone.deleteBody', {
              defaultMessage:
                'The app is deleted for everyone. Dashboards that use it by reference will no longer show it.',
            })}
          </p>
        </EuiConfirmModal>
      )}
    </EuiPageTemplate>
  );
};
