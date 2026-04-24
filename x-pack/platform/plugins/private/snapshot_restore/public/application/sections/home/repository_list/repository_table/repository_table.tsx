/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiInMemoryTable,
  EuiLink,
  EuiPopover,
  EuiToolTip,
  EuiIconTip,
} from '@elastic/eui';

import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { REPOSITORY_TYPES } from '../../../../../../common';
import type { Repository, RepositoryType } from '../../../../../../common/types';
import type { UseRequestResponse } from '../../../../../shared_imports';
import { ConfirmDefaultRepositoryModal, RepositoryDeleteProvider } from '../../../../components';
import { UIM_REPOSITORY_SHOW_DETAILS_CLICK } from '../../../../constants';
import { useServices, useToastNotifications } from '../../../../app_context';
import { textService } from '../../../../services/text';
import { linkToEditRepository, linkToAddRepository } from '../../../../services/navigation';

interface Props {
  repositories: Repository[];
  managedRepository?: string;
  defaultRepository?: string;
  onSetDefaultRepository: (name: string) => Promise<any>;
  reload: UseRequestResponse['resendRequest'];
  openRepositoryDetailsUrl: (name: Repository['name']) => string;
  onRepositoryDeleted: (repositoriesDeleted: Array<Repository['name']>) => void;
}

