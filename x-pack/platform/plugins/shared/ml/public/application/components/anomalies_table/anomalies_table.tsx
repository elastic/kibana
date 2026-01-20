/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRangeBounds } from '@kbn/data-plugin/common';
import React, { useState, type FC, useEffect, useMemo, useCallback, useRef } from 'react';
import { usePageUrlState } from '@kbn/ml-url-state';
import type { MlAnomaliesTableRecordExtended } from '@kbn/ml-anomaly-utils';
import { get, isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { CriteriaWithPagination, EuiBasicTableColumn } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiInMemoryTable, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import type {
  AnomaliesTableData,
  ExplorerJob,
  SourceIndicesWithGeoFields,
} from '../../explorer/explorer_utils';
import type { FilterAction } from '../../explorer/explorer_constants';
import { useMlKibana } from '../../contexts/kibana';
import { ANOMALIES_TABLE_TABS, INFLUENCERS_LIMIT, MAX_CHARS } from './anomalies_table_constants';
import { AnomalyDetails } from './anomaly_details';
import { mlTableService } from '../../services/table_service';
import { getColumns } from './anomalies_table_columns';
import { RuleEditorFlyout } from '../rule_editor';
import type { FocusTrapProps } from '../../util/create_focus_trap_props';
import { MlAnomalyAlertFlyout } from '../../../alerting/ml_alerting_flyout';
import type { MlAnomalyDetectionAlertParams } from '../../../../common/types/alerts';
import { buildAlertParamsFromAnomaly } from './build_alert_params_from_anomaly';

interface AnomaliesTableProps {
  bounds?: TimeRangeBounds;
  tableData: AnomaliesTableData;
  filter?: (field: string, value: string, operator: string) => void;
  influencerFilter?: (fieldName: string, fieldValue: string, action: FilterAction) => void;
  sourceIndicesWithGeoFields: SourceIndicesWithGeoFields;
  selectedJobs: ExplorerJob[];
}

interface AnomaliesTableState {
  pageIndex: number;
  pageSize: number;
  sortField: string;
  sortDirection: 'asc' | 'desc';
}

interface AnomaliesTablePageUrlState {
  pageKey: 'mlAnomaliesTable';
  pageUrlState: AnomaliesTableState;
}

export const getDefaultAnomaliesTableState = (): AnomaliesTableState => ({
  pageIndex: 0,
  pageSize: 25,
  sortField: 'severity',
  sortDirection: 'desc',
});

export const AnomaliesTable: FC<AnomaliesTableProps> = React.memo(
  ({ bounds, tableData, filter, influencerFilter, sourceIndicesWithGeoFields, selectedJobs }) => {
    const [tableState, updateTableState] = usePageUrlState<AnomaliesTablePageUrlState>(
      'mlAnomaliesTable',
      getDefaultAnomaliesTableState()
    );

    const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<
      Record<string, JSX.Element>
    >({});

    // When the table data changes, reset the table page index to 0.
    useUpdateEffect(() => {
      updateTableState({
        ...tableState,
        pageIndex: 0,
      });
    }, [tableData]);

    const [showRuleEditorFlyout, setShowRuleEditorFlyout] = useState<
      ((anomaly: MlAnomaliesTableRecordExtended, focusTrapProps: FocusTrapProps) => void) | null
    >(null);

    const [alertFlyoutVisible, setAlertFlyoutVisible] = useState(false);
    const [alertFlyoutParams, setAlertFlyoutParams] = useState<
      Partial<MlAnomalyDetectionAlertParams> | undefined
    >();

    const {
      services: { mlServices },
    } = useMlKibana();

    const mouseOverRecordRef = useRef<MlAnomaliesTableRecordExtended>();

    const handleSetShowFunction = useCallback(
      (showFunction: (anomaly: MlAnomaliesTableRecordExtended) => void) => {
        setShowRuleEditorFlyout(() => showFunction);
      },
      []
    );

    const handleUnsetShowFunction = useCallback(() => {
      setShowRuleEditorFlyout(null);
    }, []);

    const handleShowAnomalyAlertFlyout = useCallback((anomaly: MlAnomaliesTableRecordExtended) => {
      const initialParams = buildAlertParamsFromAnomaly(anomaly);
      setAlertFlyoutParams(initialParams);
      setAlertFlyoutVisible(true);
    }, []);

    useEffect(
      function resetExpandedRowMap() {
        const expandedRowIds = Object.keys(itemIdToExpandedRowMap);
        const expandedNotInData = expandedRowIds.find((rowId) => {
          return !tableData.anomalies.some((anomaly) => anomaly.rowId === rowId);
        });

        if (expandedNotInData !== undefined) {
          setItemIdToExpandedRowMap({});
        }
      },
      [itemIdToExpandedRowMap, tableData.anomalies]
    );

    const isShowingAggregatedData = useMemo(() => {
      return tableData.interval !== 'second';
    }, [tableData.interval]);

    const toggleRow = useCallback(
      async (item: MlAnomaliesTableRecordExtended, tab = ANOMALIES_TABLE_TABS.DETAILS) => {
        const newItemIdToExpandedRowMap = { ...itemIdToExpandedRowMap };

        if (newItemIdToExpandedRowMap[item.rowId]) {
          delete newItemIdToExpandedRowMap[item.rowId];
        } else {
          const examples =
            item.entityName === 'mlcategory'
              ? get(tableData, ['examplesByJobId', item.jobId, item.entityValue])
              : undefined;
          let definition;
          let categoryDefinitionError: string | undefined;

          if (examples !== undefined) {
            try {
              definition = await mlServices.mlApi.results.getCategoryDefinition(
                item.jobId,
                item.source.mlcategory[0]
              );

              if (definition.terms && definition.terms.length > MAX_CHARS) {
                definition.terms = `${definition.terms.substring(0, MAX_CHARS)}...`;
              }

              if (definition.regex && definition.regex.length > MAX_CHARS) {
                definition.terms = `${definition.regex.substring(0, MAX_CHARS)}...`;
              }
            } catch (error) {
              categoryDefinitionError = extractErrorMessage(error);
            }
          }

          const job = selectedJobs.find(({ id }) => id === item.jobId);

          newItemIdToExpandedRowMap[item.rowId] = (
            <AnomalyDetails
              tabIndex={tab}
              anomaly={item}
              examples={examples}
              definition={definition}
              categoryDefinitionError={categoryDefinitionError}
              isAggregatedData={isShowingAggregatedData}
              filter={filter}
              influencerFilter={influencerFilter}
              influencersLimit={INFLUENCERS_LIMIT}
              job={job!}
            />
          );
        }

        setItemIdToExpandedRowMap(newItemIdToExpandedRowMap);
      },
      [
        filter,
        influencerFilter,
        isShowingAggregatedData,
        itemIdToExpandedRowMap,
        mlServices.mlApi.results,
        selectedJobs,
        tableData,
      ]
    );

    const onMouseOverRow = useCallback((record: MlAnomaliesTableRecordExtended) => {
      if (mouseOverRecordRef.current !== undefined) {
        if (mouseOverRecordRef.current.rowId !== record.rowId) {
          // Mouse is over a different row, fire mouseleave on the previous record.
          mlTableService.rowMouseleave$.next({ record: mouseOverRecordRef.current });

          // fire mouseenter on the new record.
          mlTableService.rowMouseenter$.next({ record });
        }
      } else {
        // Mouse is now over a row, fire mouseenter on the record.
        mlTableService.rowMouseenter$.next({ record });
      }

      mouseOverRecordRef.current = record;
    }, []);

    const onMouseLeaveRow = useCallback(() => {
      if (mouseOverRecordRef.current !== undefined) {
        mlTableService.rowMouseleave$.next({ record: mouseOverRecordRef.current });
        mouseOverRecordRef.current = undefined;
      }
    }, []);

    const onTableChange = useCallback(
      (criteria: CriteriaWithPagination<MlAnomaliesTableRecordExtended>) => {
        const { page, sort } = criteria;
        const result = {
          pageIndex: page && page.index !== undefined ? page.index : tableState.pageIndex,
          pageSize: page && page.size !== undefined ? page.size : tableState.pageSize,
          sortField:
            sort && sort.field !== undefined && typeof sort.field === 'string'
              ? sort.field
              : tableState.sortField,
          sortDirection:
            sort && sort.direction !== undefined ? sort.direction : tableState.sortDirection,
        };
        updateTableState(result);
      },
      [tableState, updateTableState]
    );

    const sorting = useMemo(() => {
      return {
        sort: {
          field: tableState.sortField,
          direction: tableState.sortDirection,
        },
      };
    }, [tableState.sortField, tableState.sortDirection]);

    const pagination = useMemo(() => {
      return {
        pageIndex: tableState.pageIndex,
        pageSize: tableState.pageSize,
        totalItemCount: tableData.anomalies.length,
        pageSizeOptions: [10, 25, 100],
      };
    }, [tableState.pageIndex, tableState.pageSize, tableData.anomalies.length]);

    const columns = useMemo(
      () =>
        getColumns(
          mlServices.mlFieldFormatService,
          tableData.anomalies,
          tableData.jobIds,
          tableData.examplesByJobId,
          isShowingAggregatedData,
          tableData.interval,
          bounds,
          tableData.showViewSeriesLink,
          showRuleEditorFlyout,
          itemIdToExpandedRowMap,
          toggleRow,
          filter,
          influencerFilter,
          sourceIndicesWithGeoFields,
          handleShowAnomalyAlertFlyout
        ),
      [
        bounds,
        filter,
        influencerFilter,
        isShowingAggregatedData,
        itemIdToExpandedRowMap,
        mlServices.mlFieldFormatService,
        showRuleEditorFlyout,
        sourceIndicesWithGeoFields,
        tableData.anomalies,
        tableData.examplesByJobId,
        tableData.interval,
        tableData.jobIds,
        tableData.showViewSeriesLink,
        toggleRow,
        handleShowAnomalyAlertFlyout,
      ]
    );

    if (
      tableData === undefined ||
      tableData.anomalies === undefined ||
      tableData.anomalies.length === 0
    ) {
      return (
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiText>
              <h4>
                <FormattedMessage
                  id="xpack.ml.anomaliesTable.noMatchingAnomaliesFoundTitle"
                  defaultMessage="No matching anomalies found"
                />
              </h4>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    // Use auto table layout, unless any columns (categorization examples) have truncateText
    // set to true which only works with a fixed layout.
    const tableLayout = columns.some(
      (column) => 'truncateText' in column && column.truncateText === true
    )
      ? 'fixed'
      : 'auto';

    const getRowProps = (item: MlAnomaliesTableRecordExtended) => {
      return {
        onMouseOver: () => onMouseOverRow(item),
        onMouseLeave: () => onMouseLeaveRow(),
        'data-test-subj': `mlAnomaliesListRow row-${item.rowId}`,
      };
    };

    return (
      <>
        <RuleEditorFlyout
          setShowFunction={handleSetShowFunction}
          unsetShowFunction={handleUnsetShowFunction}
        />
        {alertFlyoutVisible && alertFlyoutParams && (
          <MlAnomalyAlertFlyout
            onCloseFlyout={() => setAlertFlyoutVisible(false)}
            initialParams={alertFlyoutParams}
          />
        )}
        <EuiInMemoryTable
          className="eui-textBreakWord"
          items={tableData.anomalies}
          // TODO - fix type
          columns={columns as Array<EuiBasicTableColumn<MlAnomaliesTableRecordExtended>>}
          tableLayout={tableLayout}
          pagination={pagination}
          sorting={sorting}
          itemId="rowId"
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
          compressed={true}
          rowProps={getRowProps}
          data-test-subj="mlAnomaliesTable"
          onTableChange={onTableChange}
          tableCaption={i18n.translate('xpack.ml.anomaliesTable.tableCaption', {
            defaultMessage: 'Anomalies detected for the selected jobs',
          })}
        />
      </>
    );
  },
  (prevProps, nextProps) => {
    return isEqual(prevProps, nextProps);
  }
);
