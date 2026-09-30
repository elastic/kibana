/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { EuiCallOut, EuiInMemoryTable, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { getESQLResults } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import { useMlKibana } from '../../../../../contexts/kibana';
import { extractEsqlErrorReason } from './esql_error_reason';
import {
  buildEsqlOutputPreviewQuery,
  ESQL_OUTPUT_PREVIEW_ROW_LIMIT,
} from './esql_output_preview_query';
import { buildEsqlSourceTimeRangeFilter } from './esql_source_time_range_filter';
import { useEsqlWizardContext } from './esql_wizard_context';

type PreviewRow = Record<string, unknown>;

interface PreviewResult {
  columnNames: string[];
  rows: PreviewRow[];
}

const DEBOUNCE_MS = 300;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

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

/**
 * Query output preview for the Query & time range step. Runs the user's plain
 * ES|QL query client-side (`getESQLResults`, same path as the histogram) for
 * the selected time range, so users see what the query emits before choosing
 * fields. The time range is applied as a DSL `filter` on the raw source time
 * field, matching how a datafeed bounds its source.
 */
export const EsqlQueryOutputPreview = () => {
  const {
    services: { data },
  } = useMlKibana();
  const { state } = useEsqlWizardContext();
  const { query, sourceTimeField, wizardStart, wizardEnd, queryProbeState, rangeRefreshToken } =
    state;
  const [result, setResult] = useState<PreviewResult>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  const canRun = queryProbeState === 'success';

  useEffect(() => {
    if (!canRun) {
      setResult(undefined);
      setError(undefined);
      setIsLoading(false);
      return;
    }

    const filter = buildEsqlSourceTimeRangeFilter({
      sourceTimeField,
      from: wizardStart,
      to: wizardEnd,
    });

    const controller = new AbortController();
    let cancelled = false;
    setIsLoading(true);

    const timeout = window.setTimeout(() => {
      getESQLResults({
        esqlQuery: buildEsqlOutputPreviewQuery(query),
        search: data.search.search,
        signal: controller.signal,
        filter,
      })
        .then(({ response }) => {
          if (cancelled) return;

          const columnNames = (response.columns ?? []).map(({ name }) => name);
          const rows = ((response.values ?? []) as unknown[][])
            // The query already carries LIMIT 100; slice again as a safety net.
            .slice(0, ESQL_OUTPUT_PREVIEW_ROW_LIMIT)
            .map((values) =>
              Object.fromEntries(columnNames.map((name, index) => [name, values[index]]))
            );

          setResult({ columnNames, rows });
          setError(undefined);
        })
        .catch((nextError: unknown) => {
          if (cancelled || controller.signal.aborted) return;

          setResult(undefined);
          setError(
            extractEsqlErrorReason(
              nextError,
              i18n.translate('xpack.ml.esqlJob.queryOutput.fallbackErrorMessage', {
                defaultMessage: 'Unable to run the ES|QL query.',
              })
            )
          );
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [
    canRun,
    data.search.search,
    query,
    rangeRefreshToken,
    sourceTimeField,
    wizardEnd,
    wizardStart,
  ]);

  const columns = useMemo<Array<EuiBasicTableColumn<PreviewRow>>>(
    () =>
      (result?.columnNames ?? []).map((name) => ({
        field: name,
        name,
        render: (_value: unknown, row: PreviewRow) => tableValue(row[name]),
      })),
    [result?.columnNames]
  );

  return (
    <section data-test-subj="mlEsqlQueryOutputPreview">
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.ml.esqlJob.queryOutput.title', {
            defaultMessage: 'Preview ES|QL output',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      {error !== undefined ? (
        <EuiCallOut
          title={i18n.translate('xpack.ml.esqlJob.queryOutput.errorTitle', {
            defaultMessage: 'Unable to preview the ES|QL output',
          })}
          color="danger"
          iconType="error"
          announceOnMount
          data-test-subj="mlEsqlQueryOutputPreviewError"
        >
          <p>{error}</p>
        </EuiCallOut>
      ) : null}
      {!canRun ? (
        <EuiText size="s" color="subdued" data-test-subj="mlEsqlQueryOutputPreviewIdle">
          <p>
            {i18n.translate('xpack.ml.esqlJob.queryOutput.idleDescription', {
              defaultMessage: 'Enter a valid ES|QL query to preview its output.',
            })}
          </p>
        </EuiText>
      ) : null}
      {canRun && result !== undefined && result.rows.length === 0 ? (
        <EuiText size="s" color="subdued" data-test-subj="mlEsqlQueryOutputPreviewEmpty">
          <p>
            {i18n.translate('xpack.ml.esqlJob.queryOutput.emptyDescription', {
              defaultMessage:
                'The query returned no rows for the selected time range. Widen the time range or adjust the query so it produces output before continuing.',
            })}
          </p>
        </EuiText>
      ) : null}
      {canRun && result !== undefined && result.rows.length > 0 ? (
        <>
          {result.rows.length >= ESQL_OUTPUT_PREVIEW_ROW_LIMIT ? (
            <>
              <EuiText size="s" color="subdued" data-test-subj="mlEsqlQueryOutputPreviewLimitNote">
                <p>
                  {i18n.translate('xpack.ml.esqlJob.queryOutput.limitNote', {
                    defaultMessage: 'Showing the first {limit} rows.',
                    values: { limit: ESQL_OUTPUT_PREVIEW_ROW_LIMIT },
                  })}
                </p>
              </EuiText>
              <EuiSpacer size="s" />
            </>
          ) : null}
          <EuiInMemoryTable
            items={result.rows}
            columns={columns}
            loading={isLoading}
            pagination={{ initialPageSize: 10, pageSizeOptions: PAGE_SIZE_OPTIONS }}
            tableCaption={i18n.translate('xpack.ml.esqlJob.queryOutput.tableCaption', {
              defaultMessage: 'ES|QL query output',
            })}
            data-test-subj="mlEsqlQueryOutputPreviewTable"
          />
        </>
      ) : null}
    </section>
  );
};
