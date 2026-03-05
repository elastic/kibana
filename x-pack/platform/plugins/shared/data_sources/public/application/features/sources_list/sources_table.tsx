/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React, { useState, useMemo, useEffect } from 'react';
import { capitalize } from 'lodash';
import type { CriteriaWithPagination, EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiInMemoryTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonIcon,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiLink,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { AGENT_BUILDER_APP_ID } from '@kbn/deeplinks-agent-builder';
import type { ActiveSource } from '../../../types/connector';
import {
  DEFAULT_ITEMS_PER_PAGE,
  PAGINATION_ITEMS_PER_PAGE_OPTIONS,
} from '../../../../common/constants';
import { getConnectorIcon } from '../../../utils';
import { slugify } from '../../../../common';
import { useKibana } from '../../hooks/use_kibana';
import { SourcesUtilityBar } from './sources_utility_bar';

const getWorkflowPrefix = (source: ActiveSource): string =>
  `${slugify(source.name)}.source.${source.type}`;

const getToolPrefix = (source: ActiveSource): string => `${source.type}.${slugify(source.name)}`;

interface SourcesTableProps {
  sources: ActiveSource[];
  isLoading?: boolean;
  onEdit: (source: ActiveSource) => void;
  onDelete: (source: ActiveSource) => void;
  selectedItems: ActiveSource[];
  onSelectionChange: (items: ActiveSource[]) => void;
  onBulkDelete: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
}

// CSS for hover-only quick actions
const sourceQuickActionsHoverStyles = css`
  .euiTableRow:hover .source-quick-actions,
  .euiTableRow:focus-within .source-quick-actions {
    visibility: visible;
  }
`;

const QuickActions: React.FC<{
  source: ActiveSource;
  onEdit: (source: ActiveSource) => void;
  onDelete: (source: ActiveSource) => void;
}> = ({ source, onEdit, onDelete }) => {
  return (
    <EuiFlexGroup
      css={{ visibility: 'hidden' }}
      className="source-quick-actions"
      gutterSize="s"
      alignItems="center"
      component="span"
    >
      <EuiButtonIcon
        data-test-subj={`editSource-${source.id}`}
        iconType="pencil"
        onClick={() => onEdit(source)}
        aria-label={i18n.translate('xpack.dataSources.sources.editAction', {
          defaultMessage: 'Edit',
        })}
      />
      <EuiButtonIcon
        data-test-subj={`deleteSource-${source.id}`}
        iconType="trash"
        color="danger"
        onClick={() => onDelete(source)}
        aria-label={i18n.translate('xpack.dataSources.sources.deleteAction', {
          defaultMessage: 'Delete',
        })}
      />
    </EuiFlexGroup>
  );
};

const ContextMenu: React.FC<{
  source: ActiveSource;
  onEdit: (source: ActiveSource) => void;
  onDelete: (source: ActiveSource) => void;
  workflowsUrl: string;
}> = ({ source, onEdit, onDelete, workflowsUrl }) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems: ReactElement[] = [
    <EuiContextMenuItem
      icon="pencil"
      key="edit"
      size="s"
      onClick={() => {
        onEdit(source);
        setIsOpen(false);
      }}
      data-test-subj={`editSourceMenuItem-${source.id}`}
    >
      {i18n.translate('xpack.dataSources.sources.editAction', {
        defaultMessage: 'Edit',
      })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      icon="workflowsApp"
      key="edit-workflows"
      size="s"
      href={workflowsUrl}
      data-test-subj={`editWorkflowsMenuItem-${source.id}`}
    >
      {i18n.translate('xpack.dataSources.sources.editWorkflowsAction', {
        defaultMessage: 'Edit workflows',
      })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      icon="trash"
      key="delete"
      size="s"
      css={({ euiTheme }) => ({
        color: euiTheme.colors.textDanger,
      })}
      onClick={() => {
        onDelete(source);
        setIsOpen(false);
      }}
      data-test-subj={`deleteSourceMenuItem-${source.id}`}
    >
      {i18n.translate('xpack.dataSources.sources.deleteAction', {
        defaultMessage: 'Delete',
      })}
    </EuiContextMenuItem>,
  ];

  return (
    <EuiPopover
      id={`${source.id}_context-menu`}
      panelPaddingSize="s"
      button={
        <EuiButtonIcon
          iconType="boxesHorizontal"
          onClick={() => setIsOpen((openState) => !openState)}
          aria-label={i18n.translate('xpack.dataSources.sources.actionsLabel', {
            defaultMessage: 'Actions',
          })}
          data-test-subj={`actionsButton-${source.id}`}
        />
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
    >
      <EuiContextMenuPanel size="s" items={menuItems} />
    </EuiPopover>
  );
};

const ActionsCell: React.FC<{
  source: ActiveSource;
  onEdit: (source: ActiveSource) => void;
  onDelete: (source: ActiveSource) => void;
  workflowsUrl: string;
}> = ({ source, onEdit, onDelete, workflowsUrl }) => {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd" responsive={false}>
      <EuiFlexItem grow={false}>
        <QuickActions source={source} onEdit={onEdit} onDelete={onDelete} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ContextMenu
          source={source}
          onEdit={onEdit}
          onDelete={onDelete}
          workflowsUrl={workflowsUrl}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const SourcesTable: React.FC<SourcesTableProps> = ({
  sources,
  isLoading = false,
  onEdit,
  onDelete,
  selectedItems,
  onSelectionChange,
  onBulkDelete,
  onSelectAll,
  onClearSelection,
}) => {
  const {
    services: { application },
  } = useKibana();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_ITEMS_PER_PAGE);

  useEffect(() => {
    setPageIndex(0);
  }, [sources]);

  const availableTypes = useMemo(() => {
    return Array.from(new Set(sources.map((s) => s.type))).sort();
  }, [sources]);

  const columns: Array<EuiBasicTableColumn<ActiveSource>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.dataSources.sources.nameColumn', {
          defaultMessage: 'Name',
        }),
        render: (name: string, source: ActiveSource) => (
          <EuiLink onClick={() => onEdit(source)} data-test-subj={`sourceNameLink-${source.id}`}>
            <EuiText size="s">{name}</EuiText>
          </EuiLink>
        ),
      },
      {
        field: 'type',
        name: i18n.translate('xpack.dataSources.sources.typeColumn', {
          defaultMessage: 'Type',
        }),
        render: (type: string, source: ActiveSource) => (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>{getConnectorIcon(source.iconType, 'm')}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" data-test-subj={`sourceType-${source.id}`}>
                {capitalize(type)}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        field: 'workflows',
        name: i18n.translate('xpack.dataSources.sources.workflowsColumn', {
          defaultMessage: 'Workflows',
        }),
        align: 'center',
        render: (workflows: string[], source: ActiveSource) => {
          const path = `?query=${encodeURIComponent(getWorkflowPrefix(source))}`;
          const workflowsUrl = application.getUrlForApp(WORKFLOWS_APP_ID, { path });
          return workflows.length > 0 ? (
            <EuiLink href={workflowsUrl} data-test-subj={`workflowsLink-${source.id}`}>
              <EuiText size="s">{workflows.length}</EuiText>
            </EuiLink>
          ) : (
            <EuiText size="s">0</EuiText>
          );
        },
      },
      {
        field: 'agentTools',
        name: i18n.translate('xpack.dataSources.sources.toolsColumn', {
          defaultMessage: 'Tools',
        }),
        align: 'center',
        render: (agentTools: string[], source: ActiveSource) => {
          const path = `/tools?search=${encodeURIComponent(getToolPrefix(source))}`;
          const toolsUrl = application.getUrlForApp(AGENT_BUILDER_APP_ID, { path });
          return agentTools.length > 0 ? (
            <EuiLink href={toolsUrl} data-test-subj={`toolsLink-${source.id}`}>
              <EuiText size="s">{agentTools.length}</EuiText>
            </EuiLink>
          ) : (
            <EuiText size="s">0</EuiText>
          );
        },
      },
      {
        name: i18n.translate('xpack.dataSources.sources.actionsColumn', {
          defaultMessage: 'Actions',
        }),
        width: '120px',
        align: 'right',
        render: (source: ActiveSource) => {
          const path = `?query=${encodeURIComponent(getWorkflowPrefix(source))}`;
          const workflowsUrl = application.getUrlForApp(WORKFLOWS_APP_ID, { path });
          return (
            <ActionsCell
              source={source}
              onEdit={onEdit}
              onDelete={onDelete}
              workflowsUrl={workflowsUrl}
            />
          );
        },
      },
    ],
    [application, onEdit, onDelete]
  );

  return (
    <EuiInMemoryTable
      tableCaption={i18n.translate('xpack.dataSources.sources.tableCaption', {
        defaultMessage: 'Data sources',
      })}
      data-test-subj="sourcesTable"
      css={sourceQuickActionsHoverStyles}
      items={sources}
      itemId="id"
      columns={columns}
      loading={isLoading}
      childrenBetween={
        <SourcesUtilityBar
          selectedCount={selectedItems.length}
          onBulkDelete={onBulkDelete}
          onSelectAll={onSelectAll}
          onClearSelection={onClearSelection}
        />
      }
      search={{
        box: {
          incremental: true,
          placeholder: i18n.translate('xpack.dataSources.sources.searchPlaceholder', {
            defaultMessage: 'Search sources',
          }),
          'data-test-subj': 'sourcesSearchInput',
        },
        filters: [
          {
            type: 'field_value_selection',
            field: 'type',
            name: i18n.translate('xpack.dataSources.sources.typeFilter', {
              defaultMessage: 'Type',
            }),
            multiSelect: 'or',
            options: availableTypes.map((type) => ({
              value: type,
              name: capitalize(type),
            })),
          },
        ],
      }}
      pagination={{
        pageIndex,
        pageSize,
        pageSizeOptions: PAGINATION_ITEMS_PER_PAGE_OPTIONS,
        showPerPageOptions: true,
      }}
      onTableChange={({ page }: CriteriaWithPagination<ActiveSource>) => {
        if (page) {
          if (page.size !== pageSize) {
            setPageSize(page.size);
            setPageIndex(0);
          } else {
            setPageIndex(page.index);
          }
        }
      }}
      selection={{
        selectable: () => true,
        onSelectionChange,
        selected: selectedItems,
      }}
      responsiveBreakpoint={false}
    />
  );
};
