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
  overviewPanelDatasetQualityIndicatorFailedDocs,
} from '../../../../../common/translations';
import type { QualityIssueType } from '../../../../state_machines/dataset_quality_details_controller';
import { SparkPlot } from '../../../common/spark_plot';

const expandDatasetAriaLabel = i18n.translate(
  'xpack.datasetQuality.details.qualityIssuesTable.expand',
  {
    defaultMessage: 'Expand',
  }
);

const collapseDatasetAriaLabel = i18n.translate(
  'xpack.datasetQuality.details.qualityIssuesTable.collapseLabel',
  {
    defaultMessage: 'Collapse',
  }
);

export const getQualityIssuesColumns = ({
  dateFormatter,
  isLoading,
  expandedQualityIssue,
  openQualityIssueFlyout,
}: {
  dateFormatter: FieldFormat;
  isLoading: boolean;
  expandedQualityIssue?: {
    name: string;
    type: QualityIssueType;
  };
  openQualityIssueFlyout: (name: string, type: QualityIssueType) => void;
}): Array<EuiBasicTableColumn<QualityIssue>> => [
  {
    name: '',
    field: 'name',
    render: (_, { name, type }) => {
      const isExpanded = name === expandedQualityIssue?.name && type === expandedQualityIssue?.type;
      const onExpandClick = () => {
        openQualityIssueFlyout(name, type);
      };

      return (
        <EuiButtonIcon
          data-test-subj="datasetQualityDetailsQualityIssuesExpandButton"
          size="xs"
          color="text"
          onClick={onExpandClick}
          iconType={isExpanded ? 'minimize' : 'expand'}
          title={!isExpanded ? expandDatasetAriaLabel : collapseDatasetAriaLabel}
          aria-label={!isExpanded ? expandDatasetAriaLabel : collapseDatasetAriaLabel}
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
      return (
        <EuiText size="s">
          {type === 'degraded' ? name : overviewPanelDatasetQualityIndicatorFailedDocs}
        </EuiText>
      );
    },
  },
  {
    name: issueColumnName,
    field: 'name',
    render: (_, { type }) => {
      return (
        <EuiText size="s">{type === 'degraded' ? degradedField : documentIndexFailed}</EuiText>
      );
    },
  },
  {
    name: documentsColumnName,
    field: 'count',
    align: 'left',
    render: (_, { count, timeSeries }) => {
      const countValue = formatNumber(count, NUMBER_FORMAT);
      return <SparkPlot series={timeSeries} valueLabel={countValue} isLoading={isLoading} />;
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
