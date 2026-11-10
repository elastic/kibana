/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors, type Client as EsClient, type DiagnosticResult } from '@elastic/elasticsearch';
import type {
  AttachmentPanel,
  DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { GENERATE_DASHBOARD_TOOL_ID } from '../extract_dashboard';
import { SECTIONED_LOGS_DASHBOARD } from '../fixtures/sectioned_logs_dashboard';
import { control, metric, section } from '../test_helpers';
import {
  createUnavailableRequestsEvaluator,
  getUnavailableReplyCriteria,
} from './unavailable_requests';

const PAYMENTS = [{ name: 'payments' }];

/** Resolves only the sample logs index; a missing pattern resolves to nothing. */
const esClient = {
  indices: {
    resolveIndex: async ({ name }: { name: string }) => ({
      indices: name === 'kibana_sample_data_logs' ? [{ name }] : [],
      aliases: [],
      data_streams: [],
    }),
  },
} as unknown as EsClient;

const evaluator = createUnavailableRequestsEvaluator(esClient);

const withSection = (
  title: string,
  panels: Parameters<typeof section>[3]
): DashboardAttachmentData => ({
  ...SECTIONED_LOGS_DASHBOARD,
  panels: [...SECTIONED_LOGS_DASHBOARD.panels, section('added', title, 40, panels)],
});

const WRITE_STEP = {
  type: 'tool_call',
  tool_id: GENERATE_DASHBOARD_TOOL_ID,
  results: [{ type: 'dashboard', data: { attachment_id: 'seed' } }],
};

const evaluateRequests = (dashboard: DashboardAttachmentData) =>
  evaluator.evaluate({
    input: { question: 'q' },
    expected: { unavailableRequests: PAYMENTS },
    metadata: undefined,
    output: {
      errors: [],
      messages: [],
      steps: [WRITE_STEP],
      before: SECTIONED_LOGS_DASHBOARD,
      dashboard,
    },
  });

interface CheckResult {
  assertion: string;
  passed: boolean;
  detail: string;
}

const failedChecks = (result: Awaited<ReturnType<typeof evaluateRequests>>): CheckResult[] =>
  ((result.metadata?.checks ?? []) as CheckResult[]).filter(({ passed }) => !passed);

const failedAssertions = (result: Awaited<ReturnType<typeof evaluateRequests>>): string[] =>
  failedChecks(result).map(({ assertion }) => assertion);

describe('dashboard unavailable requests evaluator', () => {
  it('skips without gold', async () => {
    const result = await evaluator.evaluate({
      input: { question: 'q' },
      expected: {},
      metadata: undefined,
      output: { errors: [], messages: [] },
    });
    expect(result.score).toBeNull();
  });

  it('passes a dashboard that reads only existing sources', async () => {
    const result = await evaluateRequests(
      withSection('Traffic', [
        metric(
          'requests',
          { x: 0, y: 0, w: 12, h: 5 },
          'FROM kibana_sample_data_logs | STATS `V` = COUNT(*)'
        ),
      ])
    );
    expect(result.score).toBe(1);
  });

  it('scores 0 when the write left the seed unchanged', async () => {
    const result = await evaluateRequests(structuredClone(SECTIONED_LOGS_DASHBOARD));
    expect(result.score).toBe(0);
  });

  it('does not resolve ENRICH policies or remote cluster sources', async () => {
    const grid = { x: 0, y: 0, w: 12, h: 5 };
    const result = await evaluateRequests(
      withSection('Traffic', [
        metric(
          'enriched',
          grid,
          'FROM kibana_sample_data_logs | ENRICH geo_policy ON geo.dest | STATS `V` = COUNT(*)'
        ),
        metric('remote', { ...grid, x: 12 }, 'FROM remote:payments-* | STATS `V` = COUNT(*)'),
      ])
    );
    expect(result.score).toBe(1);
  });

  it('fails an empty section built for the missing index', async () => {
    const result = await evaluateRequests(withSection('Payments', []));
    expect(failedAssertions(result)).toEqual(['noEmptySections']);
  });

  it('fails a panel on the missing index whatever it is titled', async () => {
    const grid = { x: 0, y: 0, w: 12, h: 5 };
    const result = await evaluateRequests(
      withSection('Revenue', [
        metric('revenue', grid, 'FROM payments-* | STATS `Value` = SUM(amount)'),
      ])
    );
    const [failed] = failedChecks(result);
    expect(failed.assertion).toBe('sourcesExist');
    expect(failed.detail).toContain('payments-*');
    expect(failedChecks(result)).toHaveLength(1);
  });

  describe('sources beyond Lens ES|QL', () => {
    const grid = { x: 0, y: 0, w: 24, h: 10 };
    const vega = (spec: Record<string, unknown>): AttachmentPanel => ({
      type: 'vega',
      id: 'revenue-vega',
      grid,
      config: { spec: JSON.stringify(spec) },
    });

    it('fails a Vega ES|QL query on the missing index', async () => {
      const result = await evaluateRequests(
        withSection('Revenue', [
          vega({ data: { url: { '%type%': 'esql', query: 'FROM payments-* | LIMIT 10' } } }),
        ])
      );
      expect(failedChecks(result)[0].detail).toContain('payments-*');
    });

    it('fails a Vega Elasticsearch query on the missing index', async () => {
      const result = await evaluateRequests(
        withSection('Revenue', [vega({ data: [{ url: { index: 'payments-*', body: {} } }] })])
      );
      expect(failedChecks(result)[0].detail).toContain('payments-*');
    });

    it('fails a control on the missing index', async () => {
      const result = await evaluateRequests({
        ...SECTIONED_LOGS_DASHBOARD,
        pinned_panels: [
          ...(SECTIONED_LOGS_DASHBOARD.pinned_panels ?? []),
          control('currency', 'options_list_control', 'payments-*'),
        ],
      });
      expect(failedAssertions(result)).toEqual(['sourcesExist']);
    });
  });

  describe('when the cluster answers with an error', () => {
    const notFound = () =>
      new errors.ResponseError({
        statusCode: 404,
        body: { error: { type: 'index_not_found_exception' } },
        headers: {},
        warnings: null,
        meta: {} as DiagnosticResult['meta'],
      });
    const failingClient = (error: () => Error) =>
      ({
        indices: {
          resolveIndex: async ({ name }: { name: string }) => {
            if (name !== 'kibana_sample_data_logs') {
              throw error();
            }
            return { indices: [{ name }], aliases: [], data_streams: [] };
          },
        },
      } as unknown as EsClient);
    const evaluateWith = (client: EsClient) =>
      createUnavailableRequestsEvaluator(client).evaluate({
        input: { question: 'q' },
        expected: { unavailableRequests: PAYMENTS },
        metadata: undefined,
        output: {
          errors: [],
          messages: [],
          dashboard: withSection('Revenue', [
            metric(
              'revenue',
              { x: 0, y: 0, w: 12, h: 5 },
              'FROM payments-* | STATS `V` = COUNT(*)'
            ),
          ]),
        },
      });

    it('counts index not found as a missing source', async () => {
      const result = await evaluateWith(failingClient(notFound));
      expect(failedAssertions(result)).toEqual(['sourcesExist']);
    });

    it('skips on any other error instead of failing the example', async () => {
      const result = await evaluateWith(failingClient(() => new Error('connect ECONNREFUSED')));
      expect(result.score).toBeNull();
      expect(result.explanation).toContain('ECONNREFUSED');
    });
  });

  it('asks the reply judge to check each request is accounted for', () => {
    expect(getUnavailableReplyCriteria({ unavailableRequests: PAYMENTS })).toEqual([
      expect.stringContaining('payments could not be added'),
    ]);
    expect(getUnavailableReplyCriteria({})).toEqual([]);
  });

  describe('with noDashboard gold', () => {
    const evaluateNoDashboard = (dashboard?: DashboardAttachmentData) =>
      evaluator.evaluate({
        input: { question: 'q' },
        expected: { unavailableRequests: [{ name: 'nonexistent' }], noDashboard: true },
        metadata: undefined,
        output: { errors: [], messages: [], dashboard },
      });

    it('passes when no dashboard was written', async () => {
      expect((await evaluateNoDashboard()).score).toBe(1);
    });

    it('fails a dashboard written anyway', async () => {
      const result = await evaluateNoDashboard(SECTIONED_LOGS_DASHBOARD);
      expect(result.score).toBe(0);
      expect(failedAssertions(result)).toEqual(['noDashboard']);
    });
  });
});
