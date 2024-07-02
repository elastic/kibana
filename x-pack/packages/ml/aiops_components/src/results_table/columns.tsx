/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiCode, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { type SignificantItem } from '@kbn/ml-agg-utils';

import { NARROW_COLUMN_WIDTH } from './constants';

const TRUNCATE_TEXT_LINES = 3;

export const getFieldNameColumn = (): EuiBasicTableColumn<SignificantItem> => {
  return {
    'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnFieldName',
    width: NARROW_COLUMN_WIDTH,
    field: 'fieldName',
    name: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.fieldNameLabel', {
      defaultMessage: 'Field name',
    }),
    render: (_, { fieldName }) => {
      return (
        <span title={fieldName} className="eui-textTruncate">
          {fieldName}
        </span>
      );
    },
    sortable: true,
    valign: 'middle',
  };
};

export const getFieldValueColumn = (narrow = false): EuiBasicTableColumn<SignificantItem> => {
  return {
    'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnFieldValue',
    field: 'fieldValue',
    width: narrow ? '17%' : '25%',
    name: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.fieldValueLabel', {
      defaultMessage: 'Field value',
    }),
    render: (_, { fieldValue, type }) => (
      <span title={String(fieldValue)}>
        {type === 'keyword' ? (
          String(fieldValue)
        ) : (
          <EuiText size="xs">
            <EuiCode language="log" transparentBackground css={{ paddingInline: '0px' }}>
              {String(fieldValue)}
            </EuiCode>
          </EuiText>
        )}
      </span>
    ),
    sortable: true,
    textOnly: true,
    truncateText: { lines: TRUNCATE_TEXT_LINES },
    valign: 'middle',
  };
};

export const getChangeDescriptionColumn = (): EuiBasicTableColumn<SignificantItem> => {
  return {
    'data-test-subj': 'aiopsLogRateAnalysisResultsTableColumnChangeDescription',
    field: 'changeDescription',
    name: i18n.translate('xpack.aiops.logRateAnalysis.resultsTable.changeDescriptionLabel', {
      defaultMessage: 'Log rate change',
    }),
    sortable: true,
    valign: 'middle',
  };
};
