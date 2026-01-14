/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonIcon,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiButton,
  EuiSpacer,
  EuiTablePagination,
  EuiIcon,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ActiveSource } from '../../types/connector';
import {
  DEFAULT_ITEMS_PER_PAGE,
  PAGINATION_ITEMS_PER_PAGE_OPTIONS,
} from '../../../common/constants';
import { AgentAvatarGroup } from './agent_avatar_group';
import { getConnectorIcon, toStackConnectorType } from '../../utils';

interface ActiveSourcesTableProps {
  sources: ActiveSource[];
  isLoading?: boolean;
  onReconnect?: (source: ActiveSource) => void;
  onEdit?: (source: ActiveSource) => void;
  onDelete?: (source: ActiveSource) => void;
}

const SourceIcon: React.FC<{ source: ActiveSource }> = ({ source }) => {
  const iconComponent = useMemo(() => {
    const connector = {
      id: source.type,
      name: source.name,
      type: toStackConnectorType(source.type), // Convert 'notion' → '.notion'
      category: 'all' as const,
    };
    return getConnectorIcon(connector, 'm', 'integration');
  }, [source.type, source.name]);

  return iconComponent;
};

const ActionsCell: React.FC<{
  source: ActiveSource;
  onReconnect?: (source: ActiveSource) => void;
  onEdit?: (source: ActiveSource) => void;
  onDelete?: (source: ActiveSource) => void;
  disabled?: boolean;
}> = ({ source, onReconnect, onEdit, onDelete, disabled = false }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const items = [
    onEdit && (
      <EuiContextMenuItem
        key="edit"
        icon="pencil"
        onClick={() => {
          setIsPopoverOpen(false);
          onEdit(source);
        }}
        data-test-subj={`editActiveSource-${source.id}`}
      >
        {i18n.translate('xpack.dataSources.activeSources.editAction', {
          defaultMessage: 'Edit',
        })}
      </EuiContextMenuItem>
    ),
    onReconnect && (
      <EuiContextMenuItem
        key="reconnect"
        icon="link"
        disabled
        onClick={() => {
          setIsPopoverOpen(false);
          onReconnect(source);
        }}
      >
        {i18n.translate('xpack.dataSources.activeSources.reconnectAction', {
          defaultMessage: 'Reconnect',
        })}
      </EuiContextMenuItem>
    ),
    onDelete && (
      <EuiContextMenuItem
        key="delete"
        icon={<EuiIcon type="trash" color="danger" />}
        css={({ euiTheme }) => ({
          color: euiTheme.colors.danger,
        })}
        onClick={() => {
          setIsPopoverOpen(false);
          onDelete(source);
        }}
        data-test-subj={`deleteActiveSource-${source.id}`}
      >
        {i18n.translate('xpack.dataSources.activeSources.deleteAction', {
          defaultMessage: 'Delete',
        })}
      </EuiContextMenuItem>
    ),
  ].filter((item): item is React.ReactElement => Boolean(item));

  // Don't render actions button if no actions are available
  if (items.length === 0) {
    return null;
  }

  const button = (
    <EuiButtonIcon
      iconType="boxesHorizontal"
      aria-label={i18n.translate('xpack.dataSources.activeSources.actionsLabel', {
        defaultMessage: 'Actions',
      })}
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      disabled={disabled}
      data-test-subj={`actionsButton-${source.id}`}
    />
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel items={items} />
    </EuiPopover>
  );
};

