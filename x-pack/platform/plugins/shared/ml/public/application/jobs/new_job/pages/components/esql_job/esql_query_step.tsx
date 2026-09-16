/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { GOLD_ESQL_DATAFEED_QUERY } from './gold_query';

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
export const EsqlQueryStep = () => {
  const mlApi = useMlApi();
  const [query, setQuery] = useState(GOLD_ESQL_DATAFEED_QUERY);
  const [sourceTimeField, setSourceTimeField] = useState('@timestamp');
  const [bucketSpan, setBucketSpan] = useState('1h');
  const [columns, setColumns] = useState<ESQLFieldWithMetadata[]>([]);
  const [emittedTimeField, setEmittedTimeField] = useState('');
  const [detectorFields, setDetectorFields] = useState<string[]>([]);
  const [influencers, setInfluencers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>();
  const requestGeneration = useRef(0);

  const allOptions = useMemo(() => toOptions(columns), [columns]);
  const detectorOptions = useMemo(
    () => toOptions(columns.filter(({ type }) => NUMERIC_ESQL_TYPES.has(type))),
    [columns]
  );
  const selectedEmittedTime = useMemo(
    () => allOptions.filter(({ label }) => label === emittedTimeField),
    [allOptions, emittedTimeField]
  );
  const selectedDetectorFields = useMemo(
    () => detectorOptions.filter(({ label }) => detectorFields.includes(label)),
    [detectorOptions, detectorFields]
  );
  const selectedInfluencers = useMemo(
    () => allOptions.filter(({ label }) => influencers.includes(label)),
    [allOptions, influencers]
  );

  useEffect(() => {
    const generation = ++requestGeneration.current;
    const trimmedQuery = query.trim();

    setColumns([]);
    setEmittedTimeField('');
    setDetectorFields([]);
    setInfluencers([]);
    setError(undefined);

    if (trimmedQuery === '') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeout = window.setTimeout(() => {
      void mlApi.getEsqlQueryColumns({ query }).then(
        ({ columns: nextColumns }) => {
          if (generation !== requestGeneration.current) return;

          setColumns(nextColumns);
          setEmittedTimeField(firstTimeField(nextColumns));
          setIsLoading(false);
        },
        (nextError: unknown) => {
          if (generation !== requestGeneration.current) return;

          setError(nextError);
          setIsLoading(false);
        }
      );
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [mlApi, query]);

  return (
    <EuiForm component="form">
      <EuiFormRow label="ES|QL query" fullWidth>
        <EuiTextArea
          aria-label="ES|QL query"
          fullWidth
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          data-test-subj="mlEsqlQuery"
        />
      </EuiFormRow>

      <EuiFormRow label="Source time field" fullWidth>
        <EuiFieldText
          aria-label="Source time field"
          fullWidth
          value={sourceTimeField}
          onChange={(event) => setSourceTimeField(event.target.value)}
          data-test-subj="mlEsqlSourceTimeField"
        />
      </EuiFormRow>

      <EuiFormRow label="Bucket span" fullWidth>
        <EuiFieldText
          aria-label="Bucket span"
          fullWidth
          value={bucketSpan}
          onChange={(event) => setBucketSpan(event.target.value)}
          data-test-subj="mlEsqlBucketSpan"
        />
      </EuiFormRow>

      <EuiFormRow label="Emitted time field" fullWidth>
        <EuiComboBox
          aria-label="Emitted time field"
          singleSelection
          options={allOptions}
          selectedOptions={selectedEmittedTime}
          onChange={(options) => setEmittedTimeField(options[0]?.label ?? '')}
          isDisabled={isLoading || columns.length === 0}
          data-test-subj="mlEsqlEmittedTimeField"
        />
      </EuiFormRow>

      <EuiFormRow label="Detector fields" fullWidth>
        <EuiComboBox
          aria-label="Detector fields"
          options={detectorOptions}
          selectedOptions={selectedDetectorFields}
          onChange={(options) => setDetectorFields(options.map(({ label }) => label))}
          isDisabled={isLoading || columns.length === 0}
          data-test-subj="mlEsqlDetectorFields"
        />
      </EuiFormRow>

      <EuiFormRow label="Influencers" fullWidth>
        <EuiComboBox
          aria-label="Influencers"
          options={allOptions}
          selectedOptions={selectedInfluencers}
          onChange={(options) => setInfluencers(options.map(({ label }) => label))}
          isDisabled={isLoading || columns.length === 0}
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
