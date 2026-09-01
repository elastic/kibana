/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useCallback, useMemo, useRef, useState } from 'react';

import { i18n } from '@kbn/i18n';
import type { EuiSearchBarProps } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiInMemoryTable,
  EuiPageTemplate,
  EuiPopover,
  EuiSearchBar,
} from '@elastic/eui';
import type { ListingPageUrlState } from '@kbn/ml-url-state';
import type { TransformFunction } from '../../../../../../common/constants';
import {
  isReauthorizeActionDisabled,
  ReauthorizeActionModal,
  ReauthorizeActionName,
  useReauthorizeAction,
} from '../action_reauthorize';
import type { TransformId } from '../../../../../../common/types/transform';

import { type TransformListRow, TRANSFORM_LIST_COLUMN } from '../../../../common';
import { useRefreshTransformList, useTransformCapabilities } from '../../../../hooks';

import { CreateTransformButton } from '../create_transform_button';
import { RefreshTransformListButton } from '../refresh_transform_list_button';
import {
  DeleteActionModal,
  DeleteActionName,
  isDeleteActionDisabled,
  useDeleteAction,
} from '../action_delete';
import {
  isResetActionDisabled,
  ResetActionModal,
  ResetActionName,
  useResetAction,
} from '../action_reset';
import {
  isStartActionDisabled,
  StartActionModal,
  StartActionName,
  useStartAction,
} from '../action_start';
import {
  isScheduleNowActionDisabled,
  ScheduleNowActionName,
  useScheduleNowAction,
} from '../action_schedule_now';
import { isStopActionDisabled, StopActionName, useStopAction } from '../action_stop';
import {
  isProjectScopeActionDisabled,
  ProjectScopeActionFlyout,
  ProjectScopeActionModal,
  ProjectScopeActionName,
  useProjectScopeAction,
} from '../action_project_scope';
import { useColumns } from './use_columns';
import { ExpandedRow } from './expanded_row';
import { filterTransforms, transformFilters } from './transform_search_bar_filters';
import { useTableSettings } from './use_table_settings';
import { useAlertRuleFlyout } from '../../../../../alerting/transform_alerting_flyout';
import type { TransformHealthAlertRule } from '../../../../../../common/types/alerting';
import { StopActionModal } from '../action_stop/stop_action_modal';

type ItemIdToExpandedRowMap = Record<string, JSX.Element>;

const haveSameTransformIds = (
  firstItems: TransformListRow[],
  secondItems: TransformListRow[]
): boolean => {
  if (firstItems.length !== secondItems.length) {
    return false;
  }

  const secondItemIds = new Set(secondItems.map(({ id }) => id));
  return firstItems.every(({ id }) => secondItemIds.has(id));
};

function getItemIdToExpandedRowMap(
  itemIds: TransformId[],
  transforms: TransformListRow[],
  onAlertEdit: (alertRule: TransformHealthAlertRule) => void,
  transformsStatsLoading: boolean
): ItemIdToExpandedRowMap {
  return itemIds.reduce((m: ItemIdToExpandedRowMap, transformId: TransformId) => {
    const item = transforms.find((transform) => transform.config.id === transformId);
    if (item !== undefined) {
      m[transformId] = <ExpandedRow item={item} onAlertEdit={onAlertEdit} />;
    }
    return m;
  }, {} as ItemIdToExpandedRowMap);
}

interface TransformListProps {
  isLoading: boolean;
  onCreateTransform: (transformFunction: TransformFunction) => void;
  pageState: ListingPageUrlState;
  transformNodes: number;
  transforms: TransformListRow[];
  transformsLoading: boolean;
  transformsStatsLoading: boolean;
  updatePageState: (update: Partial<ListingPageUrlState>) => void;
}

