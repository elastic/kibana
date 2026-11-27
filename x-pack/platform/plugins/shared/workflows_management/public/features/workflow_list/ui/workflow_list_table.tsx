/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPopover,
  EuiPopoverTitle,
  EuiSwitch,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { CriteriaWithPagination } from '@elastic/eui/src/components/basic_table/basic_table';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useStableCallback } from '@kbn/react-hooks';
import { hasActiveModifierKey } from '@kbn/shared-ux-utility';
import type {
  Step,
  WorkflowExecutionHistoryModel,
  WorkflowListItemDto,
  WorkflowSortField,
} from '@kbn/workflows';
import { WorkflowTriggersAndSteps } from './workflow_triggers_and_steps';
import type { WorkflowTrigger } from '../../../../common/lib/trigger_types';
import {
  getRunTooltipContent,
  ManagedWorkflowBadge,
  StatusBadge,
  WorkflowStatus,
} from '../../../shared/ui';
import { getWorkflowDetailRouteState } from '../../../shared/utils/workflow_navigation';
import { WORKFLOWS_TABLE_PAGE_SIZE_OPTIONS } from '../constants';

const MAX_VISIBLE_TAGS = 2;

// Stable fallbacks so `WorkflowTriggersAndSteps` memoization is not defeated by fresh `[]` per render.
const EMPTY_TRIGGERS: WorkflowTrigger[] = [];
const EMPTY_STEPS: Step[] = [];
const EMPTY_HISTORY: WorkflowExecutionHistoryModel[] = [];

const nameCellContainerStyle = css`
  max-width: 100%;
  overflow: hidden;
`;

const nameCellLinkItemStyle = css`
  min-width: 0;
`;

const nameCellTextStyle = css`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  max-width: 100%;
`;

const nameCellDescriptionStyle = css`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  display: block;
  width: 100%;
`;

