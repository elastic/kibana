/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAgentTaskOutput, DashboardDatasetExample } from '../types';
import { GENERATE_DASHBOARD_TOOL_ID } from '../extract_dashboard';
import { control, dashboard } from '../test_helpers';
import { dashboardControlSourcingEvaluator, getControlReplyCriteria } from './control_sourcing';

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

/** One generate_dashboard call that sends controls, with a failure for each failed field. */
const call = (attempts: Attempt[], failedFields: string[] = []): Record<string, unknown> => ({
  type: 'tool_call',
  tool_id: GENERATE_DASHBOARD_TOOL_ID,
  params: {
    controls: attempts.map(({ field, userRequested }) => ({
      type: 'options_list_control',
      field_name: field,
      index: 'logs',
      ...(userRequested ? { user_requested: true } : {}),
    })),
  },
  results: [
    {
      type: 'dashboard',
      data: {
        attachment_id: 'dash',
        ...(failedFields.length > 0
          ? {
              failures: failedFields.map((field) => ({
                type: 'upsert_dashboard',
                kind: 'control',
                identifier: `controls[${attempts.findIndex((attempt) => attempt.field === field)}]`,
                error: `Field "${field}" on index "logs" is not mapped.`,
              })),
            }
          : {}),
      },
    },
  ],
});

type ControlsGold = NonNullable<DashboardDatasetExample['output']>['controls'];

interface Run {
  steps: Array<Record<string, unknown>>;
  stored: string[];
  message?: string;
  timeSlider?: boolean;
}

const runOutput = ({
  steps,
  stored,
  message = 'Here is your dashboard.',
  timeSlider = false,
}: Run): DashboardAgentTaskOutput => ({
  errors: [],
  messages: [{ message }],
  steps,
  dashboard: dashboard([], {
    pinned_panels: [
      ...stored.map((field) => control(field)),
      ...(timeSlider ? [{ type: 'time_slider_control', id: 'time_slider', config: {} }] : []),
    ],
  }),
});

const evaluateSourcing = (gold: ControlsGold, run: Run) =>
  dashboardControlSourcingEvaluator.evaluate({
    input: { question: 'q' },
    expected: { controls: gold },
    metadata: undefined,
    output: runOutput(run),
  });

const replyCriteria = (gold: ControlsGold, run: Run): string[] =>
  getControlReplyCriteria({ controls: gold }, runOutput(run));

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

  it('scores 0 when a seeded dashboard was never written', async () => {
    const seed = runOutput({ steps: [], stored: ['geo.dest'], timeSlider: true });
    const result = await dashboardControlSourcingEvaluator.evaluate({
      input: { question: 'q' },
      expected: { controls: { requested: true, mappedFields: MAPPED, mustInclude: ['geo.dest'] } },
      metadata: undefined,
      output: { ...seed, before: seed.dashboard },
    });
    expect(result.score).toBe(0);
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

  it('fails a control the prompt removed and a time slider it should have dropped', async () => {
    const gold = {
      requested: true,
      mappedFields: MAPPED,
      mustExclude: ['machine.os', 'bytes'],
      timeSlider: false,
    };
    const steps = [call([{ field: 'geo.src', userRequested: true }])];
    const kept = await evaluateSourcing(gold, {
      steps,
      stored: ['geo.src', 'machine.os.keyword'],
      timeSlider: true,
    });
    expect(failedAssertions(kept)).toEqual(['mustExclude.machine.os', 'timeSlider']);
    const removed = await evaluateSourcing(gold, { steps, stored: ['geo.src'] });
    expect(removed.score).toBe(1);
  });

  it('wants exactly one time slider when the gold keeps it', async () => {
    const gold = { requested: true, mappedFields: MAPPED, timeSlider: true };
    const steps = [call([{ field: 'geo.src', userRequested: true }])];
    const result = await evaluateSourcing(gold, { steps, stored: ['geo.src'] });
    expect(failedAssertions(result)).toEqual(['timeSlider']);
  });

  describe('dropped requested controls', () => {
    const dropped = {
      steps: [call([{ field: 'status_code', userRequested: true }], ['status_code'])],
      stored: [],
    };

    it('fails a reply that repeats the raw control error', async () => {
      const raw = await evaluateSourcing(
        { requested: true, mappedFields: MAPPED },
        {
          ...dropped,
          message: 'Controls failed: Field "status_code" on index "logs" is not mapped.',
        }
      );
      expect(failedAssertions(raw)).toEqual(['attemptedControlsMapped', 'replyWithoutRawErrors']);
    });

    it('asks the reply judge to check the dropped field is named', () => {
      expect(replyCriteria({ requested: true, mappedFields: MAPPED }, dropped)).toEqual([
        expect.stringContaining('Controls on these fields failed: status_code'),
      ]);
    });

    it('needs no mention when a later call replaced the failed control with a mapped one', () => {
      const criteria = replyCriteria(
        { requested: true, mappedFields: MAPPED, mustInclude: ['machine.os'] },
        {
          steps: [
            call([{ field: 'user_agent', userRequested: true }], ['user_agent']),
            call([{ field: 'machine.os.keyword', userRequested: true }]),
          ],
          stored: ['machine.os.keyword'],
        }
      );
      expect(criteria).toEqual([]);
    });

    it('does not let requested controls that succeeded alongside the failure stand in for it', () => {
      const criteria = replyCriteria(
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
      expect(criteria).toHaveLength(1);
    });
  });

  describe('requested filters by name', () => {
    const gold = {
      requested: true,
      mappedFields: MAPPED,
      requestedFilters: [
        { name: 'HTTP method', substitutes: [] },
        { name: 'status code', substitutes: ['response'] },
        { name: 'HTTP version', substitutes: [] },
      ],
    };
    const run = {
      steps: [call([{ field: 'response', userRequested: true }])],
      stored: ['response.keyword'],
    };

    it('asks the reply judge about each requested filter with no stand-in control', () => {
      expect(replyCriteria(gold, run)).toEqual([
        expect.stringContaining('the HTTP method filter'),
        expect.stringContaining('the HTTP version filter'),
      ]);
    });

    it('needs no mention of a filter a stored control stands in for', () => {
      expect(replyCriteria({ ...gold, requestedFilters: [gold.requestedFilters[1]] }, run)).toEqual(
        []
      );
    });

    it('asks nothing when the prompt did not request controls', () => {
      expect(replyCriteria({ ...gold, requested: false }, run)).toEqual([]);
    });
  });
});
