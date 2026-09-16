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
import { extractErrorMessage } from '@kbn/ml-error-utils';
import type { ErrorType } from '@kbn/ml-common-types/errors';

import { useMlApi } from '../../../../../contexts/kibana/use_ml_api_context';
import {
  EsqlWizardProvider,
  useEsqlWizardContext,
  useOptionalEsqlWizardContext,
} from './esql_wizard_context';

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
  const { state, setQueryState } = useEsqlWizardContext();
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

  useEffect(() => {
    const generation = ++requestGeneration.current;
    const trimmedQuery = state.query.trim();

    setQueryState({ columns: [], emittedTimeField: '', detectorFields: [], influencers: [] });
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
          setIsLoading(false);
        },
        (nextError: unknown) => {
          if (generation !== requestGeneration.current) return;

          setError(nextError);
          setIsLoading(false);
        }
      );
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
      invalidateRequest(requestGeneration);
    };
  }, [mlApi, setQueryState, state.query]);

  return (
    <EuiForm component="form">
      <EuiFormRow label="ES|QL query" fullWidth>
        <EuiTextArea
          aria-label="ES|QL query"
          fullWidth
          value={state.query}
          onChange={(event) => setQueryState({ query: event.target.value })}
          data-test-subj="mlEsqlQuery"
        />
      </EuiFormRow>

      <EuiFormRow label="Source time field" fullWidth>
        <EuiFieldText
          aria-label="Source time field"
          fullWidth
          value={state.sourceTimeField}
          onChange={(event) => setQueryState({ sourceTimeField: event.target.value })}
          data-test-subj="mlEsqlSourceTimeField"
        />
      </EuiFormRow>

      <EuiFormRow label="Bucket span" fullWidth>
        <EuiFieldText
          aria-label="Bucket span"
          fullWidth
          value={state.bucketSpan}
          onChange={(event) => setQueryState({ bucketSpan: event.target.value })}
          data-test-subj="mlEsqlBucketSpan"
        />
      </EuiFormRow>

      <EuiFormRow label="Emitted time field" fullWidth>
        <EuiComboBox
          aria-label="Emitted time field"
          singleSelection
          options={allOptions}
          selectedOptions={selectedEmittedTime}
          onChange={(options) => setQueryState({ emittedTimeField: options[0]?.label ?? '' })}
          isDisabled={isLoading || state.columns.length === 0}
          data-test-subj="mlEsqlEmittedTimeField"
        />
      </EuiFormRow>

      <EuiFormRow label="Detector fields" fullWidth>
        <EuiComboBox
          aria-label="Detector fields"
          options={detectorOptions}
          selectedOptions={selectedDetectorFields}
          onChange={(options) =>
            setQueryState({ detectorFields: options.map(({ label }) => label) })
          }
          isDisabled={isLoading || state.columns.length === 0}
          data-test-subj="mlEsqlDetectorFields"
        />
      </EuiFormRow>

      <EuiFormRow label="Influencers" fullWidth>
        <EuiComboBox
          aria-label="Influencers"
          options={allOptions}
          selectedOptions={selectedInfluencers}
          onChange={(options) => setQueryState({ influencers: options.map(({ label }) => label) })}
          isDisabled={isLoading || state.columns.length === 0}
          data-test-subj="mlEsqlInfluencers"
        />
      </EuiFormRow>

      {error ? (
        <EuiCallOut
          title="Unable to read ES|QL columns"
          color="danger"
          iconType="error"
          announceOnMount
        >
          <p>{extractErrorMessage(error as ErrorType)}</p>
        </EuiCallOut>
      ) : null}

      <EuiText size="s" color="subdued">
        <p>
          For aggregated queries, choose influencers from the fields named after{' '}
          <code>STATS BY</code>. Delayed-data detection needs a <code>COUNT(*)</code> output and a
          matching <code>summary_count_field_name</code>.
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
