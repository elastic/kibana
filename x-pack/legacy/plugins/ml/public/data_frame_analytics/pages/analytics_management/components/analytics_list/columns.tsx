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

import { getAnalysisType, DataFrameAnalyticsId } from '../../../../common';
import {
  getDataFrameAnalyticsProgress,
  DataFrameAnalyticsListColumn,
  DataFrameAnalyticsListRow,
  DataFrameAnalyticsStats,
  DATA_FRAME_TASK_STATE,
} from './common';
import { getActions } from './actions';

enum TASK_STATE_COLOR {
  analyzing = 'primary',
  failed = 'danger',
  reindexing = 'primary',
  started = 'primary',
  stopped = 'hollow',
}

export const getTaskStateBadge = (
  state: DataFrameAnalyticsStats['state'],
  reason?: DataFrameAnalyticsStats['reason']
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

export const PROGRESS_COLUMN = {
  name: i18n.translate('xpack.ml.dataframe.analyticsList.progress', {
    defaultMessage: 'Progress',
  }),
  sortable: (item: DataFrameAnalyticsListRow) => getDataFrameAnalyticsProgress(item.stats),
  truncateText: true,
  render(item: DataFrameAnalyticsListRow) {
    const progress = getDataFrameAnalyticsProgress(item.stats);

    if (progress === undefined) {
      return null;
    }

    // For now all analytics jobs are batch jobs.
    const isBatchTransform = true;

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
              {item.stats.state === DATA_FRAME_TASK_STATE.STARTED && (
                <EuiProgress color="primary" size="m" />
              )}
              {item.stats.state === DATA_FRAME_TASK_STATE.STOPPED && (
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
};

export const getColumns = (
  expandedRowItemIds: DataFrameAnalyticsId[],
  setExpandedRowItemIds: React.Dispatch<React.SetStateAction<DataFrameAnalyticsId[]>>,
  isManagementTable: boolean = false
) => {
  const actions = getActions();

  function toggleDetails(item: DataFrameAnalyticsListRow) {
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
  // update possible column types to something like (FieldDataColumn | ComputedColumn | ActionsColumn)[] when they have been added to EUI
  const columns: any[] = [
    {
      align: RIGHT_ALIGNMENT,
      width: '40px',
      isExpander: true,
      render: (item: DataFrameAnalyticsListRow) => (
        <EuiButtonIcon
          onClick={() => toggleDetails(item)}
          aria-label={
            expandedRowItemIds.includes(item.config.id)
              ? i18n.translate('xpack.ml.dataframe.analyticsList.rowCollapse', {
                  defaultMessage: 'Hide details for {analyticsId}',
                  values: { analyticsId: item.config.id },
                })
              : i18n.translate('xpack.ml.dataframe.analyticsList.rowExpand', {
                  defaultMessage: 'Show details for {analyticsId}',
                  values: { analyticsId: item.config.id },
                })
          }
          iconType={expandedRowItemIds.includes(item.config.id) ? 'arrowUp' : 'arrowDown'}
        />
      ),
    },
    {
      field: DataFrameAnalyticsListColumn.id,
      name: 'ID',
      sortable: true,
      truncateText: true,
    },
    // Description is not supported yet by API
    /*
    {
      field: DataFrameAnalyticsListColumn.description,
      name: i18n.translate('xpack.ml.dataframe.analyticsList.description', {
        defaultMessage: 'Description',
      }),
      sortable: true,
      truncateText: true,
    },
    */
    {
      field: DataFrameAnalyticsListColumn.configSourceIndex,
      name: i18n.translate('xpack.ml.dataframe.analyticsList.sourceIndex', {
        defaultMessage: 'Source index',
      }),
      sortable: true,
      truncateText: true,
    },
    {
      field: DataFrameAnalyticsListColumn.configDestIndex,
      name: i18n.translate('xpack.ml.dataframe.analyticsList.destinationIndex', {
        defaultMessage: 'Destination index',
      }),
      sortable: true,
      truncateText: true,
    },
    {
      name: i18n.translate('xpack.ml.dataframe.analyticsList.type', { defaultMessage: 'Type' }),
      sortable: (item: DataFrameAnalyticsListRow) => getAnalysisType(item.config.analysis),
      truncateText: true,
      render(item: DataFrameAnalyticsListRow) {
        return <EuiBadge color="hollow">{getAnalysisType(item.config.analysis)}</EuiBadge>;
      },
      width: '150px',
    },
    {
      name: i18n.translate('xpack.ml.dataframe.analyticsList.status', { defaultMessage: 'Status' }),
      sortable: (item: DataFrameAnalyticsListRow) => item.stats.state,
      truncateText: true,
      render(item: DataFrameAnalyticsListRow) {
        return getTaskStateBadge(item.stats.state, item.stats.reason);
      },
      width: '100px',
    },
    // For now there is batch mode only so we hide this column for now.
    /*
    {
      name: i18n.translate('xpack.ml.dataframe.analyticsList.mode', { defaultMessage: 'Mode' }),
      sortable: (item: DataFrameAnalyticsListRow) => item.mode,
      truncateText: true,
      render(item: DataFrameAnalyticsListRow) {
        const mode = item.mode;
        const color = 'hollow';
        return <EuiBadge color={color}>{mode}</EuiBadge>;
      },
      width: '100px',
    },
    */
    PROGRESS_COLUMN,
  ];

  if (isManagementTable === true) {
    columns.push({
      name: i18n.translate('xpack.ml.jobsList.analyticsSpacesLabel', {
        defaultMessage: 'Spaces',
      }),
      render: () => <EuiBadge color={'hollow'}>{'all'}</EuiBadge>,
      width: '75px',
    });
  } else {
    columns.push({
      name: i18n.translate('xpack.ml.dataframe.analyticsList.tableActionLabel', {
        defaultMessage: 'Actions',
      }),
      actions,
      width: '200px',
    });
  }

  return columns;
};
