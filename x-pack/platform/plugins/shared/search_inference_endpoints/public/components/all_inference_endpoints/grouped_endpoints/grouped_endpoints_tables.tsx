/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiAccordion,
  EuiButtonEmpty,
  type EuiBasicTableColumn,
  EuiFlexGroup,
  EuiInMemoryTable,
  EuiPanel,
  EuiEmptyPrompt,
  EuiSpacer,
  type EuiTableFieldDataColumnType,
  type EuiTableComputedColumnType,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import {
  isGroupOpen,
  useGroupsAccordionToggleState,
} from '../../../hooks/use_groups_accordion_toggle_state';
import { useGroupedData } from '../../../hooks/use_grouped_data';
import { GroupByOptions, type FilterOptions, type GroupByViewOptions } from '../../../types';
import { GroupPanelStyle } from './styles';
import { GroupByHeaderButton } from './group_header_button';
import { INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES } from '../types';
import { ServiceDescription } from './service_description';
import { EndpointStats } from '../endpoint_stats';

export interface GroupedEndpointsTablesProps {
  inferenceEndpoints: InferenceAPIConfigResponse[];
  groupBy: GroupByViewOptions;
  filterOptions: FilterOptions;
  searchKey: string;
  columns: EuiBasicTableColumn<InferenceAPIConfigResponse>[];
}

function isColumnWithId(
  column: EuiBasicTableColumn<InferenceAPIConfigResponse>
): column is
  | EuiTableFieldDataColumnType<InferenceAPIConfigResponse>
  | EuiTableComputedColumnType<InferenceAPIConfigResponse> {
  return 'id' in column;
}

export const GroupedEndpointsTables = ({
  inferenceEndpoints,
  groupBy,
  filterOptions,
  searchKey,
  columns,
}: GroupedEndpointsTablesProps) => {
  const { groupedEndpoints, filteredEndpoints } = useGroupedData(
    inferenceEndpoints,
    groupBy,
    filterOptions,
    searchKey
  );

  const { groupToggleState, expandAll, collapseAll, toggleGroup } = useGroupsAccordionToggleState(
    inferenceEndpoints,
    groupBy
  );

  const tableColumns = useMemo(() => {
    switch (groupBy) {
      case GroupByOptions.Service:
        // remove service column when grouping by service
        return columns.filter((col) => (isColumnWithId(col) ? col?.id !== 'service-column' : true));
    }
    return columns;
  }, [columns, groupBy]);

  if (inferenceEndpoints.length === 0 || groupedEndpoints.length === 0) {
    // No data after filters / search key
    return (
      <EuiEmptyPrompt
        title={
          <h2>
            {i18n.translate('xpack.searchInferenceEndpoints.table.noItemsMessage', {
              defaultMessage: 'No items found',
            })}
          </h2>
        }
      />
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="group-by-tables-container">
      <EuiFlexGroup alignItems="center" gutterSize="xs">
        <EndpointStats endpoints={filteredEndpoints} />
        <EuiButtonEmpty onClick={expandAll} data-test-subj="expandAllGroups">
          {i18n.translate('xpack.searchInferenceEndpoints.groupedEndpoints.expandAll', {
            defaultMessage: 'Expand all',
          })}
        </EuiButtonEmpty>
        <span aria-hidden> · </span>
        <EuiButtonEmpty onClick={collapseAll} data-test-subj="collapseAllGroups">
          {i18n.translate('xpack.searchInferenceEndpoints.groupedEndpoints.collapseAll', {
            defaultMessage: 'Collapse all',
          })}
        </EuiButtonEmpty>
      </EuiFlexGroup>
      {groupedEndpoints.map((groupedData) => {
        const groupOpen = isGroupOpen(groupToggleState, groupedData.groupId);
        return (
          <EuiPanel
            key={groupedData.groupId}
            element="div"
            hasShadow={false}
            hasBorder
            paddingSize="none"
            css={GroupPanelStyle}
            data-is-open={groupOpen}
          >
            <EuiAccordion
              id={`${groupedData.groupId}-group-accordion`}
              arrowProps={{
                size: 's',
              }}
              buttonProps={{
                paddingSize: 'm',
              }}
              buttonContent={<GroupByHeaderButton data={groupedData} groupBy={groupBy} />}
              extraAction={
                groupBy === GroupByOptions.Service ? (
                  <ServiceDescription service={groupedData.groupId} />
                ) : undefined
              }
              data-test-subj={`${groupedData.groupId}-accordion`}
              forceState={groupOpen ? 'open' : 'closed'}
              onToggle={(open) => toggleGroup(groupedData.groupId, open)}
              paddingSize="none"
            >
              <EuiSpacer size="s" />
              <EuiInMemoryTable
                data-test-subj={`${groupedData.groupId}-table`}
                itemId="inference_id"
                items={groupedData.endpoints}
                columns={tableColumns}
                pagination={
                  groupedData.endpoints.length > INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES[0]
                    ? {
                        pageSizeOptions: INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES,
                      }
                    : undefined
                }
                sorting={{
                  sort: {
                    field: 'inference_id',
                    direction: 'asc',
                  },
                }}
                tableCaption={i18n.translate(
                  'xpack.searchInferenceEndpoints.groupedEndpoints.tableCaption',
                  {
                    defaultMessage: 'Inference endpoints list grouped by {groupBy}: {groupId}',
                    values: { groupBy, groupId: groupedData.groupId },
                  }
                )}
              />
            </EuiAccordion>
          </EuiPanel>
        );
      })}
    </EuiFlexGroup>
  );
};
