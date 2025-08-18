/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable, EuiEmptyPrompt } from '@elastic/eui';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import React from 'react';
import { DEGRADED_DOCS_QUERY, FAILURE_STORE_SELECTOR } from '../../../../../common/constants';
import {
  overviewDegradedFieldsTableLoadingText,
  qualityIssuesTableNoData,
} from '../../../../../common/translations';
import {
  useDatasetDetailsRedirectLinkTelemetry,
  useDatasetQualityDetailsState,
  useQualityIssues,
  useRedirectLink,
} from '../../../../hooks';
import { NavigationSource } from '../../../../services/telemetry';
import type { QualityIssueType } from '../../../../state_machines/dataset_quality_details_controller';
import { getQualityIssuesColumns } from './columns';

export const QualityIssuesTable = () => {
  const {
    isDegradedFieldsLoading,
    pagination,
    renderedItems,
    onTableChange,
    sort,
    fieldFormats,
    openDegradedFieldFlyout,
  } = useQualityIssues();
  const { datasetDetails, timeRange } = useDatasetQualityDetailsState();

  const { sendTelemetry } = useDatasetDetailsRedirectLinkTelemetry({
    navigationSource: NavigationSource.Header,
  });

  const dateFormatter = fieldFormats.getDefaultInstance(KBN_FIELD_TYPES.DATE, [
    ES_FIELD_TYPES.DATE,
  ]);

  const degradedRedirectLinkProps = useRedirectLink({
    dataStreamStat: datasetDetails,
    timeRangeConfig: timeRange,
    query: {
      language: 'kuery',
      query: DEGRADED_DOCS_QUERY,
    },
    sendTelemetry,
  });

  const failedRedirectLinkProps = useRedirectLink({
    dataStreamStat: datasetDetails,
    timeRangeConfig: timeRange,
    query: {
      language: 'kuery',
      query: '',
    },
    selector: FAILURE_STORE_SELECTOR,
    sendTelemetry,
  });

  const getRedirectLinkProps = (name: string, type: QualityIssueType) => {
    return type === 'degraded' ? degradedRedirectLinkProps : failedRedirectLinkProps;
  };

  const columns = getQualityIssuesColumns({
    dateFormatter,
    isLoading: isDegradedFieldsLoading,
    openQualityIssueFlyout: openDegradedFieldFlyout,
    getRedirectLinkProps,
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
