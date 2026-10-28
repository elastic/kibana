/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { EuiButton, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { getESQLResults } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import { useMlKibana } from '../../../../../contexts/kibana';
import { extractEsqlErrorReason } from './esql_error_reason';
import {
  buildSourceTimeBoundsQuery,
  getEsqlQuerySource,
  parseSourceTimeBounds,
} from './esql_source_time_bounds';
import { useEsqlWizardContext } from './esql_wizard_context';

/**
 * "Start from the beginning of data" for the Query & time range step: resolves
 * the earliest value of the raw `source_time_field` in the query's source
 * (`FROM <source> | STATS MIN(<field>), MAX(<field>)`, run client-side through
 * the same `getESQLResults` path as the histogram) and sets the wizard range to
 * `[earliest, now]`. Failures (no source/field, empty source, query error) are
 * shown inline rather than thrown.
 */
export const EsqlStartFromBeginningButton = () => {
  const {
    services: { data },
  } = useMlKibana();
  const { state, setTimeRange } = useEsqlWizardContext();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const requestGeneration = useRef(0);
  const abortController = useRef<AbortController>();

  useEffect(
    () => () => {
      requestGeneration.current++;
      abortController.current?.abort();
    },
    []
  );

  const resolveStart = async () => {
    const generation = ++requestGeneration.current;
    abortController.current?.abort();
    setErrorMessage(undefined);

    const source = getEsqlQuerySource(state.query);
    const esqlQuery = buildSourceTimeBoundsQuery(state.query, state.sourceTimeField);

    if (source === undefined) {
      setErrorMessage(
        i18n.translate('xpack.ml.esqlJob.timeRange.startFromBeginningNoSource', {
          defaultMessage:
            'Unable to determine the source from the query. Start the query with FROM followed by an index pattern.',
        })
      );
      return;
    }
    if (esqlQuery === undefined) {
      setErrorMessage(
        i18n.translate('xpack.ml.esqlJob.timeRange.startFromBeginningNoTimeField', {
          defaultMessage: 'Set a source time field before starting from the beginning of the data.',
        })
      );
      return;
    }

    const controller = new AbortController();
    abortController.current = controller;
    setIsLoading(true);

    try {
      const { response } = await getESQLResults({
        esqlQuery,
        search: data.search.search,
        signal: controller.signal,
      });
      if (generation !== requestGeneration.current) return;

      const bounds = parseSourceTimeBounds(response);
      if (bounds === undefined) {
        setErrorMessage(
          i18n.translate('xpack.ml.esqlJob.timeRange.startFromBeginningEmpty', {
            defaultMessage:
              'No documents with a value for {field} were found in {source}. Choose a time range manually.',
            values: { field: state.sourceTimeField, source },
          })
        );
        return;
      }

      setTimeRange({ start: bounds.earliest, end: 'now' });
    } catch (error: unknown) {
      if (generation !== requestGeneration.current || controller.signal.aborted) return;

      setErrorMessage(
        extractEsqlErrorReason(
          error,
          i18n.translate('xpack.ml.esqlJob.timeRange.startFromBeginningFallbackError', {
            defaultMessage: 'Unable to read the earliest time from the source.',
          })
        )
      );
    } finally {
      if (generation === requestGeneration.current) setIsLoading(false);
    }
  };

  return (
    <>
      <EuiButton
        type="button"
        size="s"
        iconType="calendar"
        onClick={resolveStart}
        isLoading={isLoading}
        data-test-subj="mlEsqlStartFromBeginningButton"
      >
        {i18n.translate('xpack.ml.esqlJob.timeRange.startFromBeginningButton', {
          defaultMessage: 'Start from the beginning of data',
        })}
      </EuiButton>
      {errorMessage !== undefined ? (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            size="s"
            color="warning"
            iconType="warning"
            announceOnMount
            title={errorMessage}
            data-test-subj="mlEsqlStartFromBeginningError"
          />
        </>
      ) : null}
    </>
  );
};
