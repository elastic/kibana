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

const DEBOUNCE_MS = 300;
const NUMERIC_ESQL_TYPES = new Set([
  'byte',
  'short',
  'integer',
  'long',
  'unsigned_long',
  'float',
  'half_float',
  'scaled_float',
  'double',
]);
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
  detectorFields: string[];
  influencers: string[];
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
  const detectorOptions = useMemo(
    () => toOptions(state.columns.filter(({ type }) => NUMERIC_ESQL_TYPES.has(type))),
    [state.columns]
  );
  const selectedEmittedTime = useMemo(
    () => allOptions.filter(({ label }) => label === state.emittedTimeField),
    [allOptions, state.emittedTimeField]
  );
  const selectedDetectorFields = useMemo(
    () => detectorOptions.filter(({ label }) => state.detectorFields.includes(label)),
    [detectorOptions, state.detectorFields]
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

    setQueryState({ columns: [], emittedTimeField: '', detectorFields: [], influencers: [] });
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

          setQueryState({ columns: nextColumns, emittedTimeField: firstTimeField(nextColumns) });
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

      <EuiFormRow
        label={i18n.translate('xpack.ml.esqlJob.query.detectorFieldsLabel', {
          defaultMessage: 'Detector fields',
        })}
        fullWidth
      >
        <EuiComboBox
          aria-label={i18n.translate('xpack.ml.esqlJob.query.detectorFieldsAriaLabel', {
            defaultMessage: 'Detector fields',
          })}
          options={detectorOptions}
          selectedOptions={selectedDetectorFields}
          onChange={(options) =>
            setQueryState({ detectorFields: options.map(({ label }) => label) })
          }
          isDisabled={isLoading || state.columns.length === 0}
          data-test-subj="mlEsqlDetectorFields"
        />
      </EuiFormRow>

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
            defaultMessage="For aggregated queries, choose influencers from the fields named after {statsBy}. Delayed-data detection needs a {countOutput} output and a matching {summaryCountFieldName}."
            values={{
              statsBy: <code>STATS BY</code>,
              countOutput: <code>COUNT(*)</code>,
              summaryCountFieldName: <code>summary_count_field_name</code>,
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