export const TransformList: FC<TransformListProps> = ({
  isLoading,
  onCreateTransform,
  pageState,
  transformNodes,
  transforms,
  transformsLoading,
  transformsStatsLoading,
  updatePageState,
}) => {
  const refreshTransformList = useRefreshTransformList();
  const { setEditAlertRule } = useAlertRuleFlyout();

  const searchQueryText = pageState.queryText ?? '';
  const setSearchQueryText = useCallback(
    (value: string) => {
      updatePageState({ queryText: value });
    },
    [updatePageState]
  );

  const [searchError, setSearchError] = useState<string | undefined>();
  const [expandedRowItemIds, setExpandedRowItemIds] = useState<TransformId[]>([]);
  const [transformSelection, setTransformSelection] = useState<TransformListRow[]>([]);
  const transformSelectionRef = useRef<TransformListRow[]>([]);
  const [selectionResetCounter, setSelectionResetCounter] = useState(0);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const bulkStartAction = useStartAction(false, transformNodes);
  const bulkDeleteAction = useDeleteAction(false);
  const bulkReauthorizeAction = useReauthorizeAction(false, transformNodes);
  const bulkResetAction = useResetAction(false);
  const bulkStopAction = useStopAction(false);
  const bulkScheduleNowAction = useScheduleNowAction(false, transformNodes);
  const clearTransformSelection = useCallback((submittedItems: TransformListRow[]) => {
    if (!haveSameTransformIds(transformSelectionRef.current, submittedItems)) {
      return;
    }

    transformSelectionRef.current = [];
    setTransformSelection([]);
    setSelectionResetCounter((counter) => counter + 1);
  }, []);
  const bulkProjectScopeAction = useProjectScopeAction({
    onUpdateSuccess: clearTransformSelection,
  });

  const capabilities = useTransformCapabilities();

  const { sorting, pagination, onTableChange } = useTableSettings<TransformListRow>(
    TRANSFORM_LIST_COLUMN.ID,
    transforms,
    pageState,
    updatePageState
  );

  const { columns, modals: singleActionModals } = useColumns(
    expandedRowItemIds,
    setExpandedRowItemIds,
    transformNodes,
    transformSelection,
    transformsStatsLoading
  );

  const filteredTransforms = useMemo(() => {
    const query = searchQueryText !== '' ? EuiSearchBar.Query.parse(searchQueryText) : undefined;
    const clauses = query?.ast?.clauses ?? [];
    return clauses.length > 0 ? filterTransforms(transforms, clauses) : transforms;
  }, [searchQueryText, transforms]);

  if (transforms.length === 0) {
    return (
      <EuiPageTemplate.EmptyPrompt
        color={'subdued'}
        title={
          <h2>
            {i18n.translate('xpack.transform.list.emptyPromptTitle', {
              defaultMessage: 'No transforms found',
            })}
          </h2>
        }
        actions={[
          <CreateTransformButton
            label={i18n.translate('xpack.transform.list.emptyPromptButtonText', {
              defaultMessage: 'Create your first transform',
            })}
            onClick={onCreateTransform}
            transformNodes={transformNodes}
          />,
        ]}
        data-test-subj="transformNoTransformsFound"
      />
    );
  }

  const itemIdToExpandedRowMap = getItemIdToExpandedRowMap(
    expandedRowItemIds,
    transforms,
    setEditAlertRule,
    transformsStatsLoading
  );

  const bulkActionMenuItems = [
    <div key="startAction" className="transform__BulkActionItem">
      <EuiButtonEmpty
        onClick={() => bulkStartAction.openModal(transformSelection)}
        disabled={isStartActionDisabled(
          transformSelection,
          capabilities.canStartStopTransform,
          transformNodes
        )}
      >
        <StartActionName items={transformSelection} transformNodes={transformNodes} />
      </EuiButtonEmpty>
    </div>,
    <div key="scheduleNowAction" className="transform__BulkActionItem">
      <EuiButtonEmpty
        onClick={() =>
          bulkScheduleNowAction.scheduleNowTransforms(transformSelection.map((i) => ({ id: i.id })))
        }
        disabled={isScheduleNowActionDisabled(
          transformSelection,
          capabilities.canScheduleNowTransform,
          transformNodes
        )}
      >
        <ScheduleNowActionName items={transformSelection} transformNodes={transformNodes} />
      </EuiButtonEmpty>
    </div>,
    <div key="stopAction" className="transform__BulkActionItem">
      <EuiButtonEmpty
        onClick={() => {
          bulkStopAction.openModal(transformSelection);
        }}
        disabled={isStopActionDisabled(
          transformSelection,
          capabilities.canStartStopTransform,
          false
        )}
      >
        <StopActionName items={transformSelection} />
      </EuiButtonEmpty>
    </div>,
    <div key="reauthorizeAction" className="transform__BulkActionItem">
      <EuiButtonEmpty
        onClick={() => {
          bulkReauthorizeAction.openModal(transformSelection);
        }}
        disabled={isReauthorizeActionDisabled(
          transformSelection,
          capabilities.canStartStopTransform,
          transformNodes
        )}
      >
        <ReauthorizeActionName items={transformSelection} transformNodes={transformNodes} />
      </EuiButtonEmpty>
    </div>,
    <div key="projectScopeAction" className="transform__BulkActionItem">
      <EuiButtonEmpty
        onClick={() => {
          setIsActionsMenuOpen(false);
          bulkProjectScopeAction.openFlyout(transformSelection);
        }}
        disabled={isProjectScopeActionDisabled({
          canCreateTransform: bulkProjectScopeAction.canCreateTransform,
          hasLinkedProjects: bulkProjectScopeAction.hasLinkedProjects,
          isCpsEnabled: bulkProjectScopeAction.isCpsEnabled,
          isLoading: bulkProjectScopeAction.isLoading,
          items: transformSelection,
        })}
      >
        <ProjectScopeActionName
          canCreateTransform={bulkProjectScopeAction.canCreateTransform}
          disabled={isProjectScopeActionDisabled({
            canCreateTransform: bulkProjectScopeAction.canCreateTransform,
            hasLinkedProjects: bulkProjectScopeAction.hasLinkedProjects,
            isCpsEnabled: bulkProjectScopeAction.isCpsEnabled,
            isLoading: bulkProjectScopeAction.isLoading,
            items: transformSelection,
          })}
          hasLinkedProjects={bulkProjectScopeAction.hasLinkedProjects}
          isCpsEnabled={bulkProjectScopeAction.isCpsEnabled}
          isLoading={bulkProjectScopeAction.isLoading}
          items={transformSelection}
        />
      </EuiButtonEmpty>
    </div>,
    <div key="resetAction" className="transform__BulkActionItem">
      <EuiButtonEmpty
        onClick={() => {
          bulkResetAction.openModal(transformSelection);
        }}
        disabled={isResetActionDisabled(transformSelection, false)}
      >
        <ResetActionName
          canResetTransform={capabilities.canResetTransform}
          disabled={isResetActionDisabled(transformSelection, false)}
          isBulkAction={true}
          items={transformSelection}
        />
      </EuiButtonEmpty>
    </div>,
    <div key="deleteAction" className="transform__BulkActionItem">
      <EuiButtonEmpty
        onClick={() => bulkDeleteAction.openModal(transformSelection)}
        disabled={isDeleteActionDisabled(transformSelection, false)}
      >
        <DeleteActionName
          canDeleteTransform={capabilities.canDeleteTransform}
          disabled={isDeleteActionDisabled(transformSelection, false)}
          isBulkAction={true}
          items={transformSelection}
          forceDisable={false}
        />
      </EuiButtonEmpty>
    </div>,
  ];

  const renderToolsLeft = () => {
    const bulkActionButton = (
      <EuiButton
        color="primary"
        data-test-subj="transformBulkActionsMenuButton"
        iconSide="right"
        iconType="chevronSingleDown"
        onClick={() => {
          setIsActionsMenuOpen(true);
        }}
      >
        {i18n.translate('xpack.transform.multiTransformActionsMenu.transformsCount', {
          defaultMessage: '{count} selected',
          values: { count: transformSelection.length },
        })}
      </EuiButton>
    );

    const bulkActionIcon = (
      <EuiPopover
        key="bulkActionIcon"
        id="transformBulkActionsMenu"
        aria-label={i18n.translate(
          'xpack.transform.multiTransformActionsMenu.bulkActionsPopoverAriaLabel',
          { defaultMessage: 'Bulk actions' }
        )}
        button={bulkActionButton}
        isOpen={isActionsMenuOpen}
        closePopover={() => setIsActionsMenuOpen(false)}
        panelPaddingSize="s"
        anchorPosition="rightUp"
      >
        {bulkActionMenuItems}
      </EuiPopover>
    );

    return [bulkActionIcon];
  };

  const toolsRight = (
    <RefreshTransformListButton onClick={refreshTransformList} isLoading={isLoading} />
  );

  const handleSearchOnChange: EuiSearchBarProps['onChange'] = (search) => {
    if (search.error !== null) {
      setSearchError(search.error.message);
      return;
    }

    setSearchError(undefined);
    setSearchQueryText(search.queryText);
  };

  const search = {
    toolsLeft: transformSelection.length > 0 ? renderToolsLeft() : undefined,
    toolsRight,
    onChange: handleSearchOnChange,
    box: {
      incremental: true,
    },
    filters: transformFilters,
    query: searchQueryText,
  };

  const selection = {
    onSelectionChange: (selected: TransformListRow[]) => {
      transformSelectionRef.current = selected;
      setTransformSelection(selected);
    },
  };

  return (
    <div data-test-subj="transformListTableContainer">
      {/* Bulk Action Modals */}
      {bulkStartAction.isModalVisible && <StartActionModal {...bulkStartAction} />}
      {bulkDeleteAction.isModalVisible && <DeleteActionModal {...bulkDeleteAction} />}
      {bulkReauthorizeAction.isModalVisible && (
        <ReauthorizeActionModal {...bulkReauthorizeAction} />
      )}
      {bulkResetAction.isModalVisible && <ResetActionModal {...bulkResetAction} />}
      {bulkStopAction.isModalVisible && <StopActionModal {...bulkStopAction} />}
      {bulkProjectScopeAction.isFlyoutVisible && (
        <ProjectScopeActionFlyout {...bulkProjectScopeAction} />
      )}
      {bulkProjectScopeAction.isModalVisible && (
        <ProjectScopeActionModal {...bulkProjectScopeAction} />
      )}

      {/* Single Action Modals */}
      {singleActionModals}

      <EuiInMemoryTable
        key={selectionResetCounter}
        allowNeutralSort={false}
        className="transform__TransformTable"
        columns={columns}
        error={searchError}
        items={filteredTransforms}
        itemId={TRANSFORM_LIST_COLUMN.ID}
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        loading={isLoading || transformsLoading}
        onTableChange={onTableChange}
        pagination={pagination}
        rowProps={(item) => ({
          'data-test-subj': `transformListRow row-${item.id}`,
        })}
        selection={selection}
        sorting={sorting}
        search={search}
        tableCaption={i18n.translate('xpack.transform.list.tableCaption', {
          defaultMessage: 'Transform list',
        })}
        data-test-subj={`transformListTable ${
          isLoading || transformsLoading ? 'loading' : 'loaded'
        }`}
      />
    </div>
  );
};
