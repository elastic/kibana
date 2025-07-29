/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CriteriaWithPagination,
  EuiBasicTableColumn,
  EuiButton,
  EuiButtonIcon,
  EuiConfirmModal,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiInMemoryTable,
  EuiLink,
  EuiPopover,
  EuiSkeletonLoading,
  EuiSkeletonText,
  EuiTableSelectionType,
  EuiText,
  Search,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { formatOnechatErrorMessage } from '@kbn/onechat-browser';
import { ToolDefinitionWithSchema, ToolType } from '@kbn/onechat-common';
import { isEsqlTool } from '@kbn/onechat-common/tools';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { noop } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import {
  CreateToolErrorCallback,
  CreateToolSuccessCallback,
  useCreateToolFlyout,
} from '../../hooks/tools/use_create_tools';
import {
  DeleteToolErrorCallback,
  DeleteToolSuccessCallback,
  useDeleteToolModal,
} from '../../hooks/tools/use_delete_tools';
import {
  EditToolErrorCallback,
  EditToolSuccessCallback,
  useEditToolFlyout,
} from '../../hooks/tools/use_edit_tools';
import { useOnechatTools } from '../../hooks/tools/use_tools';
import { useToasts } from '../../hooks/use_toasts';
import {
  transformEsqlFormDataForCreate,
  transformEsqlFormDataForUpdate,
} from '../../utils/transform_esql_form_data';
import { truncateAtNewline } from '../../utils/truncate_at_newline';
import { OnechatEsqlToolFlyout, OnechatEsqlToolFlyoutMode } from './esql/esql_tool_flyout';
import { OnechatEsqlToolFormData } from './esql/form/types/esql_tool_form_types';
import { OnechatToolTags } from './tags/tool_tags';

const ToolId = ({
  tool,
  editTool,
}: {
  tool: ToolDefinitionWithSchema;
  editTool: (toolId: string) => void;
}) => {
  const { euiTheme } = useEuiTheme();

  const toolIdStyle = css`
    font-weight: ${euiTheme.font.weight.semiBold};
  `;

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      {isEsqlTool(tool) ? (
        <EuiLink onClick={() => editTool(tool.id)}>
          <EuiText size="s" css={toolIdStyle}>
            {tool.id}
          </EuiText>
        </EuiLink>
      ) : (
        <EuiText size="s" css={toolIdStyle}>
          {tool.id}
        </EuiText>
      )}
      <EuiText size="s" color="subdued">
        {truncateAtNewline(tool.description)}
      </EuiText>
    </EuiFlexGroup>
  );
};

const ToolQuickActions = ({
  tool,
  editTool,
  deleteTool,
}: {
  tool: ToolDefinitionWithSchema;
  editTool: (toolId: string) => void;
  deleteTool: (toolId: string) => void;
}) => {
  return (
    <EuiFlexGroup
      css={css`
        visibility: hidden;
      `}
      className="tool-quick-actions"
      gutterSize="s"
      alignItems="center"
      component="span"
    >
      <EuiButtonIcon
        iconType="documentEdit"
        onClick={() => {
          editTool(tool.id);
        }}
        aria-label={i18n.translate('xpack.onechat.tools.editToolButtonLabel', {
          defaultMessage: 'Edit',
        })}
      />
      <EuiButtonIcon
        iconType="trash"
        color="danger"
        onClick={() => {
          deleteTool(tool.id);
        }}
        aria-label={i18n.translate('xpack.onechat.tools.deleteToolButtonLabel', {
          defaultMessage: 'Delete',
        })}
      />
    </EuiFlexGroup>
  );
};

