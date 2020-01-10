/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
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

import {
  ActionsColumnType,
  ComputedColumnType,
  ExpanderColumnType,
  FieldDataColumnType,
} from '../../../../../shared_imports';

import {
  getTransformProgress,
  TransformId,
  TransformListRow,
  TransformStats,
  TRANSFORM_LIST_COLUMN,
  TRANSFORM_STATE,
} from '../../../../common';
import { getActions } from './actions';

enum STATE_COLOR {
  aborting = 'warning',
  failed = 'danger',
  indexing = 'primary',
  started = 'primary',
  stopped = 'hollow',
  stopping = 'hollow',
}

export const getTaskStateBadge = (
  state: TransformStats['state'],
  reason?: TransformStats['reason']
) => {
  const color = STATE_COLOR[state];

  if (state === TRANSFORM_STATE.FAILED && reason !== undefined) {
    return (
      <EuiToolTip content={reason}>
        <EuiBadge className="transform__TaskStateBadge" color={color}>
          {state}
        </EuiBadge>
      </EuiToolTip>
    );
  }

  return (
    <EuiBadge className="transform__TaskStateBadge" color={color}>
      {state}
    </EuiBadge>
  );
};

export const getColumns = (
  expandedRowItemIds: TransformId[],
  setExpandedRowItemIds: React.Dispatch<React.SetStateAction<TransformId[]>>,
  transformSelection: TransformListRow[]
) => {
  const actions = getActions({ forceDisable: transformSelection.length > 0 });

  function toggleDetails(item: TransformListRow) {
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

  const columns: [
    ExpanderColumnType<TransformListRow>,
    FieldDataColumnType<TransformListRow>,
    FieldDataColumnType<TransformListRow>,
    FieldDataColumnType<TransformListRow>,
    FieldDataColumnType<TransformListRow>,
    ComputedColumnType<TransformListRow>,
    ComputedColumnType<TransformListRow>,
    ComputedColumnType<TransformListRow>,
    ActionsColumnType<TransformListRow>
  ] = [
    {
      align: RIGHT_ALIGNMENT,
      width: '40px',
      isExpander: true,
      render: (item: TransformListRow) => (
        <EuiButtonIcon
          onClick={() => toggleDetails(item)}
          aria-label={
            expandedRowItemIds.includes(item.config.id)
              ? i18n.translate('xpack.transform.transformList.rowCollapse', {
                  defaultMessage: 'Hide details for {transformId}',
                  values: { transformId: item.config.id },
                })
              : i18n.translate('xpack.transform.transformList.rowExpand', {
                  defaultMessage: 'Show details for {transformId}',
                  values: { transformId: item.config.id },
                })
          }
          iconType={expandedRowItemIds.includes(item.config.id) ? 'arrowUp' : 'arrowDown'}
          data-test-subj="transformListRowDetailsToggle"
        />
      ),
    },
    {
      field: TRANSFORM_LIST_COLUMN.ID,
      'data-test-subj': 'transformListColumnId',
      name: 'ID',
      sortable: true,
      truncateText: true,
    },
    {
      field: TRANSFORM_LIST_COLUMN.DESCRIPTION,
      'data-test-subj': 'transformListColumnDescription',
      name: i18n.translate('xpack.transform.description', { defaultMessage: 'Description' }),
      sortable: true,
      truncateText: true,
    },
    {
      field: TRANSFORM_LIST_COLUMN.CONFIG_SOURCE_INDEX,
      'data-test-subj': 'transformListColumnSourceIndex',
      name: i18n.translate('xpack.transform.sourceIndex', { defaultMessage: 'Source index' }),
      sortable: true,
      truncateText: true,
    },
    {
      field: TRANSFORM_LIST_COLUMN.CONFIG_DEST_INDEX,
      'data-test-subj': 'transformListColumnDestinationIndex',
      name: i18n.translate('xpack.transform.destinationIndex', {
        defaultMessage: 'Destination index',
      }),
      sortable: true,
      truncateText: true,
    },
    {
      name: i18n.translate('xpack.transform.status', { defaultMessage: 'Status' }),
      'data-test-subj': 'transformListColumnStatus',
      sortable: (item: TransformListRow) => item.stats.state,
      truncateText: true,
      render(item: TransformListRow) {
        return getTaskStateBadge(item.stats.state, item.stats.reason);
      },
      width: '100px',
    },
    {
      name: i18n.translate('xpack.transform.mode', { defaultMessage: 'Mode' }),
      'data-test-subj': 'transformListColumnMode',
      sortable: (item: TransformListRow) => item.mode,
      truncateText: true,
      render(item: TransformListRow) {
        const mode = item.mode;
        const color = 'hollow';
        return <EuiBadge color={color}>{mode}</EuiBadge>;
      },
      width: '100px',
    },
    {
      name: i18n.translate('xpack.transform.progress', { defaultMessage: 'Progress' }),
      'data-test-subj': 'transformListColumnProgress',
      sortable: (item: TransformListRow) => getTransformProgress(item) || 0,
      truncateText: true,
      render(item: TransformListRow) {
        const progress = getTransformProgress(item);

        const isBatchTransform = typeof item.config.sync === 'undefined';

        if (progress === undefined && isBatchTransform === true) {
          return null;
        }

        return (
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            {isBatchTransform && (
              <Fragment>
                <EuiFlexItem style={{ width: '40px' }} grow={false}>
                  <EuiProgress
                    value={progress}
                    max={100}
                    color="primary"
                    size="m"
                    data-test-subj="transformListProgress"
                  >
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
                  {/* If not stopped or failed show the animated progress bar */}
                  {item.stats.state !== TRANSFORM_STATE.STOPPED &&
                    item.stats.state !== TRANSFORM_STATE.FAILED && (
                      <EuiProgress color="primary" size="m" />
                    )}
                  {/* If stopped or failed show an empty (0%) progress bar */}
                  {(item.stats.state === TRANSFORM_STATE.STOPPED ||
                    item.stats.state === TRANSFORM_STATE.FAILED) && (
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
      name: i18n.translate('xpack.transform.tableActionLabel', { defaultMessage: 'Actions' }),
      actions,
      width: '200px',
    },
  ];

  return columns;
};
