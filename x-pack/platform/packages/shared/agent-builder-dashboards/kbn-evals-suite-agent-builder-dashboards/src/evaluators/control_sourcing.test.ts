/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAgentTaskOutput, DashboardDatasetExample } from '../types';
import { GENERATE_DASHBOARD_TOOL_ID } from '../extract_dashboard';
import { control, dashboard } from '../test_helpers';
import { dashboardControlSourcingEvaluator } from './control_sourcing';

const MAPPED = [
  'response',
  'response.keyword',
  'machine.os',
  'machine.os.keyword',
  'geo.src',
  'bytes',
];

interface Attempt {
  field: string;
  userRequested?: boolean;
}

/** One generate_dashboard call with an add_controls operation and optional grouped failures. */
const call = (attempts: Attempt[], failedFields: string[] = []): Record<string, unknown> => ({
  type: 'tool_call',
  tool_id: GENERATE_DASHBOARD_TOOL_ID,
  params: {
    operations: [
      {
        operation: 'add_controls',
        controls: attempts.map(({ field, userRequested }) => ({
          type: 'options_list_control',
          field_name: field,
          index: 'logs',
          ...(userRequested ? { user_requested: true } : {}),
        })),
      },
    ],
  },
  results: [
    {
      type: 'dashboard',
      data: {
        attachment_id: 'dash',
        ...(failedFields.length > 0
          ? {
              failures: [
                {
                  type: 'add_controls',
                  identifier: failedFields.join(', '),
                  error: 'Not mapped on index "logs".',
                },
              ],
            }
          : {}),
      },
    },
  ],
});

const evaluateSourcing = (
  gold: NonNullable<DashboardDatasetExample['output']>['controls'],
  {
    steps,
    stored,
    message = 'Here is your dashboard.',
  }: { steps: Array<Record<string, unknown>>; stored: string[]; message?: string }
) =>
  dashboardControlSourcingEvaluator.evaluate({
    input: { question: 'q' },
    expected: { controls: gold },
    metadata: undefined,
    output: {
      errors: [],
      messages: [{ message }],
      steps,
      dashboard: dashboard([], { pinned_panels: stored.map((field) => control(field)) }),
    } satisfies DashboardAgentTaskOutput,
  });

const failedAssertions = (result: Awaited<ReturnType<typeof evaluateSourcing>>): string[] =>
  ((result.metadata?.checks ?? []) as Array<{ assertion: string; passed: boolean }>)
    .filter(({ passed }) => !passed)
    .map(({ assertion }) => assertion);

