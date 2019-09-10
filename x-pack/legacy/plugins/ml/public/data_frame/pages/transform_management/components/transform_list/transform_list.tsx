/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, SFC, useState } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiPopover,
  EuiTitle,
} from '@elastic/eui';

import {
  OnTableChangeArg,
  SortDirection,
  SORT_DIRECTION,
} from '../../../../../../common/types/eui/in_memory_table';

import {
  DataFrameTransformId,
  DataFrameTransformListRow,
  moveToDataFrameWizard,
  DATA_FRAME_MODE,
  DATA_FRAME_TRANSFORM_LIST_COLUMN,
  DATA_FRAME_TRANSFORM_STATE,
} from '../../../../common';
import { checkPermission } from '../../../../../privilege/check_privilege';
import { getTaskStateBadge } from './columns';
import { DeleteAction } from './action_delete';
import { StartAction } from './action_start';
import { StopAction } from './action_stop';

import { ItemIdToExpandedRowMap, Query, Clause } from './common';
import { getColumns } from './columns';
import { ExpandedRow } from './expanded_row';
import { ProgressBar, TransformTable } from './transform_table';

function getItemIdToExpandedRowMap(
  itemIds: DataFrameTransformId[],
  dataFrameTransforms: DataFrameTransformListRow[]
): ItemIdToExpandedRowMap {
  return itemIds.reduce(
    (m: ItemIdToExpandedRowMap, transformId: DataFrameTransformId) => {
      const item = dataFrameTransforms.find(transform => transform.config.id === transformId);
      if (item !== undefined) {
        m[transformId] = <ExpandedRow item={item} />;
      }
      return m;
    },
    {} as ItemIdToExpandedRowMap
  );
}

function stringMatch(str: string | undefined, substr: string) {
  return (
    typeof str === 'string' &&
    typeof substr === 'string' &&
    (str.toLowerCase().match(substr.toLowerCase()) === null) === false
  );
}

interface Props {
  isInitialized: boolean;
  transforms: DataFrameTransformListRow[];
  errorMessage: any;
  transformsLoading: boolean;
}