export const RepositoryTable: React.FunctionComponent<Props> = ({
  repositories,
  managedRepository,
  defaultRepository,
  onSetDefaultRepository,
  reload,
  openRepositoryDetailsUrl,
  onRepositoryDeleted,
}) => {
  const { i18n, uiMetricService, history } = useServices();
  const toastNotifications = useToastNotifications();
  const [selectedItems, setSelectedItems] = useState<Repository[]>([]);
  const [openActionsRowName, setOpenActionsRowName] = useState<string | undefined>(undefined);
  const [pendingDefaultName, setPendingDefaultName] = useState<string | undefined>(undefined);

  const closeActionsMenu = () => setOpenActionsRowName(undefined);

  const setDefaultWithToast = async (name: string) => {
    const response = await onSetDefaultRepository(name);
    if (response?.error) {
      toastNotifications.addDanger(
        i18n.translate('xpack.snapshotRestore.repositoryList.table.setDefaultErrorMessage', {
          defaultMessage: 'Error setting default repository',
        })
      );
      return;
    }

    toastNotifications.addSuccess(
      i18n.translate('xpack.snapshotRestore.repositoryList.table.setDefaultSuccessMessage', {
        defaultMessage: "Set default repository to ''{name}''",
        values: { name },
      })
    );
  };

  const columns = [
    {
      field: 'name',
      name: i18n.translate('xpack.snapshotRestore.repositoryList.table.nameColumnTitle', {
        defaultMessage: 'Name',
      }),
      truncateText: true,
      sortable: true,
      render: (name: Repository['name']) => {
        return (
          <Fragment>
            <EuiLink
              {...reactRouterNavigate(history, openRepositoryDetailsUrl(name), () =>
                uiMetricService.trackUiMetric(UIM_REPOSITORY_SHOW_DETAILS_CLICK)
              )}
              data-test-subj="repositoryLink"
            >
              {name}
            </EuiLink>
            {name === defaultRepository && (
              <EuiBadge style={{ marginLeft: 8 }}>
                <FormattedMessage
                  id="xpack.snapshotRestore.repositoryList.table.defaultRepositoryBadgeLabel"
                  defaultMessage="Default"
                />
              </EuiBadge>
            )}
            &nbsp;&nbsp;
            {managedRepository === name ? (
              <EuiIconTip
                content={
                  <FormattedMessage
                    id="xpack.snapshotRestore.repositoryList.table.managedRepositoryBadgeLabel"
                    defaultMessage="This is a managed repository"
                  />
                }
                position="right"
              />
            ) : null}
          </Fragment>
        );
      },
    },
    {
      field: 'type',
      name: i18n.translate('xpack.snapshotRestore.repositoryList.table.typeColumnTitle', {
        defaultMessage: 'Type',
      }),
      truncateText: true,
      sortable: true,
      render: (type: RepositoryType, repository: Repository) => {
        if (type === REPOSITORY_TYPES.source) {
          return textService.getRepositoryTypeName(type, repository.settings.delegateType);
        }
        return textService.getRepositoryTypeName(type);
      },
    },
    {
      field: 'actions',
      name: i18n.translate('xpack.snapshotRestore.repositoryList.table.actionsColumnTitle', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          render: ({ name }: { name: string }) => {
            const label = i18n.translate(
              'xpack.snapshotRestore.repositoryList.table.actionEditTooltip',
              { defaultMessage: 'Edit' }
            );

            return (
              <EuiToolTip content={label}>
                <EuiButtonIcon
                  aria-label={i18n.translate(
                    'xpack.snapshotRestore.repositoryList.table.actionEditAriaLabel',
                    {
                      defaultMessage: 'Edit repository `{name}`',
                      values: { name },
                    }
                  )}
                  iconType="pencil"
                  color="primary"
                  {...reactRouterNavigate(history, linkToEditRepository(name))}
                  data-test-subj="editRepositoryButton"
                />
              </EuiToolTip>
            );
          },
        },
        {
          render: ({ name }: Repository) => {
            const isDefault = name === defaultRepository;
            const isManaged = name === managedRepository;

            const actionsButton = (
              <EuiButtonIcon
                aria-label={i18n.translate(
                  'xpack.snapshotRestore.repositoryList.table.actionMoreAriaLabel',
                  {
                    defaultMessage: 'More actions for repository `{name}`',
                    values: { name },
                  }
                )}
                iconType="boxesHorizontal"
                color="primary"
                onClick={() =>
                  setOpenActionsRowName(openActionsRowName === name ? undefined : name)
                }
                data-test-subj="repositoryActionsMenuButton"
              />
            );

            return (
              <RepositoryDeleteProvider>
                {(deleteRepositoryPrompt) => {
                  const setAsDefaultItem = (
                    <EuiContextMenuItem
                      key="setDefault"
                      icon="flag"
                      disabled={isDefault}
                      toolTipContent={
                        isDefault
                          ? i18n.translate(
                              'xpack.snapshotRestore.repositoryList.table.actionSetDefaultAlreadyDefaultTooltip',
                              { defaultMessage: 'This repository is already the default.' }
                            )
                          : undefined
                      }
                      onClick={
                        !isDefault
                          ? () => {
                              closeActionsMenu();
                              if (defaultRepository) {
                                setPendingDefaultName(name);
                              } else {
                                void setDefaultWithToast(name);
                              }
                            }
                          : undefined
                      }
                      data-test-subj="setDefaultRepositoryButton"
                    >
                      <FormattedMessage
                        id="xpack.snapshotRestore.repositoryList.table.actionSetDefaultLabel"
                        defaultMessage="Set as default"
                      />
                    </EuiContextMenuItem>
                  );

                  const removeTooltipContent = isDefault
                    ? i18n.translate(
                        'xpack.snapshotRestore.repositoryList.table.actionRemoveDefaultRepositoryTooltip',
                        { defaultMessage: 'The default repository cannot be removed.' }
                      )
                    : isManaged
                    ? i18n.translate(
                        'xpack.snapshotRestore.repositoryList.table.deleteManagedRepositoryTooltip',
                        { defaultMessage: 'You cannot delete a managed repository.' }
                      )
                    : undefined;

                  const removeItem = (
                    <EuiContextMenuItem
                      key="remove"
                      icon="trash"
                      disabled={isDefault || isManaged}
                      toolTipContent={removeTooltipContent}
                      onClick={
                        !isDefault && !isManaged
                          ? () => {
                              closeActionsMenu();
                              deleteRepositoryPrompt([name], onRepositoryDeleted);
                            }
                          : undefined
                      }
                      data-test-subj="deleteRepositoryButton"
                    >
                      <FormattedMessage
                        id="xpack.snapshotRestore.repositoryList.table.actionRemoveLabel"
                        defaultMessage="Remove"
                      />
                    </EuiContextMenuItem>
                  );

                  return (
                    <EuiPopover
                      aria-label={i18n.translate(
                        'xpack.snapshotRestore.repositoryList.table.repositoryActionsMenuAriaLabel',
                        {
                          defaultMessage: 'Actions menu for repository `{name}`',
                          values: { name },
                        }
                      )}
                      button={actionsButton}
                      isOpen={openActionsRowName === name}
                      closePopover={closeActionsMenu}
                      panelPaddingSize="none"
                      anchorPosition="downRight"
                    >
                      <EuiContextMenuPanel items={[setAsDefaultItem, removeItem]} />
                    </EuiPopover>
                  );
                }}
              </RepositoryDeleteProvider>
            );
          },
        },
      ],
      width: '100px',
    },
  ];

  const sorting = {
    sort: {
      field: 'name',
      direction: 'asc' as const,
    },
  };

  const pagination = {
    initialPageSize: 20,
    pageSizeOptions: [10, 20, 50],
  };

  const selection = {
    onSelectionChange: (newSelectedItems: Repository[]) => setSelectedItems(newSelectedItems),
    selectable: ({ name }: Repository) =>
      Boolean(name !== managedRepository && name !== defaultRepository),
    selectableMessage: (selectable: boolean, { name }: Repository) => {
      if (!selectable) {
        if (name === defaultRepository) {
          return i18n.translate(
            'xpack.snapshotRestore.repositoryList.table.deleteDefaultRepositoryTooltip',
            {
              defaultMessage: 'You cannot delete the default repository.',
            }
          );
        }
        return i18n.translate(
          'xpack.snapshotRestore.repositoryList.table.deleteManagedRepositoryTooltip',
          {
            defaultMessage: 'You cannot delete a managed repository.',
          }
        );
      }
      return '';
    },
  };

  const search = {
    toolsLeft: selectedItems.length ? (
      <RepositoryDeleteProvider>
        {(
          deleteRepositoryPrompt: (
            names: Array<Repository['name']>,
            onSuccess?: (repositoriesDeleted: Array<Repository['name']>) => void
          ) => void
        ) => {
          return (
            <EuiButton
              onClick={() =>
                deleteRepositoryPrompt(
                  selectedItems.map((repository) => repository.name),
                  onRepositoryDeleted
                )
              }
              color="danger"
              data-test-subj="srRepositoryListBulkDeleteActionButton"
            >
              {selectedItems.length === 1 ? (
                <FormattedMessage
                  id="xpack.snapshotRestore.repositoryList.table.deleteSingleRepositoryButton"
                  defaultMessage="Remove repository"
                />
              ) : (
                <FormattedMessage
                  id="xpack.snapshotRestore.repositoryList.table.deleteMultipleRepositoriesButton"
                  defaultMessage="Remove repositories"
                />
              )}
            </EuiButton>
          );
        }}
      </RepositoryDeleteProvider>
    ) : undefined,
    toolsRight: [
      <EuiButton
        key="reloadButton"
        color="success"
        iconType="refresh"
        onClick={reload}
        data-test-subj="reloadButton"
      >
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryList.table.reloadRepositoriesButton"
          defaultMessage="Reload"
        />
      </EuiButton>,
      <EuiButton
        key="registerRepo"
        {...reactRouterNavigate(
          history,
          // @ts-expect-error
          linkToAddRepository(name)
        )}
        fill
        iconType="plusCircle"
        data-test-subj="registerRepositoryButton"
      >
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryList.addRepositoryButtonLabel"
          defaultMessage="Register repository"
        />
      </EuiButton>,
    ],
    box: {
      incremental: true,
      schema: true,
    },
    filters: [
      {
        type: 'field_value_selection' as const,
        field: 'type',
        name: i18n.translate('xpack.snapshotRestore.repositoryList.table.typeFilterLabel', {
          defaultMessage: 'Type',
        }),
        multiSelect: false,
        options: Object.keys(
          repositories.reduce((typeMap: any, repository) => {
            typeMap[repository.type] = true;
            return typeMap;
          }, {})
        ).map((type) => {
          return {
            value: type,
            view: textService.getRepositoryTypeName(type),
          };
        }),
      },
    ],
  };

  const renderConfirmDefaultModal = () => {
    if (!pendingDefaultName) {
      return null;
    }

    return (
      <ConfirmDefaultRepositoryModal
        currentDefaultRepository={defaultRepository}
        newDefaultRepository={pendingDefaultName}
        onCancel={() => setPendingDefaultName(undefined)}
        onConfirm={() => {
          void setDefaultWithToast(pendingDefaultName);
          setPendingDefaultName(undefined);
        }}
      />
    );
  };

  return (
    <>
      {renderConfirmDefaultModal()}
      <EuiInMemoryTable
        items={repositories}
        itemId="name"
        columns={columns}
        search={search}
        sorting={sorting}
        selection={selection}
        pagination={pagination}
        rowProps={() => ({
          'data-test-subj': 'row',
        })}
        cellProps={(item, field) => ({
          'data-test-subj': `${field.name}_cell`,
        })}
        tableCaption={i18n.translate('xpack.snapshotRestore.repositoryList.table.tableCaption', {
          defaultMessage: 'Registered repositories',
        })}
        data-test-subj="repositoryTable"
      />
    </>
  );
};
