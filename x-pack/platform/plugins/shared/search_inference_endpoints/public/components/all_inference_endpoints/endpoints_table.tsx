/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { type EuiBasicTableColumn, EuiInMemoryTable } from '@elastic/eui';

import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

import { INFERENCE_ENDPOINTS_TABLE_CAPTION } from '../../../common/translations';
import { useFilteredInferenceEndpoints } from '../../hooks/use_filtered_endpoints';
import type { FilterOptions } from '../../types';
import { EndpointStats } from './endpoint_stats';
import { INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES } from './types';

export interface EndpointsTableProps {
  inferenceEndpoints: InferenceAPIConfigResponse[];
  filterOptions: FilterOptions;
  searchKey: string;
  columns: EuiBasicTableColumn<InferenceAPIConfigResponse>[];
}

export const EndpointsTable = ({
  inferenceEndpoints,
  filterOptions,
  searchKey,
  columns,
}: EndpointsTableProps) => {
  const tableData = useFilteredInferenceEndpoints(inferenceEndpoints, filterOptions, searchKey);
  return (
    <>
      <EndpointStats endpoints={tableData} />
      <EuiInMemoryTable
        allowNeutralSort={false}
        columns={columns}
        itemId="inference_id"
        items={tableData}
        pagination={{
          pageSizeOptions: INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES,
        }}
        sorting={{
          sort: {
            field: 'inference_id',
            direction: 'asc',
          },
        }}
        data-test-subj="inferenceEndpointTable"
        tableCaption={INFERENCE_ENDPOINTS_TABLE_CAPTION}
      />
    </>
  );
};
