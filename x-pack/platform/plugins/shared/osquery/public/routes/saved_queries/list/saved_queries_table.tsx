/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { CriteriaWithPagination, EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  EuiFlexItem,
  EuiSkeletonText,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import moment from 'moment-timezone';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import deepEqual from 'fast-deep-equal';
import { FormattedMessage } from '@kbn/i18n-react';
import { QUERY_TIMEOUT } from '../../../../common/constants';
import { useKibana, useRouterNavigate } from '../../../common/lib/kibana';
import { usePersistedPageSize, PAGE_SIZE_OPTIONS } from '../../../common/use_persisted_page_size';
import { useSavedQueries } from '../../../saved_queries/use_saved_queries';
import { useGenericBulkGetUserProfiles } from '../../../common/use_bulk_get_user_profiles';
import { RunByColumn } from '../../../actions/components/run_by_column';
import { TableToolbar } from '../../../components/table_toolbar';
import type { SortDirection } from '../../../components/table_toolbar';
import { SavedQueryRowActions } from './saved_query_row_actions';
import type { SavedQuerySO } from '.';

const EMPTY_ARRAY: SavedQuerySO[] = [];

const SEARCH_PLACEHOLDER = i18n.translate('xpack.osquery.savedQueryList.searchPlaceholder', {
  defaultMessage: 'Search by query ID or description',
});

const ALL_COLUMN_IDS = ['id', 'description', 'created_by', 'updated_at'] as const;

const COLUMN_CONFIGS = [
  {
    id: 'id',
    label: i18n.translate('xpack.osquery.savedQueries.table.queryIdColumnTitle', {
      defaultMessage: 'Query ID',
    }),
  },
  {
    id: 'description',
    label: i18n.translate('xpack.osquery.savedQueries.table.descriptionColumnTitle', {
      defaultMessage: 'Description',
    }),
  },
  {
    id: 'created_by',
    label: i18n.translate('xpack.osquery.savedQueries.table.createdByColumnTitle', {
      defaultMessage: 'Created by',
    }),
  },
  {
    id: 'updated_at',
    label: i18n.translate('xpack.osquery.savedQueries.table.updatedAtColumnTitle', {
      defaultMessage: 'Last updated at',
    }),
  },
];

const SORT_FIELDS = [
  {
    id: 'id',
    label: i18n.translate('xpack.osquery.savedQueries.sort.queryIdLabel', {
      defaultMessage: 'Query ID',
    }),
  },
  {
    id: 'updated_at',
    label: i18n.translate('xpack.osquery.savedQueries.sort.updatedAtLabel', {
      defaultMessage: 'Last updated at',
    }),
  },
];

const RUN_QUERY_PERMISSION_DENIED = i18n.translate(
  'xpack.osquery.savedQueryList.permissionDeniedRunTooltip',
  { defaultMessage: 'You do not have sufficient permissions to run this query.' }
);

interface PlayButtonProps {
  disabled: boolean;
  savedQuery: SavedQuerySO;
}

const PlayButtonComponent: React.FC<PlayButtonProps> = ({ disabled = false, savedQuery }) => {
  const { push } = useHistory();

  const handlePlayClick = useCallback(
    () =>
      push('/new', {
        form: {
          savedQueryId: savedQuery.id,
          query: savedQuery.query,
          ecs_mapping: savedQuery.ecs_mapping,
          timeout: savedQuery.timeout ?? QUERY_TIMEOUT.DEFAULT,
        },
      }),
    [push, savedQuery]
  );

  const playText = useMemo(
    () =>
      i18n.translate('xpack.osquery.savedQueryList.queriesTable.runActionAriaLabel', {
        defaultMessage: 'Run {savedQueryName}',
        values: { savedQueryName: savedQuery.id },
      }),
    [savedQuery]
  );

  const tooltipContent = disabled ? RUN_QUERY_PERMISSION_DENIED : playText;

  return (
    <EuiToolTip position="top" content={tooltipContent}>
      <EuiButtonIcon
        color="primary"
        iconType="play"
        isDisabled={disabled}
        onClick={handlePlayClick}
        aria-label={playText}
      />
    </EuiToolTip>
  );
};

const PlayButton = React.memo(PlayButtonComponent, deepEqual);

const updatedAtCss = {
  whiteSpace: 'nowrap' as const,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const SavedQueriesTableComponent = () => {
  const permissions = useKibana().services.application.capabilities.osquery;
  const newQueryLinkProps = useRouterNavigate('saved_queries/new');

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize();
  const [sortField, setSortField] = useState('updated_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchValue, setSearchValue] = useState('');
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([...ALL_COLUMN_IDS]);

  const createdByParam = selectedCreators.length > 0 ? selectedCreators.join(',') : undefined;

  const { data, isLoading, isFetching } = useSavedQueries({
    pageIndex,
    pageSize,
    sortField,
    sortOrder: sortDirection,
    search: searchValue || undefined,
    createdBy: createdByParam,
  });

  const items = useMemo(() => data?.data ?? EMPTY_ARRAY, [data?.data]);
  const totalItemCount = data?.total ?? 0;

  const profileUids = useMemo(
    () => items.map((item) => item.created_by_profile_uid).filter(Boolean) as string[],
    [items]
  );

  const { profilesMap, isLoading: isLoadingProfiles } = useGenericBulkGetUserProfiles(profileUids);

  const creators = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.created_by) {
        set.add(item.created_by);
      }
    }

    return Array.from(set);
  }, [items]);

  const handleSearchSubmit = useCallback((value: string) => {
    setSearchValue(value);
    setPageIndex(0);
  }, []);

  const handleSelectedCreatorsChange = useCallback((newCreators: string[]) => {
    setSelectedCreators(newCreators);
    setPageIndex(0);
  }, []);

  const handleSortChange = useCallback((field: string, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
    setPageIndex(0);
  }, []);

  const handlePageSizeChange = useCallback(
    (size: number) => {
      setPageSize(size);
      setPageIndex(0);
    },
    [setPageSize]
  );

  const renderPlayAction = useCallback(
    (item: SavedQuerySO) => (
      <PlayButton savedQuery={item} disabled={!permissions.runSavedQueries} />
    ),
    [permissions.runSavedQueries]
  );

  const renderCreatedByColumn = useCallback(
    (_: unknown, item: SavedQuerySO) => (
      <RunByColumn
        userId={item.created_by}
        userProfileUid={item.created_by_profile_uid}
        profilesMap={profilesMap}
        isLoadingProfiles={isLoadingProfiles}
      />
    ),
    [profilesMap, isLoadingProfiles]
  );

  const renderDescriptionColumn = useCallback((description?: string) => {
    if (!description) return <>-</>;
    const content = description.length > 80 ? `${description.substring(0, 80)}...` : description;

    return (
      <EuiToolTip content={<EuiFlexItem>{description}</EuiFlexItem>}>
        <EuiFlexItem grow={false}>{content}</EuiFlexItem>
      </EuiToolTip>
    );
  }, []);

  const renderUpdatedAt = useCallback((updatedAt: string) => {
    if (!updatedAt) return <>-</>;

    return (
      <EuiToolTip content={moment(updatedAt).format('llll')}>
        <span tabIndex={0} css={updatedAtCss}>
          {moment(updatedAt).fromNow()}
        </span>
      </EuiToolTip>
    );
  }, []);

  const visibleSet = useMemo(() => new Set(visibleColumns), [visibleColumns]);

  const columns = useMemo(() => {
    const cols: Array<EuiBasicTableColumn<SavedQuerySO>> = [
      {
        name: i18n.translate('xpack.osquery.savedQueries.table.actionsColumnTitle', {
          defaultMessage: 'Actions',
        }),
        width: '75px',
        render: (item: SavedQuerySO) => renderPlayAction(item),
      },
    ];

    if (visibleSet.has('id')) {
      cols.push({
        field: 'id',
        name: i18n.translate('xpack.osquery.savedQueries.table.queryIdColumnTitle', {
          defaultMessage: 'Query ID',
        }),
        sortable: true,
        truncateText: true,
      });
    }

    if (visibleSet.has('description')) {
      cols.push({
        field: 'description',
        name: i18n.translate('xpack.osquery.savedQueries.table.descriptionColumnTitle', {
          defaultMessage: 'Description',
        }),
        render: renderDescriptionColumn,
        truncateText: true,
      });
    }

    if (visibleSet.has('created_by')) {
      cols.push({
        field: 'created_by',
        name: i18n.translate('xpack.osquery.savedQueries.table.createdByColumnTitle', {
          defaultMessage: 'Created by',
        }),
        render: renderCreatedByColumn,
        width: '200px',
      });
    }

    if (visibleSet.has('updated_at')) {
      cols.push({
        field: 'updated_at',
        name: i18n.translate('xpack.osquery.savedQueries.table.updatedAtColumnTitle', {
          defaultMessage: 'Last updated at',
        }),
        sortable: true,
        render: renderUpdatedAt,
        width: '180px',
      });
    }

    cols.push({
      width: '40px',
      render: (item: SavedQuerySO) => <SavedQueryRowActions item={item} />,
    });

    return cols;
  }, [
    visibleSet,
    renderPlayAction,
    renderCreatedByColumn,
    renderDescriptionColumn,
    renderUpdatedAt,
  ]);

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount,
      pageSizeOptions: [...PAGE_SIZE_OPTIONS],
    }),
    [pageIndex, pageSize, totalItemCount]
  );

  const sorting = useMemo(
    () => ({
      sort: {
        field: sortField as keyof SavedQuerySO,
        direction: sortDirection,
      },
    }),
    [sortField, sortDirection]
  );

  const onTableChange = useCallback(
    ({ page, sort }: CriteriaWithPagination<SavedQuerySO>) => {
      if (page) {
        setPageIndex(page.index);
        if (page.size !== pageSize) {
          handlePageSizeChange(page.size);
        }
      }

      if (sort) {
        setSortField(sort.field as string);
        setSortDirection(sort.direction);
      }
    },
    [pageSize, handlePageSizeChange]
  );

  const saveQueryButton = useMemo(
    () => (
      <EuiButton
        fill
        {...newQueryLinkProps}
        iconType="plusInCircle"
        isDisabled={!permissions.writeSavedQueries}
      >
        <FormattedMessage
          id="xpack.osquery.savedQueryList.saveQueryButtonLabel"
          defaultMessage="Save query"
        />
      </EuiButton>
    ),
    [permissions.writeSavedQueries, newQueryLinkProps]
  );

  if (isLoading) {
    return <EuiSkeletonText lines={10} />;
  }

  return (
    <>
      <TableToolbar
        searchPlaceholder={SEARCH_PLACEHOLDER}
        searchValue={searchValue}
        onSearchSubmit={handleSearchSubmit}
        creators={creators}
        selectedCreators={selectedCreators}
        onSelectedCreatorsChange={handleSelectedCreatorsChange}
        profilesMap={profilesMap}
        columnConfigs={COLUMN_CONFIGS}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        sortFields={SORT_FIELDS}
        sortField={sortField}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        actionButton={saveQueryButton}
        data-test-subj="saved-queries-toolbar"
      />
      <EuiSpacer size="s" />
      <EuiBasicTable<SavedQuerySO>
        items={items}
        itemId="saved_object_id"
        columns={columns}
        pagination={pagination}
        sorting={sorting}
        onChange={onTableChange}
        loading={isFetching && !isLoading}
        tableCaption={i18n.translate('xpack.osquery.savedQueryList.queriesTable.tableCaption', {
          defaultMessage: 'Saved queries',
        })}
        data-test-subj="savedQueriesTable"
      />
    </>
  );
};

export const SavedQueriesTable = React.memo(SavedQueriesTableComponent);
SavedQueriesTable.displayName = 'SavedQueriesTable';
