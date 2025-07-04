/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { sortBy } from 'lodash';
import {
  EuiButton,
  EuiFlexGroup,
  EuiTable,
  EuiTableRow,
  EuiTableHeaderCell,
  EuiTableHeader,
  EuiSearchBar,
  EuiSpacer,
  EuiFlexItem,
  EuiTableBody,
  EuiTablePagination,
  EuiCallOut,
  EuiTableRowCell,
  Pager,
  Query,
} from '@elastic/eui';
import { EnrichedDeprecationInfo } from '../../../../common/types';
import { useAppContext } from '../../app_context';
import {
  MlSnapshotsTableRow,
  DefaultTableRow,
  IndexSettingsTableRow,
  IndexTableRow,
  ClusterSettingsTableRow,
  HealthIndicatorTableRow,
  DataStreamTableRow,
} from './deprecation_types';
import { DeprecationSortableTableColumns, DeprecationTableColumns } from '../types';
import { DEPRECATION_TYPE_MAP, PAGINATION_CONFIG } from '../constants';

const i18nTexts = {
  refreshButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.table.refreshButtonLabel',
    {
      defaultMessage: 'Refresh',
    }
  ),
  noDeprecationsMessage: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.table.noDeprecationsMessage',
    {
      defaultMessage: 'No Elasticsearch deprecation issues found',
    }
  ),
  typeFilterLabel: i18n.translate('xpack.upgradeAssistant.esDeprecations.table.typeFilterLabel', {
    defaultMessage: 'Type',
  }),
  statusFilterLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.table.statusFilterLabel',
    {
      defaultMessage: 'Status',
    }
  ),
  searchPlaceholderLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.table.searchPlaceholderLabel',
    {
      defaultMessage: 'Filter',
    }
  ),
};

const cellToLabelMap: Record<
  DeprecationTableColumns,
  {
    label: string;
    width: string;
    sortable: boolean;
    align: 'left' | 'right';
  }
> = {
  level: {
    label: i18n.translate('xpack.upgradeAssistant.esDeprecations.table.statusColumnTitle', {
      defaultMessage: 'Status',
    }),
    width: '8px',
    sortable: true,
    align: 'left',
  },
  message: {
    label: i18n.translate('xpack.upgradeAssistant.esDeprecations.table.issueColumnTitle', {
      defaultMessage: 'Issue',
    }),
    width: '28px',
    sortable: true,
    align: 'left',
  },
  type: {
    label: i18n.translate('xpack.upgradeAssistant.esDeprecations.table.typeColumnTitle', {
      defaultMessage: 'Type',
    }),
    width: '10px',
    sortable: true,
    align: 'left',
  },
  index: {
    label: i18n.translate('xpack.upgradeAssistant.esDeprecations.table.nameColumnTitle', {
      defaultMessage: 'Name',
    }),
    width: '20px',
    sortable: true,
    align: 'left',
  },
  correctiveAction: {
    label: i18n.translate('xpack.upgradeAssistant.esDeprecations.table.resolutionColumnTitle', {
      defaultMessage: 'Resolution',
    }),
    width: '20px',
    sortable: true,
    align: 'left',
  },
  actions: {
    label: i18n.translate('xpack.upgradeAssistant.esDeprecations.table.actionsColumnTitle', {
      defaultMessage: 'Actions',
    }),
    width: '8px',
    sortable: false,
    align: 'right',
  },
};

const cellTypes = Object.keys(cellToLabelMap) as DeprecationTableColumns[];
const pageSizeOptions = PAGINATION_CONFIG.pageSizeOptions;

