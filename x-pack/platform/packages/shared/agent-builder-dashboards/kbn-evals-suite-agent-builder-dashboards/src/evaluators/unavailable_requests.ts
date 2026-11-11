/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors, type Client as EsClient } from '@elastic/elasticsearch';
import { Walker, parse, type ESQLSource } from '@elastic/esql';
import { isSection, type DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { getControls, getLeafPanels, isRecord, mergePanelDataSources } from '../dashboard_panels';
import { noDashboardResult, scoreChecks, skippedResult, type Check } from '../evaluator_utils';
import { hasWrittenDashboard } from '../extract_dashboard';
import type { DashboardAgentEvaluator, DashboardDatasetExample } from '../types';

export const DASHBOARD_UNAVAILABLE_REQUESTS_EVALUATOR_NAME = 'Dashboard Unavailable Requests';

const getControlQueries = (dashboard: DashboardAttachmentData): string[] =>
  getControls(dashboard).flatMap(({ config }) =>
    isRecord(config) && typeof config.esql_query === 'string' ? [config.esql_query] : []
  );

/** Local index sources of a query; ENRICH policies and remote `cluster:index` sources are not checked. */
const getEsqlSources = (query: string): string[] =>
  Walker.findAll(parse(query).root, (node) => node.type === 'source')
    .map((node) => node as ESQLSource)
    .filter(({ sourceType, prefix }) => sourceType === 'index' && !prefix)
    .map(({ name }) => name);

/**
 * Index patterns the dashboard reads: the parsed `FROM` / `TS` sources of
 * Lens, Vega and control ES|QL, and the `index` of Vega Elasticsearch queries.
 */
const getDashboardSources = (dashboard: DashboardAttachmentData): string[] => {
  const { queries, indices } = mergePanelDataSources(getLeafPanels(dashboard));
  return [
    ...new Set([
      ...[...queries, ...getControlQueries(dashboard)].flatMap(getEsqlSources),
      ...indices,
    ]),
  ];
};

const isIndexNotFound = (error: unknown): boolean =>
  error instanceof errors.ResponseError && error.statusCode === 404;

/** What the reply must say about each request the data cannot back. Judged by the reply evaluator. */
export const getUnavailableReplyCriteria = (
  expected: DashboardDatasetExample['output']
): string[] =>
  (expected?.unavailableRequests ?? []).map(
    ({ name }) =>
      `The reply tells the user that ${name} could not be added because the data for it does not exist, rather than leaving it out silently.`
  );

/**
 * A prompt that asks for something the data cannot back (an index that does
 * not exist) next to a request it can. Checks that the agent built nothing
 * for it: every panel and control reads an index, alias or data stream the
 * cluster has, and no section is left empty. Whether the reply says so is
 * judged by the reply evaluator; the rest of the request is scored by the
 * layout and structure evaluators. With `noDashboard` gold nothing in the
 * request can be built, so the score is whether no dashboard was written.
 */
export const createUnavailableRequestsEvaluator = (esClient: EsClient): DashboardAgentEvaluator => {
  const exists = async (pattern: string): Promise<boolean> => {
    try {
      const {
        indices,
        aliases,
        data_streams: dataStreams,
      } = await esClient.indices.resolveIndex({
        name: pattern,
      });
      return indices.length + aliases.length + dataStreams.length > 0;
    } catch (error) {
      if (isIndexNotFound(error)) {
        return false;
      }
      throw error;
    }
  };

  const findMissing = async (sources: string[]): Promise<string[]> => {
    const found = await Promise.all(sources.map(exists));
    return sources.filter((_source, index) => !found[index]);
  };

  return {
    name: DASHBOARD_UNAVAILABLE_REQUESTS_EVALUATOR_NAME,
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ expected, output }) => {
      if (!expected?.unavailableRequests?.length) {
        return skippedResult('No unavailable request gold.');
      }
      if (expected.noDashboard) {
        const written = output.dashboard;
        return scoreChecks(
          [
            {
              assertion: 'noDashboard',
              passed: written === undefined,
              detail:
                written === undefined
                  ? 'no dashboard was written'
                  : `a dashboard was written with ${getLeafPanels(written).length} panel(s)`,
            },
          ],
          { subject: 'unavailable request', passLabel: 'accounted' }
        );
      }
      const { dashboard, before } = output;
      // On a seeded example without a write the result is the seed, which reads only existing sources.
      if (!dashboard || (before && !hasWrittenDashboard(output))) {
        return noDashboardResult;
      }

      const sources = getDashboardSources(dashboard);
      let missing: string[];
      try {
        missing = await findMissing(sources);
      } catch (error) {
        return skippedResult(
          `Could not resolve the dashboard's sources: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
      const seedEmptyIds = new Set(
        (before?.panels ?? [])
          .filter(isSection)
          .filter(({ panels }) => panels.length === 0)
          .map(({ id }) => id)
      );
      const empty = dashboard.panels
        .filter(isSection)
        .filter(({ id, panels }) => panels.length === 0 && !seedEmptyIds.has(id));
      const checks: Check[] = [
        {
          assertion: 'sourcesExist',
          passed: missing.length === 0,
          detail:
            missing.length === 0
              ? `every panel and control reads an existing source (${sources.join(', ')})`
              : `the dashboard reads sources the cluster does not have: ${missing.join(', ')}`,
        },
        {
          assertion: 'noEmptySections',
          passed: empty.length === 0,
          detail:
            empty.length === 0
              ? 'no empty section'
              : `empty sections: ${empty.map(({ title }) => `"${title}"`).join(', ')}`,
        },
      ];
      return scoreChecks(checks, { subject: 'unavailable request', passLabel: 'accounted' });
    },
  };
};
