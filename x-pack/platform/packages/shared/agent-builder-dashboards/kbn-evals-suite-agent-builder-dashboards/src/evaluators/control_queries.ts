/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import { getControlFields, getControls, isRecord } from '../dashboard_panels';
import type { DashboardAgentEvaluator } from '../evaluate_dataset';
import { noDashboardResult, skippedResult } from '../evaluator_utils';

export const DASHBOARD_CONTROL_QUERIES_EVALUATOR_NAME = 'Dashboard Control Queries';

interface ControlQueryResult {
  control: string;
  fields: string[];
  query: string;
  ok: boolean;
  /** Distinct values the dropdown would offer; set when the query ran. */
  values?: number;
  error?: string;
}

const describeControl = (control: Record<string, unknown>): string => {
  const title = isRecord(control.config) ? control.config.title : undefined;
  return `${String(control.type)}${typeof title === 'string' ? ` "${title}"` : ''}`;
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message.split('\n')[0] : String(error);

/**
 * Runs each stored control's values query (`FROM <index> | STATS BY <field>`)
 * against the cluster. A control on a column the index does not have, such as
 * a `DISSECT` output, fails with "Unknown column" and renders as a broken
 * dropdown, which is the failure the user sees. Scored as the fraction of
 * controls whose query executes. Skipped when the dashboard has no controls.
 */
export const createControlQueriesEvaluator = (esClient: EsClient): DashboardAgentEvaluator => {
  const run = async (
    control: Record<string, unknown>,
    query: string
  ): Promise<ControlQueryResult> => {
    const base = { control: describeControl(control), fields: getControlFields(control), query };
    try {
      const { values } = await esClient.esql.query({ query });
      return { ...base, ok: true, values: values.length };
    } catch (error) {
      return { ...base, ok: false, error: getErrorMessage(error) };
    }
  };

  return {
    name: DASHBOARD_CONTROL_QUERIES_EVALUATOR_NAME,
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output }) => {
      const { dashboard } = output;
      if (!dashboard) {
        return noDashboardResult;
      }
      const controls = getControls(dashboard);
      const withQuery = controls.flatMap((control) =>
        isRecord(control.config) && typeof control.config.esql_query === 'string'
          ? [{ control, query: control.config.esql_query }]
          : []
      );
      if (withQuery.length === 0) {
        return skippedResult(
          controls.length === 0
            ? 'The dashboard has no controls.'
            : 'No control has an ES|QL values query.'
        );
      }

      const results = await Promise.all(withQuery.map(({ control, query }) => run(control, query)));
      const failed = results.filter(({ ok }) => !ok);

      return {
        score: 1 - failed.length / results.length,
        label: failed.length === 0 ? 'executes' : 'broken-controls',
        explanation:
          failed.length === 0
            ? `All ${results.length} control queries execute: ${results
                .map(({ fields, values }) => `${fields.join(', ')} (${values} values)`)
                .join('; ')}.`
            : failed
                .map(({ control, fields, error }) => `${control} on ${fields.join(', ')}: ${error}`)
                .join('; '),
        metadata: { results },
      };
    },
  };
};
