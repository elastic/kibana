/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
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
  EuiLink,
  EuiIcon,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { AGENT_BUILDER_APP_ID } from '@kbn/deeplinks-agent-builder';
import type { ActiveSource } from '../../types/connector';
import {
  DEFAULT_ITEMS_PER_PAGE,
  PAGINATION_ITEMS_PER_PAGE_OPTIONS,
} from '../../../common/constants';
import { AgentAvatarGroup } from './agent_avatar_group';
import { getConnectorIcon, toStackConnectorType } from '../../utils';
import { useKibana } from '../hooks/use_kibana';

interface ActiveSourcesTableProps {
  sources: ActiveSource[];
  isLoading?: boolean;
  onReconnect?: (source: ActiveSource) => void;
  onEdit?: (source: ActiveSource) => void;
  onClone?: (source: ActiveSource) => void;
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
  onClone?: (source: ActiveSource) => void;
  onDelete?: (source: ActiveSource) => void;
  disabled?: boolean;
}> = ({ source, onReconnect, onEdit, onClone, onDelete, disabled = false }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Menu items (ALL actions)
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
        {i18n.translate('xpack.dataConnectors.activeSources.editAction', {
          defaultMessage: 'Edit',
        })}
      </EuiContextMenuItem>
    ),
    onClone && (
      <EuiContextMenuItem
        key="clone"
        icon="copy"
        onClick={() => {
          setIsPopoverOpen(false);
          onClone(source);
        }}
        data-test-subj={`cloneActiveSource-${source.id}`}
      >
        {i18n.translate('xpack.dataConnectors.activeSources.cloneAction', {
          defaultMessage: 'Clone',
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
        {i18n.translate('xpack.dataConnectors.activeSources.reconnectAction', {
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
        {i18n.translate('xpack.dataConnectors.activeSources.deleteAction', {
          defaultMessage: 'Delete',
        })}
      </EuiContextMenuItem>
    ),
  ].filter((item): item is React.ReactElement => Boolean(item));

  const button = (
    <EuiButtonIcon
      iconType="boxesHorizontal"
      aria-label={i18n.translate('xpack.dataConnectors.activeSources.actionsLabel', {
        defaultMessage: 'Actions',
      })}
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      disabled={disabled}
      data-test-subj={`actionsButton-${source.id}`}
    />
  );

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      {/* Edit icon button */}
      {onEdit && (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="pencil"
            aria-label={i18n.translate('xpack.dataConnectors.activeSources.editAction', {
              defaultMessage: 'Edit',
            })}
            onClick={() => onEdit(source)}
            disabled={disabled}
            data-test-subj={`editActiveSource-${source.id}`}
          />
        </EuiFlexItem>
      )}
      {/* Delete icon button */}
      {onDelete && (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="trash"
            color="danger"
            aria-label={i18n.translate('xpack.dataConnectors.activeSources.deleteAction', {
              defaultMessage: 'Delete',
            })}
            onClick={() => onDelete(source)}
            disabled={disabled}
            data-test-subj={`deleteActiveSource-${source.id}`}
          />
        </EuiFlexItem>
      )}
      {/* Action menu (Clone, Reconnect) */}
      {items.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={button}
            isOpen={isPopoverOpen}
            closePopover={() => setIsPopoverOpen(false)}
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiContextMenuPanel items={items} />
          </EuiPopover>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const ActiveSourcesTable: React.FC<ActiveSourcesTableProps> = ({
  sources,
  isLoading = false,
  onReconnect,
  onEdit,
  onClone,
  onDelete,
}) => {
  const {
    services: { application, chrome },
  } = useKibana();
  const [selectedItems, setSelectedItems] = useState<ActiveSource[]>([]);
  const [activePage, setActivePage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);

  const handleChangeItemsPerPage = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setActivePage(0); // Reset to first page when changing page size
  };

  const navigateToWorkflows = useCallback(() => {
    const workflowsUrl = chrome?.navLinks.get(WORKFLOWS_APP_ID)?.url;
    if (workflowsUrl) {
      application?.navigateToUrl(workflowsUrl);
    }
  }, [application, chrome]);

  const navigateToTools = useCallback(
    (sourceType: string) => {
      // Navigate to Agent Builder tools section with search param
      application?.navigateToApp(AGENT_BUILDER_APP_ID, {
        path: `/tools?search=${encodeURIComponent(sourceType)}`,
      });
    },
    [application]
  );

  const paginatedSources = useMemo(() => {
    const start = activePage * itemsPerPage;
    return sources.slice(start, start + itemsPerPage);
  }, [sources, activePage, itemsPerPage]);

  const pageCount = Math.ceil(sources.length / itemsPerPage);

  const columns: Array<EuiBasicTableColumn<ActiveSource>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.dataConnectors.activeSources.nameColumn', {
        defaultMessage: 'Name',
      }),
      render: (name: string, source: ActiveSource) => (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <SourceIcon source={source} />
          </EuiFlexItem>
          <EuiFlexItem>
            {onEdit ? (
              <EuiLink
                onClick={() => onEdit(source)}
                data-test-subj={`activeSourceNameLink-${source.id}`}
              >
                <EuiText size="s">{name}</EuiText>
              </EuiLink>
            ) : (
              <EuiText size="s">{name}</EuiText>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      field: 'type',
      name: i18n.translate('xpack.dataConnectors.activeSources.typeColumn', {
        defaultMessage: 'Type',
      }),
      render: (type: string) => {
        // Capitalize first letter: "notion" -> "Notion", "github" -> "Github"
        const formattedType = type.charAt(0).toUpperCase() + type.slice(1);
        return <EuiText size="s">{formattedType}</EuiText>;
      },
    },
    {
      field: 'workflows',
      name: i18n.translate('xpack.dataConnectors.activeSources.workflowsColumn', {
        defaultMessage: 'Workflows',
      }),
      align: 'center',
      render: (workflows: string[]) =>
        workflows.length > 0 ? (
          <EuiLink onClick={navigateToWorkflows} data-test-subj="workflowsLink">
            <EuiText size="s">{workflows.length}</EuiText>
          </EuiLink>
        ) : (
          <EuiText size="s">0</EuiText>
        ),
    },
    {
      field: 'agentTools',
      name: i18n.translate('xpack.dataConnectors.activeSources.toolsColumn', {
        defaultMessage: 'Tools',
      }),
      align: 'center',
      render: (agentTools: string[], source: ActiveSource) =>
        agentTools.length > 0 ? (
          <EuiLink onClick={() => navigateToTools(source.type)} data-test-subj="toolsLink">
            <EuiText size="s">{agentTools.length}</EuiText>
          </EuiLink>
        ) : (
          <EuiText size="s">0</EuiText>
        ),
    },
    {
      field: 'usedBy',
      name: i18n.translate('xpack.dataConnectors.activeSources.usedByColumn', {
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
      name: i18n.translate('xpack.dataConnectors.activeSources.actionsColumn', {
        defaultMessage: 'Actions',
      }),
      width: '80px',
      render: (source: ActiveSource) => (
        <ActionsCell
          source={source}
          onReconnect={onReconnect}
          onEdit={onEdit}
          onClone={onClone}
          onDelete={onDelete}
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
                {i18n.translate('xpack.dataConnectors.activeSources.selectedCount', {
                  defaultMessage: 'Sources selected: {count}',
                  values: { count: selectedItems.length },
                })}
              </EuiText>
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
                {i18n.translate('xpack.dataConnectors.activeSources.deleteSelected', {
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
        tableCaption={i18n.translate('xpack.dataConnectors.activeSources.tableCaption', {
          defaultMessage: 'Active data sources',
        })}
        data-test-subj="activeSourcesTable"
      />
      {sources.length > 0 && (
        <>
          <EuiSpacer size="l" />
          <EuiTablePagination
            aria-label={i18n.translate('xpack.dataConnectors.activeSources.paginationLabel', {
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