// The cells below only depend on their own item, so memoizing them lets React skip every row when
// `EuiBasicTable` re-runs all `render` callbacks on a selection change.
const WorkflowNameCell = React.memo(
  ({
    item,
    canReadWorkflow,
    workflowsListSearch,
  }: {
    item: WorkflowListItemDto;
    canReadWorkflow: boolean;
    workflowsListSearch: string;
  }) => {
    const routerHistory = useHistory();
    const { name } = item;

    return (
      <div css={nameCellContainerStyle}>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap={false}>
              <EuiFlexItem grow={false} css={nameCellLinkItemStyle}>
                {canReadWorkflow ? (
                  <EuiLink
                    href={routerHistory.createHref({ pathname: `/${item.id}` })}
                    onClick={(event: React.MouseEvent) => {
                      if (hasActiveModifierKey(event)) return;
                      event.preventDefault();
                      routerHistory.push({
                        pathname: `/${item.id}`,
                        state: getWorkflowDetailRouteState(workflowsListSearch),
                      });
                    }}
                    css={nameCellTextStyle}
                    title={name}
                    data-test-subj="workflowNameLink"
                  >
                    {name}
                  </EuiLink>
                ) : (
                  <EuiText
                    size="s"
                    css={nameCellTextStyle}
                    title={name}
                    data-test-subj="workflowNameText"
                  >
                    {name}
                  </EuiText>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText
              size="xs"
              color="subdued"
              title={item.description}
              css={nameCellDescriptionStyle}
            >
              {item.description || (
                <FormattedMessage
                  id="workflows.workflowList.noDescription"
                  defaultMessage="No description"
                />
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }
);
WorkflowNameCell.displayName = 'WorkflowNameCell';

const WorkflowLastRunCell = React.memo(
  ({
    history,
    canReadWorkflowExecution,
  }: {
    history: WorkflowListItemDto['history'];
    canReadWorkflowExecution: boolean;
  }) => {
    if (!canReadWorkflowExecution) {
      return (
        <EuiText size="xs" color="subdued" data-test-subj="workflowLastRunRestricted">
          {i18n.translate('workflows.workflowList.lastRun.restricted', {
            defaultMessage: '—',
          })}
        </EuiText>
      );
    }
    if (!history || history.length === 0) return null;
    const lastRun = history[0];
    return <StatusBadge status={lastRun.status} date={lastRun.finishedAt || lastRun.startedAt} />;
  }
);
WorkflowLastRunCell.displayName = 'WorkflowLastRunCell';

const WorkflowEnabledCell = React.memo(
  ({
    item,
    canUpdateWorkflow,
    onToggleWorkflow,
  }: {
    item: WorkflowListItemDto;
    canUpdateWorkflow: boolean;
    onToggleWorkflow: (item: WorkflowListItemDto) => void;
  }) => {
    // Validation errors block turning the workflow on, not off.
    const canToggleEnabled = item.enabled || item.valid;
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={
              !canToggleEnabled
                ? i18n.translate('workflows.workflowList.invalid', {
                    defaultMessage: 'Fix errors to enable workflow',
                  })
                : undefined
            }
          >
            <EuiSwitch
              data-test-subj={`workflowToggleSwitch-${item.id}`}
              disabled={!canUpdateWorkflow || item.permissions?.edit === false || !canToggleEnabled}
              checked={item.enabled}
              onChange={() => onToggleWorkflow(item)}
              label={
                item.enabled
                  ? i18n.translate('workflows.workflowList.enabled', {
                      defaultMessage: 'Enabled',
                    })
                  : i18n.translate('workflows.workflowList.disabled', {
                      defaultMessage: 'Disabled',
                    })
              }
              showLabel={false}
            />
          </EuiToolTip>
        </EuiFlexItem>
        {!item.valid && (
          <EuiFlexItem grow={false}>
            <WorkflowStatus valid={item.valid} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);
WorkflowEnabledCell.displayName = 'WorkflowEnabledCell';

export interface WorkflowListTableProps {
  items: WorkflowListItemDto[];
  page: number;
  size: number;
  total: number;
  selectedItems: WorkflowListItemDto[];
  onSelectionChange: (items: WorkflowListItemDto[]) => void;
  onPageChange: (pageIndex: number, pageSize: number) => void;
  onToggleWorkflow: (item: WorkflowListItemDto) => void;
  onDeleteWorkflow: (item: WorkflowListItemDto) => void;
  onCloneWorkflow: (item: WorkflowListItemDto) => void;
  onExportWorkflow: (item: WorkflowListItemDto) => void;
  onRequestRun: (item: WorkflowListItemDto) => void;
  onEditWorkflow: (item: WorkflowListItemDto) => void;
  canCreateWorkflow: boolean;
  canReadWorkflow: boolean;
  canReadWorkflowExecution: boolean;
  canUpdateWorkflow: boolean;
  canDeleteWorkflow: boolean;
  canExecuteWorkflow: boolean;
  workflowsListSearch?: string;
  sortField?: WorkflowSortField;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (field: WorkflowSortField, order: 'asc' | 'desc') => void;
}

export const WorkflowListTable = ({
  items,
  page,
  size,
  total,
  selectedItems,
  onSelectionChange,
  onPageChange,
  onToggleWorkflow: onToggleWorkflowProp,
  onDeleteWorkflow: onDeleteWorkflowProp,
  onCloneWorkflow: onCloneWorkflowProp,
  onExportWorkflow: onExportWorkflowProp,
  onRequestRun: onRequestRunProp,
  onEditWorkflow: onEditWorkflowProp,
  canCreateWorkflow,
  canReadWorkflow,
  canReadWorkflowExecution,
  canUpdateWorkflow,
  canDeleteWorkflow,
  canExecuteWorkflow,
  workflowsListSearch = '',
  sortField,
  sortOrder,
  onSortChange,
}: WorkflowListTableProps) => {
  const allowRowSelection = canUpdateWorkflow || canDeleteWorkflow || canReadWorkflow;

  // The parent recreates these on every render (they close over mutation objects), which would
  // invalidate `columns` and every memoized cell on each selection change.
  const onToggleWorkflow = useStableCallback(onToggleWorkflowProp);
  const onDeleteWorkflow = useStableCallback(onDeleteWorkflowProp);
  const onCloneWorkflow = useStableCallback(onCloneWorkflowProp);
  const onExportWorkflow = useStableCallback(onExportWorkflowProp);
  const onRequestRun = useStableCallback(onRequestRunProp);
  const onEditWorkflow = useStableCallback(onEditWorkflowProp);

  const columns = useMemo<Array<EuiBasicTableColumn<WorkflowListItemDto>>>(
    () => [
      {
        field: 'name',
        name: i18n.translate('workflows.workflowList.column.name', { defaultMessage: 'Name' }),
        dataType: 'string',
        sortable: true,
        render: (name: string, item) => (
          <WorkflowNameCell
            item={item}
            canReadWorkflow={canReadWorkflow}
            workflowsListSearch={workflowsListSearch}
          />
        ),
      },
      {
        field: 'tags',
        name: i18n.translate('workflows.workflowList.column.tags', {
          defaultMessage: 'Tags',
        }),
        width: '11em',
        render: (value: unknown, item: WorkflowListItemDto) => (
          <WorkflowTagsCell tags={item.definition?.tags} isManaged={item.managed === true} />
        ),
      },
      {
        field: 'triggers',
        name: i18n.translate('workflows.workflowList.column.triggersAndSteps', {
          defaultMessage: 'Triggers and Steps',
        }),
        width: '220px',
        render: (value: unknown, item: WorkflowListItemDto) => {
          const triggers = item.definition?.triggers ?? EMPTY_TRIGGERS;
          const steps = item.definition?.steps ?? EMPTY_STEPS;
          const history = item.history ?? EMPTY_HISTORY;

          return <WorkflowTriggersAndSteps triggers={triggers} steps={steps} history={history} />;
        },
      },
      {
        name: i18n.translate('workflows.workflowList.column.lastRun', {
          defaultMessage: 'Last run',
        }),
        field: 'runHistory',
        width: '8em',
        render: (value: unknown, item: WorkflowListItemDto) => (
          <WorkflowLastRunCell
            history={item.history}
            canReadWorkflowExecution={canReadWorkflowExecution}
          />
        ),
      },
      {
        name: i18n.translate('workflows.workflowList.column.enabled', {
          defaultMessage: 'Enabled',
        }),
        field: 'enabled',
        width: '90px',
        sortable: true,
        render: (value: unknown, item: WorkflowListItemDto) => (
          <WorkflowEnabledCell
            item={item}
            canUpdateWorkflow={canUpdateWorkflow}
            onToggleWorkflow={onToggleWorkflow}
          />
        ),
      },
      {
        name: '',
        width: '120px',
        actions: [
          {
            isPrimary: true,
            enabled: (item) =>
              canExecuteWorkflow &&
              item.permissions?.execute !== false &&
              item.enabled &&
              item.valid,
            type: 'icon',
            color: 'text',
            name: i18n.translate('workflows.workflowList.run', { defaultMessage: 'Run' }),
            'data-test-subj': 'runWorkflowAction',
            icon: 'play',
            description: (item: WorkflowListItemDto) =>
              getRunTooltipContent({
                isValid: item.valid,
                canRunWorkflow: canExecuteWorkflow && item.permissions?.execute !== false,
                isEnabled: item.enabled,
              }) ?? i18n.translate('workflows.workflowList.run', { defaultMessage: 'Run' }),
            onClick: (item: WorkflowListItemDto) => onRequestRun(item),
          },
          {
            enabled: (item) =>
              canUpdateWorkflow && item.permissions?.edit !== false && item.managed !== true,
            type: 'icon',
            color: 'text',
            isPrimary: true,
            name: i18n.translate('workflows.workflowList.edit', { defaultMessage: 'Edit' }),
            'data-test-subj': 'editWorkflowAction',
            icon: 'pencil',
            description: (item: WorkflowListItemDto) =>
              item.managed === true
                ? i18n.translate('workflows.workflowList.editManagedDisabled', {
                    defaultMessage: 'Managed workflows cannot be edited',
                  })
                : i18n.translate('workflows.workflowList.editWorkflow', {
                    defaultMessage: 'Edit workflow',
                  }),
            onClick: (item: WorkflowListItemDto) => onEditWorkflow(item),
          },
          {
            enabled: () => canCreateWorkflow && canReadWorkflow,
            type: 'icon',
            color: 'text',
            name: i18n.translate('workflows.workflowList.clone', { defaultMessage: 'Clone' }),
            'data-test-subj': 'cloneWorkflowAction',
            icon: 'copy',
            description: '',
            onClick: (item: WorkflowListItemDto) => onCloneWorkflow(item),
          },
          {
            enabled: (item) => item.definition !== null && canReadWorkflow,
            type: 'icon',
            color: 'text',
            name: i18n.translate('workflows.workflowList.export', { defaultMessage: 'Export' }),
            'data-test-subj': 'exportWorkflowAction',
            icon: 'export',
            description: '',
            onClick: (item: WorkflowListItemDto) => onExportWorkflow(item),
          },
          {
            enabled: (item) =>
              canDeleteWorkflow && item.permissions?.edit !== false && item.managed !== true,
            type: 'icon',
            color: 'danger',
            name: i18n.translate('workflows.workflowList.delete', { defaultMessage: 'Delete' }),
            'data-test-subj': 'deleteWorkflowAction',
            icon: 'trash',
            description: (item: WorkflowListItemDto) =>
              item.managed === true
                ? i18n.translate('workflows.workflowList.deleteManagedDisabled', {
                    defaultMessage: 'Managed workflows cannot be deleted',
                  })
                : '',
            onClick: (item: WorkflowListItemDto) => onDeleteWorkflow(item),
          },
        ],
      },
    ],
    [
      canReadWorkflow,
      canReadWorkflowExecution,
      canUpdateWorkflow,
      canExecuteWorkflow,
      canCreateWorkflow,
      canDeleteWorkflow,
      onEditWorkflow,
      workflowsListSearch,
      onToggleWorkflow,
      onCloneWorkflow,
      onExportWorkflow,
      onDeleteWorkflow,
      onRequestRun,
    ]
  );

  return (
    <EuiBasicTable
      tableCaption={i18n.translate('workflows.workflowList.tableCaption', {
        defaultMessage: 'Workflows',
      })}
      data-test-subj="workflowListTable"
      css={css`
        container-type: inline-size;

        .euiBasicTableAction-showOnHover {
          opacity: 1 !important;
        }
      `}
      rowProps={() => ({
        style: { height: '68px' },
      })}
      columns={columns}
      items={items}
      itemId="id"
      responsiveBreakpoint="xs"
      tableLayout="fixed"
      sorting={
        sortField && sortOrder
          ? { sort: { field: sortField, direction: sortOrder } }
          : { sort: undefined }
      }
      onChange={({
        page: { index: pageIndex, size: pageSize },
        sort,
      }: CriteriaWithPagination<WorkflowListItemDto>) => {
        // EUI can emit `sort` as `undefined` on page-only changes — guard
        // against that so we don't fire `onSortChange` on pagination.
        const incoming =
          sort?.field === 'name' || sort?.field === 'enabled'
            ? { field: sort.field as WorkflowSortField, order: sort.direction }
            : undefined;
        const sortChanged = incoming?.field !== sortField || incoming?.order !== sortOrder;
        if (sortChanged && incoming) {
          onSortChange?.(incoming.field, incoming.order);
          return;
        }
        onPageChange(pageIndex, pageSize);
      }}
      {...(allowRowSelection
        ? {
            selection: {
              onSelectionChange,
              selectable: () => true,
              selected: selectedItems,
            },
          }
        : {})}
      pagination={{
        pageSize: size,
        pageSizeOptions: WORKFLOWS_TABLE_PAGE_SIZE_OPTIONS,
        totalItemCount: total,
        pageIndex: page - 1,
      }}
    />
  );
};

const tagsRowStyle = css`
  flex-wrap: nowrap;
  min-width: 0;
`;

const visibleTagStyle = css`
  min-width: 0;

  .euiBadge {
    max-width: 100%;
  }
`;

const overflowPopoverStyle = css`
  max-height: 200px;
  max-width: 320px;
  overflow: auto;
`;

const WorkflowTagsCell = React.memo(
  ({ tags, isManaged }: { tags: readonly string[] | undefined; isManaged: boolean }) => {
    const [isOpen, setIsOpen] = useState(false);
    const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
    const close = useCallback(() => setIsOpen(false), []);

    if (!isManaged && (!tags || tags.length === 0)) return null;

    const workflowTags = tags ?? [];
    const visibleWorkflowTags = workflowTags.slice(
      0,
      isManaged ? MAX_VISIBLE_TAGS - 1 : MAX_VISIBLE_TAGS
    );
    const hidden = workflowTags.slice(visibleWorkflowTags.length);

    return (
      <EuiFlexGroup
        alignItems="center"
        gutterSize="xs"
        responsive={false}
        css={tagsRowStyle}
        data-test-subj="workflowTags"
      >
        {isManaged ? (
          <EuiFlexItem grow={false} css={visibleTagStyle}>
            <ManagedWorkflowBadge />
          </EuiFlexItem>
        ) : null}
        {visibleWorkflowTags.map((tag) => (
          <EuiFlexItem key={tag} grow={false} css={visibleTagStyle}>
            <EuiBadge color="hollow" title={tag}>
              {tag}
            </EuiBadge>
          </EuiFlexItem>
        ))}
        {hidden.length > 0 && (
          <EuiFlexItem grow={false}>
            <EuiPopover
              ownFocus
              isOpen={isOpen}
              closePopover={close}
              aria-label={i18n.translate('workflows.workflowList.tags.popoverTitle', {
                defaultMessage: 'Tags',
              })}
              button={
                <EuiBadge
                  color="hollow"
                  onClick={toggle}
                  onClickAriaLabel={i18n.translate('workflows.workflowList.tags.moreAriaLabel', {
                    defaultMessage: 'View more tags',
                  })}
                  data-test-subj="workflowTagsOverflowBadge"
                >
                  {`+${hidden.length}`}
                </EuiBadge>
              }
            >
              <EuiPopoverTitle>
                {i18n.translate('workflows.workflowList.tags.popoverTitle', {
                  defaultMessage: 'Tags',
                })}
              </EuiPopoverTitle>
              <EuiBadgeGroup gutterSize="xs" css={overflowPopoverStyle}>
                {hidden.map((tag) => (
                  <EuiBadge key={tag} color="hollow">
                    {tag}
                  </EuiBadge>
                ))}
              </EuiBadgeGroup>
            </EuiPopover>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);
WorkflowTagsCell.displayName = 'WorkflowTagsCell';
