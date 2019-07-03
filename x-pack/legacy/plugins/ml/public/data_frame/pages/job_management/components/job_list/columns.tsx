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
  RIGHT_ALIGNMENT,
} from '@elastic/eui';

import { JobId } from '../../../../common';
import { DataFrameJobListColumn, DataFrameJobListRow } from './common';
import { getActions } from './actions';

export const getColumns = (
  getJobs: () => void,
  expandedRowItemIds: JobId[],
  setExpandedRowItemIds: React.Dispatch<React.SetStateAction<JobId[]>>
) => {
  const actions = getActions(getJobs);

  function toggleDetails(item: DataFrameJobListRow) {
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
      render: (item: DataFrameJobListRow) => (
        <EuiButtonIcon
          onClick={() => toggleDetails(item)}
          aria-label={
            expandedRowItemIds.includes(item.config.id)
              ? i18n.translate('xpack.ml.dataframe.jobsList.rowCollapse', {
                  defaultMessage: 'Hide details for {jobId}',
                  values: { jobId: item.config.id },
                })
              : i18n.translate('xpack.ml.dataframe.jobsList.rowExpand', {
                  defaultMessage: 'Show details for {jobId}',
                  values: { jobId: item.config.id },
                })
          }
          iconType={expandedRowItemIds.includes(item.config.id) ? 'arrowUp' : 'arrowDown'}
        />
      ),
    },
    {
      field: DataFrameJobListColumn.id,
      name: 'ID',
      sortable: true,
      truncateText: true,
    },
    {
      field: DataFrameJobListColumn.description,
      name: i18n.translate('xpack.ml.dataframe.description', { defaultMessage: 'Description' }),
      sortable: true,
      truncateText: true,
    },
    {
      field: DataFrameJobListColumn.configSourceIndex,
      name: i18n.translate('xpack.ml.dataframe.sourceIndex', { defaultMessage: 'Source index' }),
      sortable: true,
      truncateText: true,
    },
    {
      field: DataFrameJobListColumn.configDestIndex,
      name: i18n.translate('xpack.ml.dataframe.destinationIndex', {
        defaultMessage: 'Destination index',
      }),
      sortable: true,
      truncateText: true,
    },
    {
      name: i18n.translate('xpack.ml.dataframe.status', { defaultMessage: 'Status' }),
      sortable: (item: DataFrameJobListRow) => item.state.task_state,
      truncateText: true,
      render(item: DataFrameJobListRow) {
        const color = item.state.task_state === 'started' ? 'primary' : 'hollow';
        return <EuiBadge color={color}>{item.state.task_state}</EuiBadge>;
      },
      width: '100px',
    },
    {
      name: i18n.translate('xpack.ml.dataframe.mode', { defaultMessage: 'Mode' }),
      sortable: (item: DataFrameJobListRow) =>
        typeof item.config.sync !== 'undefined' ? 'continuous' : 'batch',
      truncateText: true,
      render(item: DataFrameJobListRow) {
        const mode = typeof item.config.sync !== 'undefined' ? 'continuous' : 'batch';
        const color = 'hollow';
        return <EuiBadge color={color}>{mode}</EuiBadge>;
      },
      width: '100px',
    },
    {
      name: i18n.translate('xpack.ml.dataframe.progress', { defaultMessage: 'Progress' }),
      sortable: (item: DataFrameJobListRow) =>
        item.state.progress !== undefined ? item.state.progress.percent_complete : 0,
      truncateText: true,
      render(item: DataFrameJobListRow) {
        let progress = 0;

        if (item.state.progress !== undefined) {
          progress = Math.round(item.state.progress.percent_complete);
        }

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
                  {item.state.task_state === 'started' && <EuiProgress color="primary" size="m" />}
                  {item.state.task_state !== 'started' && (
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