describe('dashboard control sourcing evaluator', () => {
  it('skips examples without gold controls and scores 0 without a dashboard', async () => {
    const skipped = await dashboardControlSourcingEvaluator.evaluate({
      input: { question: 'q' },
      expected: {},
      metadata: undefined,
      output: { errors: [], messages: [] },
    });
    expect(skipped.score).toBeNull();
    const missing = await dashboardControlSourcingEvaluator.evaluate({
      input: { question: 'q' },
      expected: { controls: { requested: false, mappedFields: MAPPED } },
      metadata: undefined,
      output: { errors: [], messages: [] },
    });
    expect(missing.score).toBe(0);
  });

  it('passes an unrequested run whose own controls are on mapped fields', async () => {
    const result = await evaluateSourcing(
      { requested: false, mappedFields: MAPPED },
      { steps: [call([{ field: 'response' }])], stored: ['response.keyword'] }
    );
    expect(result.score).toBe(1);
  });

  it('fails stored and attempted controls on ES|QL-derived columns', async () => {
    const result = await evaluateSourcing(
      { requested: true, mappedFields: MAPPED },
      {
        steps: [call([{ field: 'status_code', userRequested: true }])],
        stored: ['status_code'],
        message: 'Added the status code control you asked for.',
      }
    );
    expect(failedAssertions(result)).toEqual(['storedControlsMapped', 'attemptedControlsMapped']);
  });

  it('uses exact field names, so a .keyword that does not exist is unmapped', async () => {
    const result = await evaluateSourcing(
      { requested: false, mappedFields: MAPPED },
      { steps: [call([{ field: 'bytes.keyword' }])], stored: ['bytes.keyword'] }
    );
    expect(failedAssertions(result)).toEqual(['storedControlsMapped', 'attemptedControlsMapped']);
  });

  it('fails a requested run that asks generate_dashboard for no control at all', async () => {
    const result = await evaluateSourcing(
      { requested: true, mappedFields: MAPPED },
      { steps: [call([])], stored: [] }
    );
    expect(failedAssertions(result)).toEqual(['userRequestedFlag']);
  });

  it('accepts the agent adding unflagged controls of its own next to flagged requested ones', async () => {
    const result = await evaluateSourcing(
      { requested: true, mappedFields: MAPPED },
      {
        steps: [call([{ field: 'response', userRequested: true }, { field: 'geo.src' }])],
        stored: ['response.keyword', 'geo.src'],
      }
    );
    expect(result.score).toBe(1);
  });

  it('fails a flag on an unrequested control', async () => {
    const result = await evaluateSourcing(
      { requested: false, mappedFields: MAPPED },
      { steps: [call([{ field: 'response', userRequested: true }])], stored: ['response.keyword'] }
    );
    expect(failedAssertions(result)).toEqual(['userRequestedFlag']);
  });

  it('checks the named control is present, with or without .keyword', async () => {
    const result = await evaluateSourcing(
      { requested: true, mappedFields: MAPPED, mustInclude: ['machine.os', 'geo.src'] },
      {
        steps: [call([{ field: 'machine.os', userRequested: true }])],
        stored: ['machine.os.keyword'],
      }
    );
    expect(failedAssertions(result)).toEqual(['mustInclude.geo.src']);
  });

  describe('dropped requested controls', () => {
    it('wants the dropped field named in plain words and no raw error text', async () => {
      const dropped = {
        steps: [call([{ field: 'status_code', userRequested: true }], ['status_code'])],
        stored: [],
      };
      const silent = await evaluateSourcing({ requested: true, mappedFields: MAPPED }, dropped);
      expect(failedAssertions(silent)).toEqual([
        'attemptedControlsMapped',
        'droppedFiltersAcknowledged',
      ]);

      const raw = await evaluateSourcing(
        { requested: true, mappedFields: MAPPED },
        { ...dropped, message: 'Controls failed: Not mapped on index "logs".' }
      );
      expect(failedAssertions(raw)).toContain('replyWithoutRawErrors');

      const vague = await evaluateSourcing(
        { requested: true, mappedFields: MAPPED },
        { ...dropped, message: "Some of the filters couldn't be added." }
      );
      expect(failedAssertions(vague)).toContain('droppedFiltersAcknowledged');

      const plain = await evaluateSourcing(
        { requested: true, mappedFields: MAPPED },
        {
          ...dropped,
          message:
            "I couldn't add the status code filter because that field is not available in the data.",
        }
      );
      expect(failedAssertions(plain)).toEqual(['attemptedControlsMapped']);
    });

    it('needs no mention when a later call replaced the failed control with a mapped one', async () => {
      const result = await evaluateSourcing(
        { requested: true, mappedFields: MAPPED, mustInclude: ['machine.os'] },
        {
          steps: [
            call([{ field: 'user_agent', userRequested: true }], ['user_agent']),
            call([{ field: 'machine.os.keyword', userRequested: true }]),
          ],
          stored: ['machine.os.keyword'],
        }
      );
      expect(failedAssertions(result)).toEqual(['attemptedControlsMapped']);
    });

    it('does not let requested controls that succeeded alongside the failure stand in for it', async () => {
      const result = await evaluateSourcing(
        { requested: true, mappedFields: MAPPED },
        {
          steps: [
            call(
              [
                { field: 'status_code', userRequested: true },
                { field: 'response', userRequested: true },
              ],
              ['status_code']
            ),
          ],
          stored: ['response.keyword'],
        }
      );
      expect(failedAssertions(result)).toEqual([
        'attemptedControlsMapped',
        'droppedFiltersAcknowledged',
      ]);
    });
  });

  describe('requested filters by name', () => {
    const gold = {
      requested: true,
      mappedFields: MAPPED,
      requestedFilters: [
        { name: 'HTTP method', terms: ['method'], substitutes: [] },
        { name: 'status code', terms: ['status'], substitutes: ['response'] },
        { name: 'HTTP version', terms: ['version'], substitutes: [] },
      ],
    };
    const steps = [call([{ field: 'response', userRequested: true }])];

    it('accepts a reply that names the dropped columns by their field names', async () => {
      const result = await evaluateSourcing(gold, {
        steps,
        stored: ['response.keyword'],
        message:
          'Since your query uses `DISSECT` to extract `http_method` and `http_version` as computed columns (not mapped index fields), those two cannot back native Kibana controls.',
      });
      expect(failedAssertions(result)).toEqual([]);
    });

    it('accepts a reply that says the filters are breakdowns but not controls', async () => {
      const result = await evaluateSourcing(gold, {
        steps,
        stored: ['response.keyword'],
        message:
          'HTTP method and version are available as visual breakdowns, but not controls because they are derived at query time from the raw message rather than stored as mapped fields.',
      });
      expect(failedAssertions(result)).toEqual([]);
    });

    it('fails a requested filter the reply names only as a chart breakdown', async () => {
      const result = await evaluateSourcing(gold, {
        steps,
        stored: ['response.keyword'],
        message: 'The HTTP method and HTTP version breakdowns are pie charts.',
      });
      expect(failedAssertions(result)).toEqual([
        'requestedFilter.HTTP method',
        'requestedFilter.HTTP version',
      ]);
    });

    it('accepts a stored control on a mapped stand-in without a mention', async () => {
      const result = await evaluateSourcing(
        { ...gold, requestedFilters: [gold.requestedFilters[1]] },
        { steps, stored: ['response.keyword'] }
      );
      expect(failedAssertions(result)).toEqual([]);
    });
  });
});
