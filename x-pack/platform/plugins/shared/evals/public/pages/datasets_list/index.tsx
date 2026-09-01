/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPageSection,
  EuiSpacer,
  EuiToolTip,
  useEuiTheme,
  type CriteriaWithPagination,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { type DatasetMaturity, type DatasetSummary } from '@kbn/evals-common';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { useDatasets } from '../../hooks/use_evals_api';
import { useEvalsPermissions } from '../../hooks/use_evals_permissions';
import { DeleteDatasetModal } from '../../components/delete_dataset_modal';
import {
  DatasetMaturityBadge,
  DatasetTagBadges,
  DatasetTagFilters,
} from '../../components/dataset_tags';
import { DatasetSpacesBadge } from '../../components/dataset_spaces';
import { useAccessibleSpaces } from '../../hooks/use_spaces';
import { CREATE_DATASET_PATH } from '../dataset_create/constants';
import * as i18n from './translations';

type SortableField = Extract<
  keyof DatasetSummary,
  'name' | 'examples_count' | 'updated_at' | 'maturity'
>;

export const DatasetsListPage: React.FC = () => {
  const history = useHistory();
  const { euiTheme } = useEuiTheme();
  const { canManage } = useEvalsPermissions();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<SortableField>('updated_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedMaturity, setSelectedMaturity] = useState<DatasetMaturity[]>([]);
  const [datasetPendingDelete, setDatasetPendingDelete] = useState<DatasetSummary | null>(null);

  const { isEnabled: spacesEnabled } = useAccessibleSpaces();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const { data, isLoading, error, refetch } = useDatasets({
    page: pageIndex + 1,
    perPage: pageSize,
    search: debouncedSearch || undefined,
    tags: selectedTags,
    maturity: selectedMaturity,
    sortField,
    sortOrder: sortDirection,
  });

  const toggleTagFilter = useCallback((tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag]
    );
    setPageIndex(0);
  }, []);

  const columns: Array<EuiBasicTableColumn<DatasetSummary>> = useMemo(() => {
    const baseColumns: Array<EuiBasicTableColumn<DatasetSummary>> = [
      {
        field: 'name',
        name: i18n.COLUMN_NAME,
        sortable: true,
        render: (datasetName: string, item: DatasetSummary) => (
          <EuiLink
            {...reactRouterNavigate(history, `/datasets/${item.id}`, (e: React.MouseEvent) =>
              e.stopPropagation()
            )}
          >
            <strong>{datasetName}</strong>
          </EuiLink>
        ),
      },
      {
        field: 'description',
        name: i18n.COLUMN_DESCRIPTION,
        render: (descriptionValue: string) => descriptionValue || '-',
      },
      {
        field: 'examples_count',
        name: i18n.COLUMN_EXAMPLES,
        sortable: true,
        width: '120px',
      },
      {
        field: 'tags',
        name: i18n.COLUMN_TAGS,
        render: (datasetTags: string[] | undefined) =>
          datasetTags?.length ? (
            <DatasetTagBadges tags={datasetTags} maxVisibleTags={3} onTagClick={toggleTagFilter} />
          ) : (
            '-'
          ),
      },
      {
        field: 'maturity',
        name: i18n.COLUMN_MATURITY,
        sortable: true,
        width: '110px',
        render: (datasetMaturity: DatasetMaturity | undefined) =>
          datasetMaturity ? <DatasetMaturityBadge maturity={datasetMaturity} /> : '-',
      },
      ...(spacesEnabled
        ? [
            {
              field: 'space_ids',
              name: i18n.COLUMN_SPACES,
              width: '120px',
              render: (datasetSpaceIds: string[] | undefined) => (
                <DatasetSpacesBadge spaceIds={datasetSpaceIds} />
              ),
            } as EuiBasicTableColumn<DatasetSummary>,
          ]
        : []),
      {
        field: 'updated_at',
        name: i18n.COLUMN_LAST_UPDATED,
        sortable: true,
        render: (updatedAt: string) => (updatedAt ? new Date(updatedAt).toLocaleString() : '-'),
      },
    ];

    if (canManage) {
      baseColumns.push({
        name: i18n.COLUMN_ACTIONS,
        width: '60px',
        align: 'right',
        render: (item: DatasetSummary) => (
          <EuiToolTip content={i18n.DELETE_DATASET_ACTION} disableScreenReaderOutput>
            <EuiButtonIcon
              aria-label={i18n.getDeleteDatasetAriaLabel(item.name)}
              iconType="trash"
              color="danger"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                setDatasetPendingDelete(item);
              }}
              data-test-subj="deleteDatasetButton"
            />
          </EuiToolTip>
        ),
      });
    }

    return baseColumns;
  }, [history, canManage, spacesEnabled, toggleTagFilter]);

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: data?.total ?? 0,
    pageSizeOptions: [10, 25, 50],
  };

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  const onTableChange = ({ page, sort }: CriteriaWithPagination<DatasetSummary>) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
    if (sort) {
      setSortField(sort.field as SortableField);
      setSortDirection(sort.direction);
    }
  };

  const openCreatePage = () => {
    history.push(CREATE_DATASET_PATH);
  };

  const clearFilters = () => {
    setSearchText('');
    setDebouncedSearch('');
    setSelectedTags([]);
    setSelectedMaturity([]);
    setPageIndex(0);
  };

  const datasets = data?.datasets ?? [];
  const hasActiveSearch = debouncedSearch.trim().length > 0;
  const hasSelectedFacets = selectedTags.length > 0 || selectedMaturity.length > 0;
  const hasActiveFilters = hasActiveSearch || hasSelectedFacets;
  const showNoDatasetsYet = !isLoading && !error && !hasActiveFilters && datasets.length === 0;
  const showNoMatches = !isLoading && !error && hasActiveFilters && datasets.length === 0;
  const showSearchBar = !error && !showNoDatasetsYet;

  return (
    <>
      <EuiPageSection paddingSize="none" css={{ paddingTop: euiTheme.size.l }}>
        {showSearchBar ? (
          <>
            <EuiFlexGroup
              responsive={false}
              alignItems="center"
              justifyContent="spaceBetween"
              gutterSize="m"
            >
              <EuiFlexItem>
                <EuiFlexGroup responsive={false} alignItems="center" gutterSize="m">
                  <EuiFlexItem css={{ maxWidth: 500 }}>
                    <EuiFieldSearch
                      placeholder={i18n.SEARCH_PLACEHOLDER}
                      value={searchText}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSearchText(value);
                        if (!value) {
                          setDebouncedSearch('');
                        }
                        setPageIndex(0);
                      }}
                      isClearable
                      fullWidth
                      aria-label={i18n.SEARCH_PLACEHOLDER}
                      data-test-subj="datasetsSearch"
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <DatasetTagFilters
                      facets={data?.facets}
                      selectedTags={selectedTags}
                      selectedMaturity={selectedMaturity}
                      onTagsChange={(nextTags) => {
                        setSelectedTags(nextTags);
                        setPageIndex(0);
                      }}
                      onMaturityChange={(nextMaturity) => {
                        setSelectedMaturity(nextMaturity);
                        setPageIndex(0);
                      }}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              {canManage ? (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    onClick={openCreatePage}
                    fill
                    iconType="plusCircle"
                    data-test-subj="createDatasetButton"
                  >
                    {i18n.CREATE_DATASET_BUTTON}
                  </EuiButton>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
            <EuiSpacer size="m" />
          </>
        ) : null}
        {error ? (
          <EuiEmptyPrompt
            color="danger"
            iconType="warning"
            title={<h2>{i18n.LOAD_ERROR_TITLE}</h2>}
            body={<p>{i18n.getLoadErrorBody(String(error))}</p>}
            actions={[
              <EuiButton onClick={() => refetch()} iconType="refresh">
                {i18n.RETRY_BUTTON}
              </EuiButton>,
            ]}
          />
        ) : showNoDatasetsYet ? (
          <EuiEmptyPrompt
            iconType="indexOpen"
            title={<h2>{i18n.NO_DATASETS_TITLE}</h2>}
            body={<p>{i18n.NO_DATASETS_BODY}</p>}
            actions={
              canManage
                ? [
                    <EuiButton
                      onClick={openCreatePage}
                      fill
                      iconType="plusCircle"
                      data-test-subj="createDatasetButton"
                    >
                      {i18n.CREATE_DATASET_BUTTON}
                    </EuiButton>,
                  ]
                : undefined
            }
          />
        ) : showNoMatches ? (
          <EuiEmptyPrompt
            iconType="magnify"
            title={<h2>{i18n.NO_MATCHES_TITLE}</h2>}
            body={
              <p>
                {hasActiveSearch
                  ? i18n.getNoMatchesBody(debouncedSearch)
                  : i18n.NO_FILTER_MATCHES_BODY}
              </p>
            }
            actions={[
              <EuiButton onClick={clearFilters} iconType="cross">
                {hasSelectedFacets ? i18n.CLEAR_FILTERS_BUTTON : i18n.CLEAR_SEARCH_BUTTON}
              </EuiButton>,
            ]}
          />
        ) : (
          <EuiBasicTable<DatasetSummary>
            tableCaption={i18n.TABLE_CAPTION}
            items={datasets}
            columns={columns}
            loading={isLoading}
            pagination={pagination}
            sorting={sorting}
            onChange={onTableChange}
            rowProps={(item) => ({
              onClick: () => history.push(`/datasets/${item.id}`),
              style: { cursor: 'pointer' },
            })}
          />
        )}
      </EuiPageSection>
      {datasetPendingDelete ? (
        <DeleteDatasetModal
          datasetId={datasetPendingDelete.id}
          datasetName={datasetPendingDelete.name}
          examplesCount={datasetPendingDelete.examples_count}
          spaceIds={datasetPendingDelete.space_ids}
          onClose={() => setDatasetPendingDelete(null)}
        />
      ) : null}
    </>
  );
};