const renderTableRow = (
  deprecation: EnrichedDeprecationInfo,
  mlUpgradeModeEnabled: boolean,
  index: number
) => {
  switch (deprecation.correctiveAction?.type) {
    case 'mlSnapshot':
      return (
        <MlSnapshotsTableRow
          deprecation={deprecation}
          rowFieldNames={cellTypes}
          mlUpgradeModeEnabled={mlUpgradeModeEnabled}
          index={index}
        />
      );

    case 'indexSetting':
      return (
        <IndexSettingsTableRow deprecation={deprecation} rowFieldNames={cellTypes} index={index} />
      );

    case 'clusterSetting':
      return (
        <ClusterSettingsTableRow
          deprecation={deprecation}
          rowFieldNames={cellTypes}
          index={index}
        />
      );

    case 'reindex':
    case 'unfreeze':
      return <IndexTableRow deprecation={deprecation} rowFieldNames={cellTypes} index={index} />;

    case 'healthIndicator':
      return (
        <HealthIndicatorTableRow
          deprecation={deprecation}
          rowFieldNames={cellTypes}
          index={index}
        />
      );

    case 'dataStream':
      return (
        <DataStreamTableRow deprecation={deprecation} rowFieldNames={cellTypes} index={index} />
      );

    default:
      return <DefaultTableRow deprecation={deprecation} rowFieldNames={cellTypes} index={index} />;
  }
};

interface Props {
  deprecations?: EnrichedDeprecationInfo[];
  reload: () => void;
}

interface SortConfig {
  isSortAscending: boolean;
  sortField: DeprecationSortableTableColumns;
}

const getSortedItems = (deprecations: EnrichedDeprecationInfo[], sortConfig: SortConfig) => {
  const { isSortAscending, sortField } = sortConfig;
  const sorted = sortBy(deprecations, [
    (deprecation) => {
      if (sortField === 'level') {
        // Critical deprecations should take precedence in ascending order
        return deprecation.level === 'critical' ? 0 : 1;
      }
      return deprecation[sortField];
    },
  ]);

  return isSortAscending ? sorted : sorted.reverse();
};

const statusFilterOptions = [
  {
    value: 'critical',
    name: i18n.translate('xpack.upgradeAssistant.esDeprecations.table.filter.critical', {
      defaultMessage: 'Critical',
    }),
  },
  {
    value: 'warning',
    name: i18n.translate('xpack.upgradeAssistant.esDeprecations.table.filter.warning', {
      defaultMessage: 'Warning',
    }),
  },
];