export const DataFrameTransformList: SFC<Props> = ({
  isInitialized,
  transforms,
  errorMessage,
  transformsLoading,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [filterActive, setFilterActive] = useState(false);

  const [filteredTransforms, setFilteredTransforms] = useState<DataFrameTransformListRow[]>([]);
  const [expandedRowItemIds, setExpandedRowItemIds] = useState<DataFrameTransformId[]>([]);

  const [transformSelection, setTransformSelection] = useState<DataFrameTransformListRow[]>([]);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  const [searchError, setSearchError] = useState<any>(undefined);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [sortField, setSortField] = useState<string>(DATA_FRAME_TRANSFORM_LIST_COLUMN.ID);
  const [sortDirection, setSortDirection] = useState<SortDirection>(SORT_DIRECTION.ASC);

  const disabled =
    !checkPermission('canCreateDataFrame') ||
    !checkPermission('canPreviewDataFrame') ||
    !checkPermission('canStartStopDataFrame');

  const onQueryChange = ({ query, error }: { query: Query; error: any }) => {
    if (error) {
      setSearchError(error.message);
    } else {
      let clauses: Clause[] = [];
      if (query && query.ast !== undefined && query.ast.clauses !== undefined) {
        clauses = query.ast.clauses;
      }
      if (clauses.length > 0) {
        setFilterActive(true);
        filterTransforms(clauses);
      } else {
        setFilterActive(false);
      }
      setSearchError(undefined);
    }
  };

  const filterTransforms = (clauses: Clause[]) => {
    setIsLoading(true);
    // keep count of the number of matches we make as we're looping over the clauses
    // we only want to return transforms which match all clauses, i.e. each search term is ANDed
    // { transform-one:  { transform: { id: transform-one, config: {}, state: {}, ... }, count: 0 }, transform-two: {...} }
    const matches: Record<string, any> = transforms.reduce((p: Record<string, any>, c) => {
      p[c.id] = {
        transform: c,
        count: 0,
      };
      return p;
    }, {});

    clauses.forEach(c => {
      // the search term could be negated with a minus, e.g. -bananas
      const bool = c.match === 'must';
      let ts = [];

      if (c.type === 'term') {
        // filter term based clauses, e.g. bananas
        // match on id and description
        // if the term has been negated, AND the matches
        if (bool === true) {
          ts = transforms.filter(
            transform =>
              stringMatch(transform.id, c.value) === bool ||
              stringMatch(transform.config.description, c.value) === bool
          );
        } else {
          ts = transforms.filter(
            transform =>
              stringMatch(transform.id, c.value) === bool &&
              stringMatch(transform.config.description, c.value) === bool
          );
        }
      } else {
        // filter other clauses, i.e. the mode and status filters
        if (Array.isArray(c.value)) {
          // the status value is an array of string(s) e.g. ['failed', 'stopped']
          ts = transforms.filter(transform => c.value.includes(transform.stats.state));
        } else {
          ts = transforms.filter(transform => transform.mode === c.value);
        }
      }

      ts.forEach(t => matches[t.id].count++);
    });

    // loop through the matches and return only transforms which have match all the clauses
    const filtered = Object.values(matches)
      .filter(m => (m && m.count) >= clauses.length)
      .map(m => m.transform);

    setFilteredTransforms(filtered);
    setIsLoading(false);
  };

  // Before the transforms have been loaded for the first time, display the loading indicator only.
  // Otherwise a user would see 'No data frame transforms found' during the initial loading.
  if (!isInitialized) {
    return <ProgressBar isLoading={isLoading || transformsLoading} />;
  }

  if (typeof errorMessage !== 'undefined') {
    return (
      <Fragment>
        <ProgressBar isLoading={isLoading || transformsLoading} />
        <EuiCallOut
          title={i18n.translate('xpack.ml.dataFrame.list.errorPromptTitle', {
            defaultMessage: 'An error occurred getting the data frame transform list.',
          })}
          color="danger"
          iconType="alert"
        >
          <pre>{JSON.stringify(errorMessage)}</pre>
        </EuiCallOut>
      </Fragment>
    );
  }

  if (transforms.length === 0) {
    return (
      <Fragment>
        <ProgressBar isLoading={isLoading || transformsLoading} />
        <EuiEmptyPrompt
          title={
            <h2>
              {i18n.translate('xpack.ml.dataFrame.list.emptyPromptTitle', {
                defaultMessage: 'No data frame transforms found',
              })}
            </h2>
          }
          actions={[
            <EuiButtonEmpty onClick={moveToDataFrameWizard} isDisabled={disabled}>
              {i18n.translate('xpack.ml.dataFrame.list.emptyPromptButtonText', {
                defaultMessage: 'Create your first data frame transform',
              })}
            </EuiButtonEmpty>,
          ]}
          data-test-subj="mlNoDataFrameTransformsFound"
        />
      </Fragment>
    );
  }

  const columns = getColumns(expandedRowItemIds, setExpandedRowItemIds, transformSelection);

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  const itemIdToExpandedRowMap = getItemIdToExpandedRowMap(expandedRowItemIds, transforms);

  const pagination = {
    initialPageIndex: pageIndex,
    initialPageSize: pageSize,
    totalItemCount: transforms.length,
    pageSizeOptions: [10, 20, 50],
    hidePerPageOptions: false,
  };

  const bulkActionMenuItems = [
    <div key="startAction" className="mlTransformBulkActionItem">
      <StartAction items={transformSelection} />
    </div>,
    <div key="stopAction" className="mlTransformBulkActionItem">
      <StopAction items={transformSelection} />
    </div>,
    <div key="deleteAction" className="mlTransformBulkActionItem">
      <DeleteAction items={transformSelection} />
    </div>,
  ];

  const renderToolsLeft = () => {
    const buttonIcon = (
      <EuiButtonIcon
        size="s"
        iconType="gear"
        color="text"
        onClick={() => {
          setIsActionsMenuOpen(true);
        }}
        aria-label={i18n.translate(
          'xpack.ml.dataframe.multiTransformActionsMenu.managementActionsAriaLabel',
          {
            defaultMessage: 'Management actions',
          }
        )}
      />
    );

    const bulkActionIcon = (
      <EuiPopover
        key="bulkActionIcon"
        id="transformBulkActionsMenu"
        button={buttonIcon}
        isOpen={isActionsMenuOpen}
        closePopover={() => setIsActionsMenuOpen(false)}
        panelPaddingSize="none"
        anchorPosition="rightUp"
      >
        {bulkActionMenuItems}
      </EuiPopover>
    );

    return [
      <EuiTitle key="selectedText" size="s">
        <h3>
          {i18n.translate('xpack.ml.dataframe.multiTransformActionsMenu.transformsCount', {
            defaultMessage: '{count} {count, plural, one {transform} other {transforms}} selected',
            values: { count: transformSelection.length },
          })}
        </h3>
      </EuiTitle>,
      <div key="bulkActionsBorder" className="mlTransformBulkActionsBorder" />,
      bulkActionIcon,
    ];
  };

  const search = {
    toolsLeft: transformSelection.length > 0 ? renderToolsLeft() : undefined,
    onChange: onQueryChange,
    box: {
      incremental: true,
    },
    filters: [
      {
        type: 'field_value_selection',
        field: 'state.state',
        name: i18n.translate('xpack.ml.dataframe.statusFilter', { defaultMessage: 'Status' }),
        multiSelect: 'or',
        options: Object.values(DATA_FRAME_TRANSFORM_STATE).map(val => ({
          value: val,
          name: val,
          view: getTaskStateBadge(val),
        })),
      },
      {
        type: 'field_value_selection',
        field: 'mode',
        name: i18n.translate('xpack.ml.dataframe.modeFilter', { defaultMessage: 'Mode' }),
        multiSelect: false,
        options: Object.values(DATA_FRAME_MODE).map(val => ({
          value: val,
          name: val,
          view: (
            <EuiBadge className="mlTaskModeBadge" color="hollow">
              {val}
            </EuiBadge>
          ),
        })),
      },
    ],
  };

  const onTableChange = ({
    page = { index: 0, size: 10 },
    sort = { field: DATA_FRAME_TRANSFORM_LIST_COLUMN.ID, direction: SORT_DIRECTION.ASC },
  }: OnTableChangeArg) => {
    const { index, size } = page;
    setPageIndex(index);
    setPageSize(size);

    const { field, direction } = sort;
    setSortField(field);
    setSortDirection(direction);
  };

  const selection = {
    onSelectionChange: (selected: DataFrameTransformListRow[]) => setTransformSelection(selected),
  };

  return (
    <Fragment>
      <ProgressBar isLoading={isLoading || transformsLoading} />
      <TransformTable
        allowNeutralSort={false}
        className="mlTransformTable"
        columns={columns}
        error={searchError}
        hasActions={false}
        isExpandable={true}
        isSelectable={false}
        items={filterActive ? filteredTransforms : transforms}
        itemId={DATA_FRAME_TRANSFORM_LIST_COLUMN.ID}
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        onTableChange={onTableChange}
        pagination={pagination}
        selection={selection}
        sorting={sorting}
        search={search}
        data-test-subj="mlDataFramesTableTransforms"
      />
    </Fragment>
  );
};
