/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiComboBox,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiText,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useEsqlWizardContext } from './esql_wizard_context';
import { EsqlSummaryCountFieldSelect } from './esql_summary_count_field_select';
import { EsqlDelayedDataCheckToggle } from './esql_delayed_data_check_toggle';
import { EsqlDetectorsEditor } from './esql_detectors_editor';

/**
 * Step 2 of the staged ES|QL wizard (LEAD DECISION 2026-09-29, g2sz.10):
 * detectors (function/field + by/over/partition), influencers, summary
 * count field, delayed-data toggle, and the bucket span/source time field
 * that were previously bundled into the flat query step.
 */
export const EsqlPickFieldsStep = () => {
  const { state, setQueryState } = useEsqlWizardContext();
  const isLoading = state.queryProbeState === 'loading';
  const isDisabled = isLoading || state.columns.length === 0;

  const allOptions = useMemo(
    () => state.columns.map(({ name, type }) => ({ label: name, append: type })),
    [state.columns]
  );
  const selectedInfluencers = useMemo(
    () => allOptions.filter(({ label }) => state.influencers.includes(label)),
    [allOptions, state.influencers]
  );

  const onSummaryCountFieldChange = (nextValue: string) =>
    setQueryState({
      summaryCountFieldName: nextValue,
      delayedDataCheckEnabled: nextValue !== '',
    });

  const onDelayedDataCheckChange = (nextEnabled: boolean) =>
    setQueryState({ delayedDataCheckEnabled: nextEnabled });

  return (
    <EuiForm>
      <EuiFormRow
        label={i18n.translate('xpack.ml.esqlJob.query.sourceTimeFieldLabel', {
          defaultMessage: 'Source time field',
        })}
        fullWidth
      >
        <EuiFieldText
          aria-label={i18n.translate('xpack.ml.esqlJob.query.sourceTimeFieldAriaLabel', {
            defaultMessage: 'Source time field',
          })}
          fullWidth
          value={state.sourceTimeField}
          onChange={(event) =>
            setQueryState({ sourceTimeField: event.target.value, sourceTimeFieldTouched: true })
          }
          data-test-subj="mlEsqlSourceTimeField"
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.ml.esqlJob.query.bucketSpanLabel', {
          defaultMessage: 'Bucket span',
        })}
        fullWidth
      >
        <EuiFieldText
          aria-label={i18n.translate('xpack.ml.esqlJob.query.bucketSpanAriaLabel', {
            defaultMessage: 'Bucket span',
          })}
          fullWidth
          value={state.bucketSpan}
          onChange={(event) => setQueryState({ bucketSpan: event.target.value })}
          data-test-subj="mlEsqlBucketSpan"
        />
      </EuiFormRow>

      <EsqlDetectorsEditor
        detectors={state.detectors}
        columns={state.columns}
        emittedTimeField={state.emittedTimeField}
        onChange={(detectors) => setQueryState({ detectors })}
        isDisabled={isDisabled}
      />

      <EuiFormRow
        label={i18n.translate('xpack.ml.esqlJob.query.influencersLabel', {
          defaultMessage: 'Influencers',
        })}
        fullWidth
      >
        <EuiComboBox
          aria-label={i18n.translate('xpack.ml.esqlJob.query.influencersAriaLabel', {
            defaultMessage: 'Influencers',
          })}
          options={allOptions as EuiComboBoxOptionOption[]}
          selectedOptions={selectedInfluencers}
          onChange={(options) => setQueryState({ influencers: options.map(({ label }) => label) })}
          isDisabled={isDisabled}
          data-test-subj="mlEsqlInfluencers"
        />
      </EuiFormRow>

      <EsqlSummaryCountFieldSelect
        columns={state.columns}
        value={state.summaryCountFieldName}
        onChange={onSummaryCountFieldChange}
        isDisabled={isDisabled}
      />

      <EsqlDelayedDataCheckToggle
        enabled={state.delayedDataCheckEnabled}
        onChange={onDelayedDataCheckChange}
        hasSummaryCountField={state.summaryCountFieldName !== ''}
      />

      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.ml.esqlJob.query.aggregatedQueryGuidanceDescription"
            defaultMessage="For aggregated queries, choose influencers from the fields named after {statsBy}. Pick the {countOutput} output column as the Summary count field below to turn on Check for delayed data."
            values={{
              statsBy: <code>STATS BY</code>,
              countOutput: <code>COUNT(*)</code>,
            }}
          />
        </p>
      </EuiText>
    </EuiForm>
  );
};