export const EsDeprecationsTable: React.FunctionComponent<Props> = ({
  deprecations = [],
  reload,
}) => {
  const {
    services: { api },
  } = useAppContext();
  const { data } = api.useLoadMlUpgradeMode();
  const mlUpgradeModeEnabled = !!data?.mlUpgradeModeEnabled;

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    isSortAscending: true,
    sortField: 'level',
  });

  const [itemsPerPage, setItemsPerPage] = useState(PAGINATION_CONFIG.initialPageSize);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState<Query>(EuiSearchBar.Query.MATCH_ALL);
  const [searchError, setSearchError] = useState<{ message: string } | undefined>(undefined);

  const [filteredDeprecations, setFilteredDeprecations] = useState<EnrichedDeprecationInfo[]>(
    getSortedItems(deprecations, sortConfig)
  );

  const pager = useMemo(
    () => new Pager(deprecations.length, itemsPerPage, currentPageIndex),
    [currentPageIndex, deprecations, itemsPerPage]
  );

  const visibleDeprecations = useMemo(
    () => filteredDeprecations.slice(pager.firstItemIndex, pager.lastItemIndex + 1),
    [filteredDeprecations, pager]
  );

  const handleSort = useCallback(
    (fieldName: DeprecationSortableTableColumns) => {
      const newSortConfig = {
        isSortAscending: sortConfig.sortField === fieldName ? !sortConfig.isSortAscending : true,
        sortField: fieldName,
      };
      setSortConfig(newSortConfig);
    },
    [sortConfig]
  );

  const handleSearch = useCallback(({ query, error }: any) => {
    if (error) {
      setSearchError(error);
    } else {
      setSearchError(undefined);
      setSearchQuery(query);
    }
  }, []);

  useEffect(() => {
    const { setTotalItems, goToPageIndex } = pager;
    const deprecationsFilteredByQuery = EuiSearchBar.Query.execute(searchQuery, deprecations);
    const deprecationsSortedByFieldType = getSortedItems(deprecationsFilteredByQuery, sortConfig);

    setTotalItems(deprecationsSortedByFieldType.length);
    setFilteredDeprecations(deprecationsSortedByFieldType);

    // Reset pagination if the filtered results return a different length
    if (deprecationsSortedByFieldType.length !== filteredDeprecations.length) {
      goToPageIndex(0);
    }
  }, [deprecations, sortConfig, pager, searchQuery, filteredDeprecations.length]);

  return (
    <>
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem data-test-subj="searchBarContainer">
          <EuiSearchBar
            box={{
              placeholder: i18nTexts.searchPlaceholderLabel,
              incremental: true,
            }}
            filters={[
              {
                type: 'field_value_selection',
                field: 'level',
                name: i18nTexts.statusFilterLabel,
                multiSelect: false,
                options: statusFilterOptions,
              },
              {
                type: 'field_value_selection',
                field: 'type',
                name: i18nTexts.typeFilterLabel,
                multiSelect: false,
                options: (
                  Object.keys(DEPRECATION_TYPE_MAP) as Array<keyof typeof DEPRECATION_TYPE_MAP>
                ).map((type) => ({
                  value: type,
                  name: DEPRECATION_TYPE_MAP[type],
                })),
              },
            ]}
            onChange={handleSearch}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="refresh"
            onClick={reload}
            data-test-subj="refreshButton"
            key="refreshButton"
          >
            {i18nTexts.refreshButtonLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {searchError && (
        <div data-test-subj="invalidSearchQueryMessage">
          <EuiSpacer size="l" />

          <EuiCallOut
            iconType="warning"
            color="danger"
            title={`Invalid search: ${searchError.message}`}
          />
        </div>
      )}

      <EuiSpacer size="m" />

      <EuiTable data-test-subj="esDeprecationsTable">
        <EuiTableHeader>
          {Object.entries(cellToLabelMap).map(([fieldName, cell]) => {
            return (
              <EuiTableHeaderCell
                width={cell.width}
                key={cell.label}
                onSort={() => handleSort(fieldName as DeprecationSortableTableColumns)}
                isSorted={sortConfig.sortField === fieldName}
                isSortAscending={sortConfig.isSortAscending}
                readOnly={!cell.sortable}
                align={cell.align}
              >
                {cell.label}
              </EuiTableHeaderCell>
            );
          })}
        </EuiTableHeader>

        {filteredDeprecations.length === 0 ? (
          <EuiTableBody>
            <EuiTableRow data-test-subj="noDeprecationsRow">
              <EuiTableRowCell
                align="center"
                colSpan={cellTypes.length}
                mobileOptions={{ width: '100%' }}
              >
                {i18nTexts.noDeprecationsMessage}
              </EuiTableRowCell>
            </EuiTableRow>
          </EuiTableBody>
        ) : (
          <EuiTableBody>
            {visibleDeprecations.map((deprecation, index) => {
              return (
                <React.Fragment key={`deprecation-row-${index}`}>
                  {renderTableRow(deprecation, mlUpgradeModeEnabled, index)}
                </React.Fragment>
              );
            })}
          </EuiTableBody>
        )}
      </EuiTable>

      <EuiSpacer size="m" />

      <EuiTablePagination
        data-test-subj="esDeprecationsPagination"
        activePage={pager.getCurrentPageIndex()}
        itemsPerPage={pager.itemsPerPage}
        itemsPerPageOptions={pageSizeOptions}
        pageCount={pager.getTotalPages()}
        onChangeItemsPerPage={setItemsPerPage}
        onChangePage={setCurrentPageIndex}
      />
    </>
  );
};
