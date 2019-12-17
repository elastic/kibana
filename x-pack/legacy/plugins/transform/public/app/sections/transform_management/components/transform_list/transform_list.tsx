/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, MouseEventHandler, FC, useContext, useState } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiTitle,
} from '@elastic/eui';

import { OnTableChangeArg, SortDirection, SORT_DIRECTION } from '../../../../../shared_imports';

import {
  useRefreshTransformList,
  TransformId,
  TransformListRow,
  TRANSFORM_MODE,
  TRANSFORM_LIST_COLUMN,
  TRANSFORM_STATE,
} from '../../../../common';
import { AuthorizationContext } from '../../../../lib/authorization';

import { CreateTransformButton } from '../create_transform_button';
import { RefreshTransformListButton } from '../refresh_transform_list_button';
import { getTaskStateBadge } from './columns';
import { DeleteAction } from './action_delete';
import { StartAction } from './action_start';
import { StopAction } from './action_stop';

import { ItemIdToExpandedRowMap, Query, Clause } from './common';
import { getColumns } from './columns';
import { ExpandedRow } from './expanded_row';
import { ProgressBar, transformTableFactory } from './transform_table';

function getItemIdToExpandedRowMap(
  itemIds: TransformId[],
  transforms: TransformListRow[]
): ItemIdToExpandedRowMap {
  return itemIds.reduce((m: ItemIdToExpandedRowMap, transformId: TransformId) => {
    const item = transforms.find(transform => transform.config.id === transformId);
    if (item !== undefined) {
      m[transformId] = <ExpandedRow item={item} />;
    }
    return m;
  }, {} as ItemIdToExpandedRowMap);
}

function stringMatch(str: string | undefined, substr: string) {
  return (
    typeof str === 'string' &&
    typeof substr === 'string' &&
    (str.toLowerCase().match(substr.toLowerCase()) === null) === false
  );
}

interface Props {
  errorMessage: any;
  isInitialized: boolean;
  onCreateTransform: MouseEventHandler<HTMLButtonElement>;
  transforms: TransformListRow[];
  transformsLoading: boolean;
}

const TransformTable = transformTableFactory<TransformListRow>();

