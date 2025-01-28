/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable, EuiEmptyPrompt } from '@elastic/eui';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import React from 'react';
import {
  overviewDegradedFieldsTableLoadingText,
  qualityIssuesTableNoData,
} from '../../../../../common/translations';
import { useQualityIssues } from '../../../../hooks/use_quality_issues';
import { getQualityIssuesColumns } from './columns';

export const QualityIssuesTable = () => {
  const {
    isDegradedFieldsLoading,
    pagination,
    renderedItems,
    onTableChange,
    sort,
    fieldFormats,
    expandedDegradedField,
    openDegradedFieldFlyout,
  } = useQualityIssues();
  const dateFormatter = fieldFormats.getDefaultInstance(KBN_FIELD_TYPES.DATE, [
    ES_FIELD_TYPES.DATE,
  ]);
  const columns = getQualityIssuesColumns({
    dateFormatter,
    isLoading: isDegradedFieldsLoading,
    expandedQualityIssue: expandedDegradedField,
    openQualityIssueFlyout: openDegradedFieldFlyout,
  });

  return (
    <EuiBasicTable
      tableLayout="fixed"
      columns={columns}
      items={renderedItems ?? []}
      loading={isDegradedFieldsLoading}
      sorting={sort}
      onChange={onTableChange}
      pagination={pagination}
      data-test-subj="datasetQualityDetailsDegradedFieldTable"
      rowProps={{
        'data-test-subj': 'datasetQualityDetailsDegradedTableRow',
      }}
      noItemsMessage={
        isDegradedFieldsLoading ? (
          overviewDegradedFieldsTableLoadingText
        ) : (
          <EuiEmptyPrompt
            data-test-subj="datasetQualityDetailsDegradedTableNoData"
            layout="vertical"
            title={<h2>{qualityIssuesTableNoData}</h2>}
            hasBorder={false}
            titleSize="m"
          />
        )
      }
    />
  );
};