export const ActiveSourcesTable: React.FC<ActiveSourcesTableProps> = ({
  sources,
  isLoading = false,
  onReconnect,
  onEdit,
  onDelete,
}) => {
  const [selectedItems, setSelectedItems] = useState<ActiveSource[]>([]);
  const [activePage, setActivePage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);

  const handleChangeItemsPerPage = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setActivePage(0); // Reset to first page when changing page size
  };

  const paginatedSources = useMemo(() => {
    const start = activePage * itemsPerPage;
    return sources.slice(start, start + itemsPerPage);
  }, [sources, activePage, itemsPerPage]);

  const pageCount = Math.ceil(sources.length / itemsPerPage);

  const columns: Array<EuiBasicTableColumn<ActiveSource>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.dataSources.activeSources.nameColumn', {
        defaultMessage: 'Name',
      }),
      render: (name: string, source: ActiveSource) => (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <SourceIcon source={source} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">{name}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      field: 'type',
      name: i18n.translate('xpack.dataSources.activeSources.typeColumn', {
        defaultMessage: 'Type',
      }),
      render: (type: string) => <EuiText size="s">{type}</EuiText>,
    },
    {
      field: 'workflows',
      name: i18n.translate('xpack.dataSources.activeSources.workflowsColumn', {
        defaultMessage: 'Workflows',
      }),
      render: (workflows: string[]) => <EuiText size="s">{workflows.length}</EuiText>,
    },
    {
      field: 'agentTools',
      name: i18n.translate('xpack.dataSources.activeSources.toolsColumn', {
        defaultMessage: 'Tools',
      }),
      render: (agentTools: string[]) => <EuiText size="s">{agentTools.length}</EuiText>,
    },
    {
      field: 'usedBy',
      name: i18n.translate('xpack.dataSources.activeSources.usedByColumn', {
        defaultMessage: 'Used by',
      }),
      render: (agents?: ActiveSource['usedBy']) =>
        agents && agents.length > 0 ? (
          <AgentAvatarGroup agents={agents} />
        ) : (
          <EuiText size="s">-</EuiText> // Future: Add Agents which use this source
        ),
    },
    {
      name: i18n.translate('xpack.dataSources.activeSources.actionsColumn', {
        defaultMessage: 'Actions',
      }),
      width: '80px',
      render: (source: ActiveSource) => (
        <ActionsCell
          source={source}
          onReconnect={onReconnect}
          onEdit={onEdit}
          onDelete={onDelete}
          disabled={selectedItems.length > 0}
        />
      ),
    },
  ];

  const selection = {
    selectable: () => true,
    onSelectionChange: (items: ActiveSource[]) => setSelectedItems(items),
    selected: selectedItems,
  };

  return (
    <>
      {selectedItems.length > 0 && (
        <>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                {i18n.translate('xpack.dataSources.activeSources.selectedCount', {
                  defaultMessage: 'Sources selected: {count}',
                  values: { count: selectedItems.length },
                })}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                iconType="copy"
                onClick={() => {}}
                disabled
                data-test-subj="bulkCloneButton"
              >
                {i18n.translate('xpack.dataSources.activeSources.cloneSelected', {
                  defaultMessage: 'Clone selected',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                color="danger"
                iconType="trash"
                onClick={() => {}}
                disabled
                data-test-subj="bulkDeleteButton"
              >
                {i18n.translate('xpack.dataSources.activeSources.deleteSelected', {
                  defaultMessage: 'Delete selected',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </>
      )}
      <EuiBasicTable
        items={paginatedSources}
        itemId="id"
        columns={columns}
        loading={isLoading}
        selection={selection}
        tableCaption={i18n.translate('xpack.dataSources.activeSources.tableCaption', {
          defaultMessage: 'Active data sources',
        })}
        data-test-subj="activeSourcesTable"
      />
      {sources.length > 0 && (
        <>
          <EuiSpacer size="l" />
          <EuiTablePagination
            aria-label={i18n.translate('xpack.dataSources.activeSources.paginationLabel', {
              defaultMessage: 'Active sources pagination',
            })}
            pageCount={pageCount}
            activePage={activePage}
            onChangePage={setActivePage}
            itemsPerPage={itemsPerPage}
            itemsPerPageOptions={PAGINATION_ITEMS_PER_PAGE_OPTIONS}
            onChangeItemsPerPage={handleChangeItemsPerPage}
            data-test-subj="activeSourcesPagination"
          />
        </>
      )}
    </>
  );
};