export const TransformList: FC<Props> = ({
  errorMessage,
  isInitialized,
  onCreateTransform,
  transforms,
  transformsLoading,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { refresh } = useRefreshTransformList({ isLoading: setIsLoading });

  const [filterActive, setFilterActive] = useState(false);

  const [filteredTransforms, setFilteredTransforms] = useState<TransformListRow[]>([]);
  const [expandedRowItemIds, setExpandedRowItemIds] = useState<TransformId[]>([]);

  const [transformSelection, setTransformSelection] = useState<TransformListRow[]>([]);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  const [searchError, setSearchError] = useState<any>(undefined);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [sortField, setSortField] = useState<string>(TRANSFORM_LIST_COLUMN.ID);
  const [sortDirection, setSortDirection] = useState<SortDirection>(SORT_DIRECTION.ASC);

  const { capabilities } = useContext(AuthorizationContext);
  const disabled =
    !capabilities.canCreateTransform ||
    !capabilities.canPreviewTransform ||
    !capabilities.canStartStopTransform;

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
        // match on ID and description
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
  // Otherwise a user would see 'No transforms found' during the initial loading.
  if (!isInitialized) {
    return <ProgressBar isLoading={isLoading || transformsLoading} />;
  }

  if (typeof errorMessage !== 'undefined') {
    return (
      <Fragment>
        <ProgressBar isLoading={isLoading || transformsLoading} />
        <EuiCallOut
          title={i18n.translate('xpack.transform.list.errorPromptTitle', {
            defaultMessage: 'An error occurred getting the transform list.',
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
              {i18n.translate('xpack.transform.list.emptyPromptTitle', {
                defaultMessage: 'No transforms found',
              })}
            </h2>
          }
          actions={[
            <EuiButtonEmpty
              onClick={onCreateTransform}
              isDisabled={disabled}
              data-test-subj="transformCreateFirstButton"
            >
              {i18n.translate('xpack.transform.list.emptyPromptButtonText', {
                defaultMessage: 'Create your first transform',
              })}
            </EuiButtonEmpty>,
          ]}
          data-test-subj="transformNoTransformsFound"
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
    <div key="startAction" className="transform__BulkActionItem">
      <StartAction items={transformSelection} />
    </div>,
    <div key="stopAction" className="transform__BulkActionItem">
      <StopAction items={transformSelection} />
    </div>,
    <div key="deleteAction" className="transform__BulkActionItem">
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
          'xpack.transform.multiTransformActionsMenu.managementActionsAriaLabel',
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
          {i18n.translate('xpack.transform.multiTransformActionsMenu.transformsCount', {
            defaultMessage: '{count} {count, plural, one {transform} other {transforms}} selected',
            values: { count: transformSelection.length },
          })}
        </h3>
      </EuiTitle>,
      <div key="bulkActionsBorder" className="transform__BulkActionsBorder" />,
      bulkActionIcon,
    ];
  };

  const renderToolsRight = () => (
    <EuiFlexGroup gutterSize="m" justifyContent="spaceAround">
      <EuiFlexItem>
        <RefreshTransformListButton onClick={refresh} isLoading={isLoading} />
      </EuiFlexItem>
      <EuiFlexItem>
        <CreateTransformButton onClick={onCreateTransform} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const search = {
    toolsLeft: transformSelection.length > 0 ? renderToolsLeft() : undefined,
    toolsRight: renderToolsRight(),
    onChange: onQueryChange,
    box: {
      incremental: true,
    },
    filters: [
      {
        type: 'field_value_selection',
        field: 'state.state',
        name: i18n.translate('xpack.transform.statusFilter', { defaultMessage: 'Status' }),
        multiSelect: 'or',
        options: Object.values(TRANSFORM_STATE).map(val => ({
          value: val,
          name: val,
          view: getTaskStateBadge(val),
        })),
      },
      {
        type: 'field_value_selection',
        field: 'mode',
        name: i18n.translate('xpack.transform.modeFilter', { defaultMessage: 'Mode' }),
        multiSelect: false,
        options: Object.values(TRANSFORM_MODE).map(val => ({
          value: val,
          name: val,
          view: (
            <EuiBadge className="transform__TaskModeBadge" color="hollow">
              {val}
            </EuiBadge>
          ),
        })),
      },
    ],
  };

  const onTableChange = ({
    page = { index: 0, size: 10 },
    sort = { field: TRANSFORM_LIST_COLUMN.ID, direction: SORT_DIRECTION.ASC },
  }: OnTableChangeArg) => {
    const { index, size } = page;
    setPageIndex(index);
    setPageSize(size);

    const { field, direction } = sort;
    setSortField(field);
    setSortDirection(direction);
  };

  const selection = {
    onSelectionChange: (selected: TransformListRow[]) => setTransformSelection(selected),
  };

  return (
    <div data-test-subj="transformListTableContainer">
      <ProgressBar isLoading={isLoading || transformsLoading} />
      <TransformTable
        allowNeutralSort={false}
        className="transform__TransformTable"
        columns={columns}
        error={searchError}
        hasActions={false}
        isExpandable={true}
        isSelectable={false}
        items={filterActive ? filteredTransforms : transforms}
        itemId={TRANSFORM_LIST_COLUMN.ID}
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        onTableChange={onTableChange}
        pagination={pagination}
        rowProps={item => ({
          'data-test-subj': `transformListRow row-${item.id}`,
        })}
        selection={selection}
        sorting={sorting}
        search={search}
        data-test-subj={
          isLoading || transformsLoading
            ? 'transformListTable loading'
            : 'transformListTable loaded'
        }
      />
    </div>
  );
};
