/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiCallOut,
  EuiButtonIcon,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiToolTip,
  EuiTextArea,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';
import { useEsqlWizardContext } from './esql_wizard_context';
import { getEsqlQueryWarnings, type EsqlQueryWarningClause } from './esql_query_warnings';
import { EsqlHistogramChart } from './esql_histogram_chart';
import { EsqlNextBlockedExplanation } from './esql_next_blocked_explanation';
import { EsqlQueryOutputPreview } from './esql_query_output_preview';
import { EsqlStartFromBeginningButton } from './esql_start_from_beginning_button';

const DATE_ESQL_TYPES = new Set(['date', 'date_nanos']);

const toOptions = (fields: ESQLFieldWithMetadata[]): EuiComboBoxOptionOption[] =>
  fields.map(({ name, type }) => ({ label: name, append: type }));

const firstDateOutputField = (fields: ESQLFieldWithMetadata[]) =>
  fields.find(({ type }) => DATE_ESQL_TYPES.has(type))?.name ?? '';

const warningClauseLabels: Record<EsqlQueryWarningClause, string> = {
  where: i18n.translate('xpack.ml.esqlJob.query.reviewWarningTimeFilter', {
    defaultMessage: 'time filter',
  }),
  sort: i18n.translate('xpack.ml.esqlJob.query.reviewWarningSort', {
    defaultMessage: 'sort',
  }),
  limit: i18n.translate('xpack.ml.esqlJob.query.reviewWarningRowLimit', {
    defaultMessage: 'row limit',
  }),
};

const refreshLabel = i18n.translate('xpack.ml.esqlJob.timeRange.refreshAriaLabel', {
  defaultMessage: 'Refresh time range and preview',
});

const formatWarningClauses = (clauses: EsqlQueryWarningClause[]) =>
  i18n.formatList(
    'conjunction',
    clauses.map((clause) => warningClauseLabels[clause])
  );

/**
 * Step 1 of the staged ES|QL wizard (LEAD DECISION 2026-09-29, g2sz.10):
 * query editor + time range + a row-count histogram and a plain query-output
 * preview confirming the query produces output before the user configures
 * detectors. Column resolution
 * itself is owned by `useEsqlColumnsResolver`, run once at the wizard root.
 */
export const EsqlQueryTimeRangeStep = () => {
  const { state, setQueryState, setTimeRange, refreshTimeRange } = useEsqlWizardContext();
  const isLoading = state.queryProbeState === 'loading';

  const allOptions = useMemo(() => toOptions(state.columns), [state.columns]);
  const selectedEmittedTime = useMemo(
    () => allOptions.filter(({ label }) => label === state.emittedTimeField),
    [allOptions, state.emittedTimeField]
  );
  const queryWarnings = useMemo(
    () =>
      getEsqlQueryWarnings({
        query: state.query,
        sourceTimeField: state.sourceTimeField,
        emittedTimeField: state.emittedTimeField,
        fallbackTimeField: firstDateOutputField(state.columns),
      }),
    [state.columns, state.emittedTimeField, state.query, state.sourceTimeField]
  );

  return (
    <EuiForm>
      <EuiFormRow
        label={i18n.translate('xpack.ml.esqlJob.query.queryLabel', {
          defaultMessage: 'ES|QL query',
        })}
        fullWidth
      >
        <EuiTextArea
          aria-label={i18n.translate('xpack.ml.esqlJob.query.queryAriaLabel', {
            defaultMessage: 'ES|QL query',
          })}
          fullWidth
          value={state.query}
          onChange={(event) => setQueryState({ query: event.target.value })}
          data-test-subj="mlEsqlQuery"
        />
      </EuiFormRow>

      {queryWarnings.length > 0 ? (
        <EuiCallOut
          announceOnMount
          title={i18n.translate('xpack.ml.esqlJob.query.reviewWarningTitle', {
            defaultMessage: 'Review {clauses}',
            values: { clauses: formatWarningClauses(queryWarnings) },
          })}
          color="warning"
          iconType="warning"
          data-test-subj="mlEsqlQueryWarning"
        >
          <p>
            {i18n.translate('xpack.ml.esqlJob.query.reviewWarningDescription', {
              defaultMessage:
                'This is a Kibana advisory. Remove the conflicting clauses if you want the datafeed to apply its time range, ordering, and safety limit.',
            })}
          </p>
        </EuiCallOut>
      ) : null}

      <EuiFormRow
        label={i18n.translate('xpack.ml.esqlJob.timeRange.timeRangeLabel', {
          defaultMessage: 'Time range',
        })}
        fullWidth
      >
        <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiSuperDatePicker
              start={state.wizardStart}
              end={state.wizardEnd}
              onTimeChange={({ start, end, isInvalid }) => {
                if (isInvalid) return;

                setTimeRange({ start, end });
              }}
              showUpdateButton={false}
              data-test-subj="mlEsqlTimeRange"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={refreshLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="refresh"
                display="base"
                size="m"
                onClick={refreshTimeRange}
                aria-label={refreshLabel}
                data-test-subj="mlEsqlRefreshTimeRange"
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EsqlStartFromBeginningButton />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.ml.esqlJob.query.emittedTimeFieldLabel', {
          defaultMessage: 'Emitted time field',
        })}
        fullWidth
      >
        <EuiComboBox
          aria-label={i18n.translate('xpack.ml.esqlJob.query.emittedTimeFieldAriaLabel', {
            defaultMessage: 'Emitted time field',
          })}
          singleSelection
          options={allOptions}
          selectedOptions={selectedEmittedTime}
          onChange={(options) => setQueryState({ emittedTimeField: options[0]?.label ?? '' })}
          isDisabled={isLoading || state.columns.length === 0}
          data-test-subj="mlEsqlEmittedTimeField"
        />
      </EuiFormRow>

      {state.columnsErrorMessage !== undefined ? (
        <EuiCallOut
          title={i18n.translate('xpack.ml.esqlJob.query.readColumnsErrorTitle', {
            defaultMessage: 'Unable to read ES|QL columns',
          })}
          color="danger"
          iconType="error"
          announceOnMount
        >
          <p>{state.columnsErrorMessage}</p>
        </EuiCallOut>
      ) : null}

      <EuiSpacer size="m" />
      <EsqlHistogramChart />
      <EuiSpacer size="l" />
      <EsqlQueryOutputPreview />
      <EuiSpacer size="m" />
      <EsqlNextBlockedExplanation />
    </EuiForm>
  );
};