const ToolContextMenu = ({
  tool,
  editTool,
  deleteTool,
  testTool,
  cloneTool,
}: {
  tool: ToolDefinitionWithSchema;
  editTool: (toolId: string) => void;
  deleteTool: (toolId: string) => void;
  testTool: (toolId: string) => void;
  cloneTool: (toolId: string) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);

  const editMenuItem = (
    <EuiContextMenuItem
      icon="documentEdit"
      key="edit"
      size="s"
      onClick={() => {
        editTool(tool.id);
        setIsOpen(false);
      }}
    >
      {i18n.translate('xpack.onechat.tools.editToolButtonLabel', {
        defaultMessage: 'Edit',
      })}
    </EuiContextMenuItem>
  );

  const deleteMenuItem = (
    <EuiContextMenuItem
      icon="trash"
      key="delete"
      size="s"
      css={css`
        color: ${euiTheme.colors.textDanger};
      `}
      onClick={() => {
        deleteTool(tool.id);
        setIsOpen(false);
      }}
    >
      {i18n.translate('xpack.onechat.tools.deleteToolButtonLabel', {
        defaultMessage: 'Delete',
      })}
    </EuiContextMenuItem>
  );

  const testMenuItem = (
    <EuiContextMenuItem
      icon="eye"
      key="test"
      size="s"
      onClick={() => {
        testTool(tool.id);
        setIsOpen(false);
      }}
    >
      {i18n.translate('xpack.onechat.tools.testToolButtonLabel', {
        defaultMessage: 'Test',
      })}
    </EuiContextMenuItem>
  );

  const cloneMenuItem = (
    <EuiContextMenuItem
      icon="copy"
      key="clone"
      size="s"
      onClick={() => {
        cloneTool(tool.id);
        setIsOpen(false);
      }}
    >
      {i18n.translate('xpack.onechat.tools.cloneToolButtonLabel', {
        defaultMessage: 'Clone',
      })}
    </EuiContextMenuItem>
  );

  const menuItems = isEsqlTool(tool)
    ? [editMenuItem, testMenuItem, cloneMenuItem, deleteMenuItem]
    : [testMenuItem];

  return (
    <EuiPopover
      id={`${tool}_context-menu`}
      panelPaddingSize="s"
      button={
        <EuiButtonIcon
          iconType="boxesHorizontal"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={i18n.translate('xpack.onechat.tools.toolContextMenuButtonLabel', {
            defaultMessage: 'Tool context menu',
          })}
        />
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
    >
      <EuiContextMenuPanel size="s" items={menuItems} />
    </EuiPopover>
  );
};

const TableHeader = ({
  isLoading,
  pageIndex,
  tools,
}: {
  isLoading: boolean;
  pageIndex: number;
  tools: ToolDefinitionWithSchema[];
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      css={css`
        margin-block: ${euiTheme.size.s} ${euiTheme.size.m};
      `}
    >
      <EuiSkeletonLoading
        isLoading={isLoading}
        loadingContent={
          <EuiSkeletonText
            css={css`
              display: inline-block;
              width: 200px;
            `}
            lines={1}
            size="xs"
          />
        }
        loadedContent={
          <EuiText size="xs">
            <p>
              <FormattedMessage
                id="xpack.onechat.tools.toolsTableSummary"
                defaultMessage="Showing {start}-{end} of {total} {tools}"
                values={{
                  start: <strong>{pageIndex * 10 + 1}</strong>,
                  end: <strong>{Math.min((pageIndex + 1) * 10, tools.length)}</strong>,
                  total: tools.length,
                  tools: (
                    <strong>
                      {i18n.translate('xpack.onechat.tools.toolsLabel', {
                        defaultMessage: 'Tools',
                      })}
                    </strong>
                  ),
                }}
              />
            </p>
          </EuiText>
        }
      />
    </EuiFlexGroup>
  );
};

const getColumns = ({
  deleteTool,
  editTool,
  testTool,
  cloneTool,
}: {
  deleteTool: (toolId: string) => void;
  editTool: (toolId: string) => void;
  testTool: (toolId: string) => void;
  cloneTool: (toolId: string) => void;
}): Array<EuiBasicTableColumn<ToolDefinitionWithSchema>> => [
  {
    name: i18n.translate('xpack.onechat.tools.toolIdLabel', { defaultMessage: 'ID' }),
    sortable: ({ id }: ToolDefinitionWithSchema) => id,
    width: '60%',
    render: (tool: ToolDefinitionWithSchema) => <ToolId tool={tool} editTool={editTool} />,
  },
  {
    field: 'type',
    name: i18n.translate('xpack.onechat.tools.typeLabel', {
      defaultMessage: 'Type',
    }),
    width: '80px',
    render: (type: string) =>
      type === ToolType.esql ? (
        <EuiText size="s">
          {i18n.translate('xpack.onechat.tools.esqlLabel', {
            defaultMessage: 'ES|QL',
          })}
        </EuiText>
      ) : type === ToolType.builtin ? (
        <EuiText size="s">
          {i18n.translate('xpack.onechat.tools.builtinLabel', {
            defaultMessage: 'System',
          })}
        </EuiText>
      ) : null,
  },
  {
    field: 'tags',
    name: i18n.translate('xpack.onechat.tools.tagsLabel', {
      defaultMessage: 'Labels',
    }),
    render: (tags: string[]) => <OnechatToolTags tags={tags} />,
  },
  {
    width: '100px',
    align: 'right',
    render: (tool: ToolDefinitionWithSchema) => (
      <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" alignItems="center">
        {isEsqlTool(tool) && (
          <ToolQuickActions tool={tool} editTool={editTool} deleteTool={deleteTool} />
        )}
        <ToolContextMenu
          tool={tool}
          editTool={editTool}
          deleteTool={deleteTool}
          testTool={testTool}
          cloneTool={cloneTool}
        />
      </EuiFlexGroup>
    ),
  },
];

export const OnechatTools = () => {
  const { euiTheme } = useEuiTheme();
  const { tools, isLoading: isLoadingTools, error: toolsError } = useOnechatTools();
  const [pageIndex, setPageIndex] = useState(0);
  const { addSuccessToast, addErrorToast } = useToasts();

  const onDeleteSuccess = useCallback<DeleteToolSuccessCallback>(
    (toolId) => {
      addSuccessToast({
        title: i18n.translate('xpack.onechat.tools.deleteToolSuccessToast', {
          defaultMessage: 'Tool "{toolId}" deleted',
          values: {
            toolId,
          },
        }),
      });
    },
    [addSuccessToast]
  );

  const onDeleteError = useCallback<DeleteToolErrorCallback>(
    (error, { toolId }) => {
      addErrorToast({
        title: i18n.translate('xpack.onechat.tools.deleteToolErrorToast', {
          defaultMessage: 'Unable to delete tool "{toolId}"',
          values: {
            toolId,
          },
        }),
        text: formatOnechatErrorMessage(error),
      });
    },
    [addErrorToast]
  );

  const {
    isOpen: isDeleteModalOpen,
    isLoading: isDeletingTool,
    toolId: deleteToolId,
    deleteTool,
    confirmDelete,
    cancelDelete,
  } = useDeleteToolModal({ onSuccess: onDeleteSuccess, onError: onDeleteError });

  const handleCreateSuccess = useCallback<CreateToolSuccessCallback>(
    (tool) => {
      addSuccessToast({
        title: i18n.translate('xpack.onechat.tools.createEsqlToolSuccessToast', {
          defaultMessage: 'Tool "{toolId}" created',
          values: {
            toolId: tool.id,
          },
        }),
      });
    },
    [addSuccessToast]
  );

  const handleCreateError = useCallback<CreateToolErrorCallback>(
    (error) => {
      addErrorToast({
        title: i18n.translate('xpack.onechat.tools.createEsqlToolErrorToast', {
          defaultMessage: 'Unable to create tool',
        }),
        text: formatOnechatErrorMessage(error),
      });
    },
    [addErrorToast]
  );

  const {
    isOpen: isCreateToolFlyoutOpen,
    openFlyout: openCreateToolFlyout,
    closeFlyout: closeCreateToolFlyout,
    submit: createTool,
    isSubmitting: isCreatingTool,
  } = useCreateToolFlyout({
    onSuccess: handleCreateSuccess,
    onError: handleCreateError,
  });

  const handleCreateTool = useCallback(
    async (data: OnechatEsqlToolFormData) => {
      await createTool(transformEsqlFormDataForCreate(data));
    },
    [createTool]
  );

  const handleEditSuccess = useCallback<EditToolSuccessCallback>(
    (tool) => {
      addSuccessToast({
        title: i18n.translate('xpack.onechat.tools.editEsqlToolSuccessToast', {
          defaultMessage: 'Tool "{toolId}" updated',
          values: {
            toolId: tool.id,
          },
        }),
      });
    },
    [addSuccessToast]
  );

  const handleEditError = useCallback<EditToolErrorCallback>(
    (error, { toolId }) => {
      addErrorToast({
        title: i18n.translate('xpack.onechat.tools.editEsqlToolErrorToast', {
          defaultMessage: 'Unable to update tool "{toolId}"',
          values: {
            toolId,
          },
        }),
        text: formatOnechatErrorMessage(error),
      });
    },
    [addErrorToast]
  );

  const {
    isOpen: isEditToolFlyoutOpen,
    tool: editingTool,
    openFlyout: openEditToolFlyout,
    closeFlyout: closeEditToolFlyout,
    submit: updateTool,
    isLoading: isLoadingEditTool,
    isSubmitting: isUpdatingTool,
  } = useEditToolFlyout({
    onSuccess: handleEditSuccess,
    onError: handleEditError,
  });

  const handleUpdateTool = useCallback(
    async (data: OnechatEsqlToolFormData) => {
      await updateTool(transformEsqlFormDataForUpdate(data));
    },
    [updateTool]
  );

  const isEditingTool = isEditToolFlyoutOpen;

  const columns = useMemo(
    () =>
      getColumns({
        deleteTool,
        editTool: openEditToolFlyout,
        testTool: noop, // TODO: Integrate tool testing flyout
        cloneTool: noop, // TODO: Integrate tool cloning
      }),
    [deleteTool, openEditToolFlyout]
  );

  const deleteEsqlToolTitleId = useGeneratedHtmlId({
    prefix: 'deleteEsqlToolTitle',
  });

  const errorMessage = toolsError
    ? i18n.translate('xpack.onechat.tools.listToolsErrorMessage', {
        defaultMessage: 'Failed to fetch tools',
      })
    : undefined;

  const selection: EuiTableSelectionType<ToolDefinitionWithSchema> = {
    selectable: isEsqlTool,
  };

  const search: Search = {
    box: {
      incremental: true,
      placeholder: i18n.translate('xpack.onechat.tools.searchToolsPlaceholder', {
        defaultMessage: 'Search',
      }),
    },
  };

  return (
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header
        pageTitle={i18n.translate('xpack.onechat.tools.title', {
          defaultMessage: 'Tools',
        })}
        description={i18n.translate('xpack.onechat.tools.toolsDescription', {
          defaultMessage:
            'Agents use tools — modular, reusable actions — to search, retrieve, and take meaningful steps on your behalf. Start with built-in capabilities from Elastic, or create your own to fit your workflow.',
        })}
        css={css`
          background-color: ${euiTheme.colors.backgroundBasePlain};
          border-block-end: none;
        `}
        rightSideItems={[
          <EuiButton
            key="new-esql-tool-button"
            fill
            iconType="plusInCircleFilled"
            onClick={openCreateToolFlyout}
          >
            <EuiText size="s">
              {i18n.translate('xpack.onechat.tools.newToolButton', {
                defaultMessage: 'New tool',
              })}
            </EuiText>
          </EuiButton>,
        ]}
      />
      <KibanaPageTemplate.Section>
        <EuiInMemoryTable
          css={css`
            .euiTableRow:hover {
              .tool-quick-actions {
                visibility: visible;
              }
            }
          `}
          childrenBetween={
            <TableHeader isLoading={isLoadingTools} pageIndex={pageIndex} tools={tools} />
          }
          loading={isLoadingTools}
          columns={columns}
          items={tools}
          itemId="id"
          error={errorMessage}
          search={search}
          onTableChange={({
            page: { index },
          }: CriteriaWithPagination<ToolDefinitionWithSchema>) => {
            setPageIndex(index);
          }}
          pagination={{
            pageIndex,
            pageSize: 10,
            showPerPageOptions: false,
          }}
          selection={selection}
          sorting={{
            sort: {
              field: 'id',
              direction: 'asc',
            },
          }}
          noItemsMessage={
            <EuiText component="p" size="s" textAlign="center" color="subdued">
              {i18n.translate('xpack.onechat.tools.noEsqlToolsMessage', {
                defaultMessage: "It looks like you don't have any ES|QL tools defined yet.",
              })}
            </EuiText>
          }
        />
        <OnechatEsqlToolFlyout
          isOpen={isEditToolFlyoutOpen || isCreateToolFlyoutOpen}
          onClose={isEditingTool ? closeEditToolFlyout : closeCreateToolFlyout}
          mode={isEditingTool ? OnechatEsqlToolFlyoutMode.Edit : OnechatEsqlToolFlyoutMode.Create}
          tool={editingTool}
          submit={isEditingTool ? handleUpdateTool : handleCreateTool}
          isSubmitting={isEditingTool ? isUpdatingTool : isCreatingTool}
          isLoading={isEditingTool ? isLoadingEditTool : false}
        />
        {isDeleteModalOpen && (
          <EuiConfirmModal
            title={i18n.translate('xpack.onechat.tools.deleteEsqlToolTitle', {
              defaultMessage: 'Delete tool "{toolId}"?',
              values: {
                toolId: deleteToolId,
              },
            })}
            aria-labelledby={deleteEsqlToolTitleId}
            titleProps={{ id: deleteEsqlToolTitleId }}
            onCancel={cancelDelete}
            onConfirm={confirmDelete}
            isLoading={isDeletingTool}
            cancelButtonText={i18n.translate('xpack.onechat.tools.deleteEsqlToolCancelButton', {
              defaultMessage: 'Cancel',
            })}
            confirmButtonText={i18n.translate('xpack.onechat.tools.deleteEsqlToolConfirmButton', {
              defaultMessage: 'Delete',
            })}
            buttonColor="danger"
          >
            <EuiText>
              {i18n.translate('xpack.onechat.tools.deleteEsqlToolConfirmationText', {
                defaultMessage: "You can't recover deleted data.",
              })}
            </EuiText>
          </EuiConfirmModal>
        )}
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
