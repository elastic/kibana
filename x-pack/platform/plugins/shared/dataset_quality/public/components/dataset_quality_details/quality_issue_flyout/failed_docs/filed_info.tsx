/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  failedDocsErrorsColumnName,
  failedDocsErrorsColumnNameTooltip,
  overviewDegradedFieldsTableLoadingText,
} from '../../../../../common/translations';
import { useQualityIssues } from '../../../../hooks';
import React from 'react';
import { css } from '@emotion/css';

const failedDocsErrorsTableNoData = i18n.translate(
  'xpack.datasetQuality.details.qualityIssue.failedDocs.erros.noData',
  {
    defaultMessage: 'No errors found',
  }
);

export const FailedFieldInfo = () => {
  const {
    isDegradedFieldsLoading,
    failedDocsErrorsColumns,
    renderedFailedDocsErrorsItems,
    failedDocsErrorsSort,
    isFailedDocsErrorsLoading,
    resultsCount,
    failedDocsErrorsPagination,
    onFailedDocsErrorsTableChange,
  } = useQualityIssues();

  return (
    <>
      <EuiFlexGroup
        data-test-subj={`datasetQualityDetailsFailedDocsFlyoutFieldsList-cause`}
        direction="column"
        gutterSize="xs"
      >
        <EuiFlexGroup alignItems="center" gutterSize="xs">
          <EuiTitle size="xxs">
            <span>{failedDocsErrorsColumnName}</span>
          </EuiTitle>
          <EuiToolTip content={failedDocsErrorsColumnNameTooltip}>
            <EuiIcon size="s" color="subdued" type="question" className="eui-alignTop" />
          </EuiToolTip>
        </EuiFlexGroup>
        <EuiFlexItem
          data-test-subj="datasetQualityDetailsFailedDocsFlyoutFieldsList-cause"
          grow={2}
        >
          <EuiSpacer size="m" />
          <EuiText size="xs">
            <FormattedMessage
              id="xpack.datasetQuality.qualityIssueFlyout.table"
              defaultMessage="Showing {items}"
              values={{
                items: resultsCount,
              }}
            />
          </EuiText>
          <EuiHorizontalRule margin="xs" />
          <EuiBasicTable
            tableLayout="fixed"
            responsiveBreakpoint={true}
            columns={failedDocsErrorsColumns}
            items={renderedFailedDocsErrorsItems ?? []}
            loading={isFailedDocsErrorsLoading}
            sorting={failedDocsErrorsSort}
            onChange={onFailedDocsErrorsTableChange}
            data-test-subj="datasetQualityDetailsFailedDocsTable"
            rowProps={{
              'data-test-subj': 'datasetQualityDetailsFailedDocsTableRow',
            }}
            noItemsMessage={
              isDegradedFieldsLoading
                ? overviewDegradedFieldsTableLoadingText
                : failedDocsErrorsTableNoData
            }
            pagination={failedDocsErrorsPagination}
          />
        </EuiFlexItem>
        <EuiHorizontalRule margin="s" />
      </EuiFlexGroup>
    </>
  );
};
