/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import {
  EuiCallOut,
  EuiComboBox,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiText,
  EuiTextArea,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import type { ErrorType } from '@kbn/ml-common-types/errors';

import { useMlApi } from '../../../../../contexts/kibana/use_ml_api_context';
import {
  EsqlWizardProvider,
  useEsqlWizardContext,
  useOptionalEsqlWizardContext,
} from './esql_wizard_context';
import { getEsqlQueryWarnings, type EsqlQueryWarningClause } from './esql_query_warnings';
import {
  EsqlSummaryCountFieldSelect,
  findDefaultSummaryCountField,
  isCountShapedColumn,
} from './esql_summary_count_field_select';
import { EsqlDelayedDataCheckToggle } from './esql_delayed_data_check_toggle';
import { EsqlDetectorsEditor } from './esql_detectors_editor';
import { NUMERIC_ESQL_TYPES } from './esql_numeric_types';
import { DEFAULT_DETECTOR_FUNCTION } from './esql_detector_functions';
import type { EsqlDetectorConfig } from '../../../common/job_creator/esql_job_creator';

const DEBOUNCE_MS = 300;
const DATE_ESQL_TYPES = new Set(['date', 'date_nanos']);

const invalidateRequest = (requestGeneration: MutableRefObject<number>) => {
  requestGeneration.current++;
};

const toOptions = (fields: ESQLFieldWithMetadata[]): EuiComboBoxOptionOption[] =>
  fields.map(({ name, type }) => ({ label: name, append: type }));

const firstTimeField = (fields: ESQLFieldWithMetadata[]) =>
  fields.find(({ name }) => name === 'bucket')?.name ??
  fields.find(({ type }) => DATE_ESQL_TYPES.has(type))?.name ??
  '';

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

const formatWarningClauses = (clauses: EsqlQueryWarningClause[]) =>
  i18n.formatList(
    'conjunction',
    clauses.map((clause) => warningClauseLabels[clause])
  );

export interface EsqlQueryStepState {
  query: string;
  sourceTimeField: string;
  bucketSpan: string;
  columns: ESQLFieldWithMetadata[];
  emittedTimeField: string;
  detectors: EsqlDetectorConfig[];
  influencers: string[];
  summaryCountFieldName: string;
  delayedDataCheckEnabled: boolean;
}

/**
 * The state is intentionally independent of a DataView so later wizard steps can
 * use the user's ES|QL output directly when building the job and datafeed.
 */
const EsqlQueryStepContent = () => {
  const mlApi = useMlApi();
  const { state, setQueryProbeState, setQueryState } = useEsqlWizardContext();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<unknown>();
  const requestGeneration = useRef(0);

  const allOptions = useMemo(() => toOptions(state.columns), [state.columns]);
  const selectedEmittedTime = useMemo(
    () => allOptions.filter(({ label }) => label === state.emittedTimeField),
    [allOptions, state.emittedTimeField]
  );
  const selectedInfluencers = useMemo(
    () => allOptions.filter(({ label }) => state.influencers.includes(label)),
    [allOptions, state.influencers]
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

  useEffect(() => {
    const generation = ++requestGeneration.current;
    const trimmedQuery = state.query.trim();

    setQueryState({
      columns: [],
      emittedTimeField: '',
      detectors: [],
      influencers: [],
      summaryCountFieldName: '',
      delayedDataCheckEnabled: false,
    });
    setQueryProbeState(trimmedQuery === '' ? 'idle' : 'loading');
    setError(undefined);

    if (trimmedQuery === '') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeout = window.setTimeout(() => {
      void mlApi.getEsqlQueryColumns({ query: state.query }).then(
        ({ columns: nextColumns }) => {
          if (generation !== requestGeneration.current) return;

          const defaultSummaryCountField = findDefaultSummaryCountField(nextColumns);
          const defaultDetectorField = nextColumns.find(
            (column) => NUMERIC_ESQL_TYPES.has(column.type) && !isCountShapedColumn(column)
          )?.name;
          setQueryState({
            columns: nextColumns,
            emittedTimeField: firstTimeField(nextColumns),
            detectors:
              defaultDetectorField !== undefined
                ? [{ function: DEFAULT_DETECTOR_FUNCTION, field: defaultDetectorField }]
                : [],
            summaryCountFieldName: defaultSummaryCountField,
            delayedDataCheckEnabled: defaultSummaryCountField !== '',
          });
          setQueryProbeState('success');
          setIsLoading(false);
        },
        (nextError: unknown) => {
          if (generation !== requestGeneration.current) return;

          setError(nextError);
          setQueryProbeState('error');
          setIsLoading(false);
        }
      );
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
      invalidateRequest(requestGeneration);
    };
  }, [mlApi, setQueryProbeState, setQueryState, state.query]);

  const onSummaryCountFieldChange = (nextValue: string) =>
    setQueryState({
      summaryCountFieldName: nextValue,
      delayedDataCheckEnabled: nextValue !== '',
    });

  const onDelayedDataCheckChange = (nextEnabled: boolean) =>
    setQueryState({ delayedDataCheckEnabled: nextEnabled });

  return (
    <EuiForm component="form">
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
          onChange={(event) => setQueryState({ sourceTimeField: event.target.value })}
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

      <EsqlDetectorsEditor
        detectors={state.detectors}
        columns={state.columns}
        onChange={(detectors) => setQueryState({ detectors })}
        isDisabled={isLoading || state.columns.length === 0}
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
          options={allOptions}
          selectedOptions={selectedInfluencers}
          onChange={(options) => setQueryState({ influencers: options.map(({ label }) => label) })}
          isDisabled={isLoading || state.columns.length === 0}
          data-test-subj="mlEsqlInfluencers"
        />
      </EuiFormRow>

      <EsqlSummaryCountFieldSelect
        columns={state.columns}
        value={state.summaryCountFieldName}
        onChange={onSummaryCountFieldChange}
        isDisabled={isLoading || state.columns.length === 0}
      />

      <EsqlDelayedDataCheckToggle
        enabled={state.delayedDataCheckEnabled}
        onChange={onDelayedDataCheckChange}
        hasSummaryCountField={state.summaryCountFieldName !== ''}
      />

      {error ? (
        <EuiCallOut
          title={i18n.translate('xpack.ml.esqlJob.query.readColumnsErrorTitle', {
            defaultMessage: 'Unable to read ES|QL columns',
          })}
          color="danger"
          iconType="error"
          announceOnMount
        >
          <p>{extractErrorMessage(error as ErrorType)}</p>
        </EuiCallOut>
      ) : null}

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

export const EsqlQueryStep = () => {
  const context = useOptionalEsqlWizardContext();

  return context === undefined ? (
    <EsqlWizardProvider>
      <EsqlQueryStepContent />
    </EsqlWizardProvider>
  ) : (
    <EsqlQueryStepContent />
  );
};
