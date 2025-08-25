/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiButtonIcon, EuiText, formatNumber } from '@elastic/eui';
import { css } from '@emotion/react';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { QualityIssue } from '../../../../../common/api_types';
import { NUMBER_FORMAT } from '../../../../../common/constants';
import {
  degradedField,
  documentIndexFailed,
  documentsColumnName,
  fieldColumnName,
  issueColumnName,
  lastOccurrenceColumnName,
} from '../../../../../common/translations';
import type { QualityIssueType } from '../../../../state_machines/dataset_quality_details_controller';
import { SparkPlot } from '../../../common/spark_plot';

const expandDatasetAriaLabel = i18n.translate(
  'xpack.datasetQuality.details.qualityIssuesTable.expand',
  {
    defaultMessage: 'Expand',
  }
);

export const getQualityIssuesColumns = ({
  dateFormatter,
  isLoading,
  openQualityIssueFlyout,
}: {
  dateFormatter: FieldFormat;
  isLoading: boolean;
  openQualityIssueFlyout: (name: string, type: QualityIssueType) => void;
}): Array<EuiBasicTableColumn<QualityIssue>> => [
  {
    name: '',
    field: 'name',
    render: (_, { name, type }) => {
      const onExpandClick = () => {
        openQualityIssueFlyout(name, type);
      };

      return (
        <EuiButtonIcon
          data-test-subj="datasetQualityDetailsQualityIssuesExpandButton"
          size="xs"
          color="text"
          onClick={onExpandClick}
          iconType={'expand'}
          title={expandDatasetAriaLabel}
          aria-label={expandDatasetAriaLabel}
        />
      );
    },
    width: '40px',
    css: css`
      &.euiTableCellContent {
        padding: 0;
      }
    `,
  },
  {
    name: fieldColumnName,
    field: 'name',
    render: (_, { name, type }) => {
      return <EuiText size="s">{name}</EuiText>;
    },
  },
  {
    name: issueColumnName,
    field: 'name',
    render: (_, { name, type }) => {
      return (
        <EuiText size="s">{type === 'degraded' ? degradedField : documentIndexFailed}</EuiText>
      );
    },
  },
  {
    name: documentsColumnName,
    field: 'count',
    align: 'right',
    render: (_, { count, timeSeries }) => {
      const countValue = formatNumber(count, NUMBER_FORMAT);
      return <EuiText size="s">{countValue}</EuiText>;
    },
  },
  {
    name: '',
    field: 'count',
    align: 'left',
    render: (_, { count, timeSeries }) => {
      return <SparkPlot series={timeSeries} isLoading={isLoading} />;
    },
  },
  {
    name: lastOccurrenceColumnName,
    sortable: true,
    field: 'lastOccurrence',
    render: (lastOccurrence: number) => {
      return dateFormatter.convert(lastOccurrence);
    },
  },
];
