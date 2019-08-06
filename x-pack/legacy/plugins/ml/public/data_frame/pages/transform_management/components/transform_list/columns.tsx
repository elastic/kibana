/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { idx } from '@kbn/elastic-idx';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiText,
  EuiToolTip,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';

import { DataFrameTransformId } from '../../../../common';
import {
  DATA_FRAME_TASK_STATE,
  DataFrameTransformListColumn,
  DataFrameTransformListRow,
  DataFrameTransformStats,
} from './common';
import { getActions } from './actions';

enum TASK_STATE_COLOR {
  failed = 'danger',
  started = 'primary',
  stopped = 'hollow',
}

export const getTaskStateBadge = (
  state: DataFrameTransformStats['task_state'],
  reason?: DataFrameTransformStats['reason']
) => {
  const color = TASK_STATE_COLOR[state];

  if (state === DATA_FRAME_TASK_STATE.FAILED && reason !== undefined) {
    return (
      <EuiToolTip content={reason}>
        <EuiBadge className="mlTaskStateBadge" color={color}>
          {state}
        </EuiBadge>
      </EuiToolTip>
    );
  }

  return (
    <EuiBadge className="mlTaskStateBadge" color={color}>
      {state}
    </EuiBadge>
  );
};

export const getColumns = (
  expandedRowItemIds: DataFrameTransformId[],
  setExpandedRowItemIds: React.Dispatch<React.SetStateAction<DataFrameTransformId[]>>
) => {
  const actions = getActions();

  function toggleDetails(item: DataFrameTransformListRow) {
    const index = expandedRowItemIds.indexOf(item.config.id);
    if (index !== -1) {
      expandedRowItemIds.splice(index, 1);
      setExpandedRowItemIds([...expandedRowItemIds]);
    } else {
      expandedRowItemIds.push(item.config.id);
    }

    // spread to a new array otherwise the component wouldn't re-render
    setExpandedRowItemIds([...expandedRowItemIds]);
  }

  return [
    {
      align: RIGHT_ALIGNMENT,
      width: '40px',
      isExpander: true,
      render: (item: DataFrameTransformListRow) => (
        <EuiButtonIcon
          onClick={() => toggleDetails(item)}
          aria-label={
            expandedRowItemIds.includes(item.config.id)
              ? i18n.translate('xpack.ml.dataframe.transformList.rowCollapse', {
                  defaultMessage: 'Hide details for {transformId}',
                  values: { transformId: item.config.id },
                })
              : i18n.translate('xpack.ml.dataframe.transformList.rowExpand', {
                  defaultMessage: 'Show details for {transformId}',
                  values: { transformId: item.config.id },
                })
          }
          iconType={expandedRowItemIds.includes(item.config.id) ? 'arrowUp' : 'arrowDown'}
        />
      ),
    },
    {
      field: DataFrameTransformListColumn.id,
      name: 'ID',
      sortable: true,
      truncateText: true,
    },
    {
      field: DataFrameTransformListColumn.description,
      name: i18n.translate('xpack.ml.dataframe.description', { defaultMessage: 'Description' }),
      sortable: true,
      truncateText: true,
    },
    {
      field: DataFrameTransformListColumn.configSourceIndex,
      name: i18n.translate('xpack.ml.dataframe.sourceIndex', { defaultMessage: 'Source index' }),
      sortable: true,
      truncateText: true,
    },
    {
      field: DataFrameTransformListColumn.configDestIndex,
      name: i18n.translate('xpack.ml.dataframe.destinationIndex', {
        defaultMessage: 'Destination index',
      }),
      sortable: true,
      truncateText: true,
    },
    {
      name: i18n.translate('xpack.ml.dataframe.status', { defaultMessage: 'Status' }),
      sortable: (item: DataFrameTransformListRow) => item.stats.task_state,
      truncateText: true,
      render(item: DataFrameTransformListRow) {
        return getTaskStateBadge(item.stats.task_state, item.stats.reason);
      },
      width: '100px',
    },
    {
      name: i18n.translate('xpack.ml.dataframe.mode', { defaultMessage: 'Mode' }),
      sortable: (item: DataFrameTransformListRow) => item.config.mode,
      truncateText: true,
      render(item: DataFrameTransformListRow) {
        const mode = item.config.mode;
        const color = 'hollow';
        return <EuiBadge color={color}>{mode}</EuiBadge>;
      },
      width: '100px',
    },
    {
      name: i18n.translate('xpack.ml.dataframe.progress', { defaultMessage: 'Progress' }),
      sortable: (item: DataFrameTransformListRow) =>
        idx(item, _ => _.stats.checkpointing.next.checkpoint_progress.percent_complete) || 0,
      truncateText: true,
      render(item: DataFrameTransformListRow) {
        const progress = Math.round(
          idx(item, _ => _.stats.checkpointing.next.checkpoint_progress.percent_complete) || 0
        );

        const isBatchTransform = typeof item.config.sync === 'undefined';

        return (
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            {isBatchTransform && (
              <Fragment>
                <EuiFlexItem style={{ width: '40px' }} grow={false}>
                  <EuiProgress value={progress} max={100} color="primary" size="m">
                    {progress}%
                  </EuiProgress>
                </EuiFlexItem>
                <EuiFlexItem style={{ width: '35px' }} grow={false}>
                  <EuiText size="xs">{`${progress}%`}</EuiText>
                </EuiFlexItem>
              </Fragment>
            )}
            {!isBatchTransform && (
              <Fragment>
                <EuiFlexItem style={{ width: '40px' }} grow={false}>
                  {item.stats.task_state === DATA_FRAME_TASK_STATE.STARTED && (
                    <EuiProgress color="primary" size="m" />
                  )}
                  {item.stats.task_state === DATA_FRAME_TASK_STATE.STOPPED && (
                    <EuiProgress value={0} max={100} color="primary" size="m" />
                  )}
                </EuiFlexItem>
                <EuiFlexItem style={{ width: '35px' }} grow={false}>
                  &nbsp;
                </EuiFlexItem>
              </Fragment>
            )}
          </EuiFlexGroup>
        );
      },
      width: '100px',
    },
    {
      name: i18n.translate('xpack.ml.dataframe.tableActionLabel', { defaultMessage: 'Actions' }),
      actions,
      width: '200px',
    },
  ];
};
