/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, type MutableRefObject } from 'react';
import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import type { ErrorType } from '@kbn/ml-common-types/errors';
import { useMlApi } from '../../../../../contexts/kibana/use_ml_api_context';
import { useEsqlWizardContext } from './esql_wizard_context';
import {
  findDefaultSummaryCountField,
  isCountShapedColumn,
} from './esql_summary_count_field_select';
import { pruneEsqlSelections } from './esql_prune_selections';
import { NUMERIC_ESQL_TYPES } from './esql_numeric_types';
import { DEFAULT_DETECTOR_FUNCTION } from './esql_detector_functions';
import { inferSourceTimeField } from './esql_source_time_field';

const DEBOUNCE_MS = 300;
const DATE_ESQL_TYPES = new Set(['date', 'date_nanos']);

const invalidateRequest = (requestGeneration: MutableRefObject<number>) => {
  requestGeneration.current++;
};

const firstTimeField = (fields: ESQLFieldWithMetadata[]) =>
  fields.find(({ name }) => name === 'bucket')?.name ??
  fields.find(({ type }) => DATE_ESQL_TYPES.has(type))?.name ??
  '';

/**
 * Resolves `state.query`'s output columns (debounced) and re-derives
 * defaults/pruning whenever the query changes. Extracted out of the
 * original flat query step (g2sz.10 pass 2) so it can run once, at the
 * wizard root, regardless of which staged step is currently mounted —
 * the Pick fields step needs these columns without re-running this probe
 * itself.
 */
export const useEsqlColumnsResolver = (): void => {
  const mlApi = useMlApi();
  const { state, setQueryProbeState, setQueryState, setColumnsErrorMessage } =
    useEsqlWizardContext();
  const requestGeneration = useRef(0);

  // Captured once per query change so the pruning below (LEAD DECISION
  // 2026-09-29, g2sz.10: "editing query re-resolves columns and prunes
  // downstream selections that no longer exist") diffs against the
  // selections that were on screen right before this query edit, not
  // against a wiped-out intermediate state.
  const priorSelections = useRef({
    detectors: state.detectors,
    influencers: state.influencers,
    summaryCountFieldName: state.summaryCountFieldName,
    emittedTimeField: state.emittedTimeField,
  });

  // Keep the ref in sync with any manual edit to these fields (detectors
  // editor, influencers combo box, summary count field select) so a
  // subsequent query edit prunes against what's actually on screen.
  useEffect(() => {
    priorSelections.current = {
      detectors: state.detectors,
      influencers: state.influencers,
      summaryCountFieldName: state.summaryCountFieldName,
      emittedTimeField: state.emittedTimeField,
    };
  }, [state.detectors, state.influencers, state.summaryCountFieldName, state.emittedTimeField]);

  // Read (not subscribed to) by the probe below so that a manual edit of the
  // source time field never re-triggers a columns request.
  const sourceTimeFieldTouched = useRef(state.sourceTimeFieldTouched);
  useEffect(() => {
    sourceTimeFieldTouched.current = state.sourceTimeFieldTouched;
  }, [state.sourceTimeFieldTouched]);

  useEffect(() => {
    const generation = ++requestGeneration.current;
    const trimmedQuery = state.query.trim();
    const priorForThisRequest = priorSelections.current;

    setQueryProbeState(trimmedQuery === '' ? 'idle' : 'loading');
    setColumnsErrorMessage(undefined);

    if (trimmedQuery === '') {
      setQueryState({
        columns: [],
        emittedTimeField: '',
        detectors: [],
        influencers: [],
        summaryCountFieldName: '',
        delayedDataCheckEnabled: false,
      });
      return;
    }

    const timeout = window.setTimeout(() => {
      void mlApi.getEsqlQueryColumns({ query: state.query }).then(
        ({ columns: nextColumns }) => {
          if (generation !== requestGeneration.current) return;

          const pruned = pruneEsqlSelections(priorForThisRequest, nextColumns);
          const defaultSummaryCountField = findDefaultSummaryCountField(nextColumns);
          const defaultDetectorField = nextColumns.find(
            (column) => NUMERIC_ESQL_TYPES.has(column.type) && !isCountShapedColumn(column)
          )?.name;

          const emittedTimeField = pruned.emittedTimeField || firstTimeField(nextColumns);
          const detectors =
            pruned.detectors.length > 0
              ? pruned.detectors
              : defaultDetectorField !== undefined
              ? [{ function: DEFAULT_DETECTOR_FUNCTION, field: defaultDetectorField }]
              : [];
          const summaryCountFieldName = pruned.summaryCountFieldName || defaultSummaryCountField;

          priorSelections.current = {
            detectors,
            influencers: pruned.influencers,
            summaryCountFieldName,
            emittedTimeField,
          };

          // Pre-fill the source time field from the query text until the user edits
          // it by hand; an un-inferable query keeps the current value.
          const inferredSourceTimeField = sourceTimeFieldTouched.current
            ? undefined
            : inferSourceTimeField(state.query, nextColumns);

          setQueryState({
            columns: nextColumns,
            ...(inferredSourceTimeField !== undefined
              ? { sourceTimeField: inferredSourceTimeField }
              : {}),
            emittedTimeField,
            detectors,
            influencers: pruned.influencers,
            summaryCountFieldName,
            delayedDataCheckEnabled: summaryCountFieldName !== '',
          });
          setQueryProbeState('success');
        },
        (nextError: unknown) => {
          if (generation !== requestGeneration.current) return;

          setColumnsErrorMessage(extractErrorMessage(nextError as ErrorType));
          setQueryProbeState('error');
        }
      );
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
      invalidateRequest(requestGeneration);
    };
  }, [mlApi, setColumnsErrorMessage, setQueryProbeState, setQueryState, state.query]);
};
