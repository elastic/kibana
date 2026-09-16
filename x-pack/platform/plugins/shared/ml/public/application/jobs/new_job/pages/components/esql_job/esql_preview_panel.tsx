/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { Detector } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import { buildEsqlJobPayload } from '../../../common/job_creator/esql_job_creator';
import { useMlApi } from '../../../../../contexts/kibana/use_ml_api_context';
import { useEsqlWizardContext } from './esql_wizard_context';

const PREVIEW_JOB_ID = 'preview-esql-job';
const PREVIEW_DATAFEED_ID = 'preview-esql-datafeed';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const previewErrorReason = (error: unknown): string => {
  if (!isRecord(error)) return error instanceof Error ? error.message : String(error);

  const errorBody = isRecord(error.body) ? error.body : error;
  const attributes = isRecord(errorBody.attributes) ? errorBody.attributes : undefined;
  const wrappedErrorBody = isRecord(attributes?.body) ? attributes.body : errorBody;
  const elasticsearchError = isRecord(wrappedErrorBody.error) ? wrappedErrorBody.error : undefined;
  if (typeof elasticsearchError?.reason === 'string') return elasticsearchError.reason;
  if (typeof wrappedErrorBody.reason === 'string') return wrappedErrorBody.reason;
  if (typeof error.message === 'string') return error.message;
  return 'Unable to preview ES|QL datafeed.';
};

const tableValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const previewColumns = (
  rows: Array<Record<string, unknown>>,
  columns: ESQLFieldWithMetadata[]
): EuiBasicTableColumn<Record<string, unknown>>[] => {
  const rowColumnNames = rows.flatMap((row) => Object.keys(row));
  const columnNames = Array.from(
    new Set([
      ...columns.map(({ name }) => name).filter((name) => rowColumnNames.includes(name)),
      ...rowColumnNames,
    ])
  );

  return columnNames.map((name) => ({
    field: name,
    name,
    render: (value: unknown) => tableValue(value),
  }));
};

export const EsqlPreviewPanel = () => {
  const mlApi = useMlApi();
  const { state } = useEsqlWizardContext();
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [hasPreviewed, setHasPreviewed] = useState(false);
  const requestGeneration = useRef(0);

  useEffect(
    () => () => {
      requestGeneration.current++;
    },
    []
  );

  const columns = useMemo(() => previewColumns(rows, state.columns), [rows, state.columns]);

  const preview = useCallback(async () => {
    const generation = ++requestGeneration.current;
    const detectors: Detector[] = state.detectorFields.map((fieldName) => ({
      function: 'mean',
      field_name: fieldName,
    }));
    const { job, datafeed } = buildEsqlJobPayload({
      jobId: PREVIEW_JOB_ID,
      datafeedId: PREVIEW_DATAFEED_ID,
      query: state.query,
      sourceTimeField: state.sourceTimeField,
      timeField: state.emittedTimeField || state.sourceTimeField,
      bucketSpan: state.bucketSpan,
      detectors,
      influencers: state.influencers,
    });

    setIsLoading(true);
    setError(undefined);

    try {
      const response = await mlApi.jobs.datafeedPreview(
        undefined,
        job,
        datafeed,
        state.wizardStart,
        state.wizardEnd
      );
      if (generation !== requestGeneration.current) return;

      setRows(response);
      setHasPreviewed(true);
    } catch (nextError: unknown) {
      if (generation !== requestGeneration.current) return;

      setError(previewErrorReason(nextError));
    } finally {
      if (generation === requestGeneration.current) setIsLoading(false);
    }
  }, [mlApi.jobs, state]);

  return (
    <section data-test-subj="mlEsqlPreviewPanel">
      <EuiTitle size="s">
        <h2>Preview ES|QL output</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiButton onClick={preview} data-test-subj="mlEsqlPreviewButton">
        Preview
      </EuiButton>
      {isLoading ? <EuiLoadingSpinner size="m" /> : null}
      <EuiSpacer size="m" />
      {error !== undefined ? (
        <EuiCallOut
          title="Unable to preview ES|QL datafeed"
          color="danger"
          iconType="error"
          announceOnMount
        >
          <p>{error}</p>
        </EuiCallOut>
      ) : null}
      {rows.length > 0 ? (
        <EuiBasicTable items={rows} columns={columns} tableCaption="ES|QL preview output" />
      ) : null}
      {!isLoading && error === undefined && rows.length === 0 ? (
        <EuiText size="s" color="subdued">
          <p>
            {hasPreviewed
              ? 'No output rows were returned for the selected time range.'
              : 'Select Preview to inspect datafeed output for the selected time range.'}
          </p>
        </EuiText>
      ) : null}
    </section>
  );
};
