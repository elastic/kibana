/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination, EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiConfirmModal,
  EuiIconTip,
  EuiInMemoryTable,
  EuiLink,
  EuiSkeletonText,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { PluginDefinition } from '@kbn/agent-builder-common';
import React, { memo, useMemo, useState } from 'react';
import { useDeletePlugin } from '../../hooks/plugins/use_delete_plugin';
import { usePluginsService } from '../../hooks/plugins/use_plugins';
import { useNavigation } from '../../hooks/use_navigation';
import { useUiPrivileges } from '../../hooks/use_ui_privileges';
import { appPaths } from '../../utils/app_paths';
import { labels } from '../../utils/i18n';
import { PluginContextMenu } from './plugins_table_context_menu';

export const AgentBuilderPluginsTable = memo(() => {
  const { euiTheme } = useEuiTheme();
  const deleteModalTitleId = useGeneratedHtmlId();
  const { plugins, isLoading: isLoadingPlugins, error: pluginsError } = usePluginsService();
  const [tablePageIndex, setTablePageIndex] = useState(0);
  const [tablePageSize, setTablePageSize] = useState(10);

  const {
    isOpen: isDeleteModalOpen,
    isLoading: isDeleting,
    pluginName: deletePluginName,
    deletePlugin,
    confirmDelete,
    cancelDelete,
  } = useDeletePlugin();

  const columns = usePluginsTableColumns({ onDelete: deletePlugin });

  const searchConfig = useMemo(
    () => ({
      box: {
        incremental: true,
        placeholder: labels.plugins.searchPluginsPlaceholder,
        'data-test-subj': 'agentBuilderPluginsTableSearchInput',
      },
    }),
    []
  );

  return (
    <>
      <EuiInMemoryTable
        tableCaption={labels.plugins.pluginsTableCaption(plugins.length)}
        data-test-subj="agentBuilderPluginsTable"
        css={css`
          border-top: 1px solid ${euiTheme.colors.borderBaseSubdued};
          table {
            background-color: transparent;
          }
        `}
        loading={isLoadingPlugins}
        columns={columns}
        items={plugins}
        itemId="id"
        error={pluginsError ? labels.plugins.listPluginsErrorMessage : undefined}
        search={searchConfig}
        onTableChange={({ page }: CriteriaWithPagination<PluginDefinition>) => {
          if (page) {
            setTablePageIndex(page.index);
            if (page.size !== tablePageSize) {
              setTablePageSize(page.size);
              setTablePageIndex(0);
            }
          }
        }}
        pagination={{
          pageIndex: tablePageIndex,
          pageSize: tablePageSize,
          pageSizeOptions: [10, 25, 50, 100],
          showPerPageOptions: true,
        }}
        rowProps={(plugin) => ({
          'data-test-subj': `agentBuilderPluginsTableRow-${plugin.id}`,
        })}
        sorting={{
          sort: {
            field: 'name',
            direction: 'asc',
          },
        }}
        noItemsMessage={
          isLoadingPlugins ? (
            <EuiSkeletonText lines={1} />
          ) : (
            <EuiText component="p" size="s" textAlign="center" color="subdued">
              {plugins.length > 0
                ? labels.plugins.noPluginsMatchMessage
                : labels.plugins.noPluginsMessage}
            </EuiText>
          )
        }
      />
      {isDeleteModalOpen && deletePluginName && (
        <EuiConfirmModal
          aria-labelledby={deleteModalTitleId}
          title={labels.plugins.deletePluginTitle(deletePluginName)}
          titleProps={{ id: deleteModalTitleId }}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
          cancelButtonText={labels.plugins.deletePluginCancelButton}
          confirmButtonText={labels.plugins.deletePluginConfirmButton}
          buttonColor="danger"
          isLoading={isDeleting}
        >
          <p>{labels.plugins.deletePluginConfirmationText}</p>
        </EuiConfirmModal>
      )}
    </>
  );
});

const usePluginsTableColumns = ({
  onDelete,
}: {
  onDelete: (
    pluginId: string,
    pluginName: string,
    options?: { onConfirm?: () => void; onCancel?: () => void }
  ) => void;
}): Array<EuiBasicTableColumn<PluginDefinition>> => {
  const { manageTools } = useUiPrivileges();
  const { createAgentBuilderUrl } = useNavigation();

  return useMemo(
    (): Array<EuiBasicTableColumn<PluginDefinition>> => [
      {
        field: 'readonly',
        name: '',
        width: '30px',
        render: (readonly: boolean) => {
          if (readonly) {
            return <EuiIconTip type="lock" content={labels.plugins.readOnly} />;
          }
          return null;
        },
      },
      {
        field: 'name',
        name: labels.plugins.nameLabel,
        sortable: true,
        truncateText: true,
        width: '15%',
        render: (name: string, plugin: PluginDefinition) => (
          <EuiLink
            href={createAgentBuilderUrl(appPaths.plugins.details({ pluginId: plugin.id }))}
            data-test-subj={`agentBuilderPluginNameLink-${plugin.id}`}
          >
            <strong>{name}</strong>
          </EuiLink>
        ),
      },
      {
        field: 'description',
        name: labels.plugins.descriptionLabel,
        truncateText: true,
        render: (description: string) => (
          <EuiText size="xs" color="subdued">
            {description}
          </EuiText>
        ),
      },
      {
        field: 'version',
        name: labels.plugins.versionLabel,
        width: '70px',
        render: (version: string) => (
          <EuiText size="xs" color="subdued">
            {version}
          </EuiText>
        ),
      },
      {
        field: 'skill_ids',
        name: labels.plugins.skillsLabel,
        width: '60px',
        render: (skillIds: string[]) => (
          <EuiText size="xs" color="subdued">
            {skillIds.length}
          </EuiText>
        ),
      },
      {
        width: '40px',
        align: 'right' as const,
        render: (plugin: PluginDefinition) => (
          <PluginContextMenu plugin={plugin} onDelete={onDelete} canManage={manageTools} />
        ),
      },
    ],
    [manageTools, onDelete, createAgentBuilderUrl]
  );
};
