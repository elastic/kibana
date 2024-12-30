/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EuiBasicTableColumn, EuiButtonIcon } from '@elastic/eui';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import { formatNumber } from '@elastic/eui';

import { DegradedField } from '../../../../../common/api_types';
import { SparkPlot } from '../../../common/spark_plot';
import { NUMBER_FORMAT } from '../../../../../common/constants';
import {
  countColumnName,
  fieldColumnName,
  lastOccurrenceColumnName,
} from '../../../../../common/translations';

const expandDatasetAriaLabel = i18n.translate(
  'xpack.datasetQuality.details.degradedFieldTable.expandLabel',
  {
    defaultMessage: 'Expand',
  }
);
const collapseDatasetAriaLabel = i18n.translate(
  'xpack.datasetQuality.details.degradedFieldTable.collapseLabel',
  {
    defaultMessage: 'Collapse',
  }
);

export const getDegradedFieldsColumns = ({
  dateFormatter,
  isLoading,
  expandedDegradedField,
  openDegradedFieldFlyout,
}: {
  dateFormatter: FieldFormat;
  isLoading: boolean;
  expandedDegradedField?: string;
  openDegradedFieldFlyout: (name: string) => void;
}): Array<EuiBasicTableColumn<DegradedField>> => [
  {
    name: '',
    field: 'name',
    render: (_, { name }) => {
      const isExpanded = name === expandedDegradedField;

      const onExpandClick = () => {
        openDegradedFieldFlyout(name);
      };

      return (
        <EuiButtonIcon
          data-test-subj="datasetQualityDetailsDegradedFieldsExpandButton"
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
  },
  {
    name: countColumnName,
    sortable: true,
    field: 'count',
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
