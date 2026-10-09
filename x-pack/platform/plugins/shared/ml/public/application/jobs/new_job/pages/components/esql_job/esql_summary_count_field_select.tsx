/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiComboBox, EuiFormRow, type EuiComboBoxOptionOption } from '@elastic/eui';
import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';

import { NUMERIC_ESQL_TYPES } from './esql_numeric_types';

/**
 * A column is treated as COUNT(*)-shaped when it is named doc_count/count
 * (case-insensitive), or when it is a `long`-typed column whose name mentions
 * "count". This is a simple naming heuristic, not proof the column actually
 * holds a row count — it only picks a sensible default for the picker below.
 * Exported so the detectors editor's default seeding can exclude
 * count-shaped columns from its "first numeric column" default too.
 */
export const isCountShapedColumn = ({ name, type }: ESQLFieldWithMetadata): boolean =>
  /^(doc_count|count)$/i.test(name) || (type === 'long' && /count/i.test(name));

export const findDefaultSummaryCountField = (columns: ESQLFieldWithMetadata[]): string =>
  columns.find(isCountShapedColumn)?.name ?? '';

export interface EsqlSummaryCountFieldSelectProps {
  columns: ESQLFieldWithMetadata[];
  value: string;
  onChange: (value: string) => void;
  isDisabled?: boolean;
}

/**
 * Optional picker for the ES|QL output column that holds a row count, wired
 * into `analysis_config.summary_count_field_name`. Standalone (props-in,
 * onChange-out) so it can be reused by the staged PICK_FIELDS wizard step.
 */
export const EsqlSummaryCountFieldSelect = ({
  columns,
  value,
  onChange,
  isDisabled,
}: EsqlSummaryCountFieldSelectProps) => {
  const options: EuiComboBoxOptionOption[] = useMemo(
    () =>
      columns
        .filter(({ type }) => NUMERIC_ESQL_TYPES.has(type))
        .map(({ name, type }) => ({ label: name, append: type })),
    [columns]
  );
  const selectedOptions = useMemo(
    () => options.filter(({ label }) => label === value),
    [options, value]
  );

  return (
    <EuiFormRow
      label={i18n.translate('xpack.ml.esqlJob.query.summaryCountFieldLabel', {
        defaultMessage: 'Summary count field',
      })}
      helpText={i18n.translate('xpack.ml.esqlJob.query.summaryCountFieldHelpText', {
        defaultMessage:
          'Optional. Choose the output column that holds a row count, such as a COUNT(*) alias, to enable delayed-data detection.',
      })}
      fullWidth
    >
      <EuiComboBox
        aria-label={i18n.translate('xpack.ml.esqlJob.query.summaryCountFieldAriaLabel', {
          defaultMessage: 'Summary count field',
        })}
        singleSelection
        isClearable
        options={options}
        selectedOptions={selectedOptions}
        onChange={(nextOptions) => onChange(nextOptions[0]?.label ?? '')}
        isDisabled={isDisabled}
        data-test-subj="mlEsqlSummaryCountField"
      />
    </EuiFormRow>
  );
};
