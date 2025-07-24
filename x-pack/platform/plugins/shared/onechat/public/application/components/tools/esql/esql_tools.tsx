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
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiInMemoryTable,
  EuiText,
  EuiTitle,
  Search,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ToolDefinition } from '@kbn/onechat-common';
import { formatOnechatErrorMessage } from '@kbn/onechat-browser';
import React, { useCallback, useMemo, useState } from 'react';
import { useDeleteToolModal } from '../../../hooks/tools/use_delete_tools';
import { useEsqlTools } from '../../../hooks/tools/use_tools';
import { useToasts } from '../../../hooks/use_toasts';
import { truncateAtNewline } from '../../../utils/truncate_at_newline';
import { OnechatToolTags } from '../tags/tool_tags';
import { OnechatCreateEsqlToolFlyout } from './create_esql_tool_flyout';

const getColumns = ({
  deleteTool,
}: {
  deleteTool: (toolId: string) => void;
}): Array<EuiBasicTableColumn<ToolDefinition>> => [
  {
    field: 'id',
    name: i18n.translate('xpack.onechat.tools.toolIdLabel', { defaultMessage: 'Tool' }),
    sortable: true,
    render: (id: string) => (
      <EuiText size="s">
        <strong>{id}</strong>
      </EuiText>
    ),
  },
  {
    field: 'description',
    name: i18n.translate('xpack.onechat.tools.toolDescriptionLabel', {
      defaultMessage: 'Description',
    }),
    width: '50%',
    render: (description: string) => {
      return <EuiText size="s">{truncateAtNewline(description)}</EuiText>;
    },
  },
  {
    field: 'tags',
    name: i18n.translate('xpack.onechat.tools.tagsLabel', {
      defaultMessage: 'Tags',
    }),
    valign: 'top',
    render: (tags: string[]) => <OnechatToolTags tags={tags} />,
  },
  {
    name: i18n.translate('xpack.onechat.tools.actionsLabel', {
      defaultMessage: 'Actions',
    }),
    width: '64px',
    align: 'center',
    render: ({ id }: ToolDefinition) => {
      return (
        <EuiButtonIcon
          iconType="trash"
          color="danger"
          onClick={() => {
            deleteTool(id);
          }}
          aria-label={i18n.translate('xpack.onechat.tools.deleteToolButtonLabel', {
            defaultMessage: 'Delete tool',
          })}
        />
      );
    },
  },
];

export const OnechatEsqlTools: React.FC = () => {
  const { tools, isLoading: isLoadingTools, error: toolsError } = useEsqlTools();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const { addSuccessToast, addErrorToast } = useToasts();

  const onDeleteSuccess = useCallback(
    (toolId: string) => {
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

  const onDeleteError = useCallback(
    (toolId: string) => {
      addErrorToast({
        title: i18n.translate('xpack.onechat.tools.deleteToolErrorToast', {
          defaultMessage: 'Unable to delete tool "{toolId}"',
          values: {
            toolId,
          },
        }),
      });
    },
    [addErrorToast]
  );

  const {
    isModalOpen: isDeleteModalOpen,
    isLoading: isDeletingTool,
    toolId: deleteToolId,
    deleteTool,
    confirmDelete,
    cancelDelete,
  } = useDeleteToolModal({ onSuccess: onDeleteSuccess, onError: onDeleteError });

  const handleCloseFlyout = useCallback(() => {
    setIsFlyoutOpen(false);
  }, []);

  const handleOpenFlyout = useCallback(() => {
    setIsFlyoutOpen(true);
  }, []);

  const columns = useMemo(() => getColumns({ deleteTool }), [deleteTool]);

  const deleteEsqlToolTitleId = useGeneratedHtmlId({
    prefix: 'deleteEsqlToolTitle',
  });

  const errorMessage = toolsError
    ? i18n.translate('xpack.onechat.tools.listToolsErrorMessage', {
        defaultMessage: 'Failed to fetch tools',
      })
    : undefined;

  const search: Search = {
    box: {
      incremental: true,
      placeholder: i18n.translate('xpack.onechat.tools.searchToolsPlaceholder', {
        defaultMessage: 'Search tools...',
      }),
      fullWidth: false,
    },
  };

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.onechat.tools.esqlToolsTitle', {
                defaultMessage: 'ES|QL Tools',
              })}
            </h2>
          </EuiTitle>
          <EuiButton
            key="new-esql-tool-button"
            fill
            iconType="plusInCircleFilled"
            onClick={handleOpenFlyout}
          >
            {i18n.translate('xpack.onechat.tools.newToolButton', {
              defaultMessage: 'New ES|QL tool',
            })}
          </EuiButton>
        </EuiFlexGroup>
        <EuiText component="p" size="s">
          {i18n.translate('xpack.onechat.tools.esqlToolsDescription', {
            defaultMessage: 'Define your own custom tools using ES|QL queries.',
          })}
        </EuiText>
        <EuiHorizontalRule margin="xs" />
        <EuiInMemoryTable
          loading={isLoadingTools}
          columns={columns}
          items={tools}
          itemId="id"
          error={errorMessage}
          search={search}
          onTableChange={({ page: { index } }: CriteriaWithPagination<ToolDefinition>) => {
            setPageIndex(index);
          }}
          pagination={{
            pageIndex,
            pageSize: 10,
            showPerPageOptions: false,
          }}
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
      </EuiFlexGroup>
      <OnechatCreateEsqlToolFlyout
        isOpen={isFlyoutOpen}
        onClose={handleCloseFlyout}
        onSuccess={() => {
          handleCloseFlyout();
          addSuccessToast({
            title: i18n.translate('xpack.onechat.tools.createEsqlToolSuccessToast', {
              defaultMessage: 'ES|QL tool created',
            }),
          });
        }}
        onError={(error) => {
          addErrorToast({
            title: i18n.translate('xpack.onechat.tools.createEsqlToolErrorToast', {
              defaultMessage: 'Unable to create ES|QL tool',
            }),
            text: formatOnechatErrorMessage(error),
          });
        }}
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
    </>
  );
};
