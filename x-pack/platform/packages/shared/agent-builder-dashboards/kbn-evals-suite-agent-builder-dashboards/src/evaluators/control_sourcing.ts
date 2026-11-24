/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import {
  RANGE_SLIDER_CONTROL,
  TIME_SLIDER_CONTROL,
  getControlFields,
  getControls,
  withoutKeyword,
} from '../dashboard_panels';
import type {
  ControlsGold,
  DashboardAgentEvaluator,
  DashboardAgentTaskOutput,
  DashboardDatasetExample,
} from '../types';
import { noDashboardResult, scoreChecks, skippedResult, type Check } from '../evaluator_utils';
import {
  getControlFailures,
  getAttemptedControls,
  hasWrittenDashboard,
  type AttemptedControl,
  type ControlFailure,
} from '../extract_dashboard';

export const DASHBOARD_CONTROL_SOURCING_EVALUATOR_NAME = 'Dashboard Control Sourcing';

/** Fragments of the server's control failure messages the reply must not repeat. */
const RAW_FAILURE_TEXT =
  /on index "|unknown column|conflicting mappings|not aggregatable|_control needs/i;

/** Exact membership: the mapped field list already names every real `.keyword` sibling. */
const isMapped = (field: string, mappedFields: readonly string[]): boolean =>
  mappedFields.includes(field);

const sameField = (a: string, b: string): boolean => withoutKeyword(a) === withoutKeyword(b);

type DataControl = AttemptedControl & { field: string };

const isDataControl = (control: AttemptedControl): control is DataControl =>
  control.type !== TIME_SLIDER_CONTROL && control.field !== undefined;

const unique = (values: string[]): string[] => [...new Set(values)];

/** Fields of the failed controls; a field retried and rejected again is still one failed control. */
const getFailedFields = (failures: ControlFailure[]): string[] =>
  unique(failures.flatMap(({ field }) => (field === undefined ? [] : [withoutKeyword(field)])));

/**
 * Stored requested controls on fields first asked for in a later
 * `generate_dashboard` call than the first control failure: retries
 * that stand in for a control the server could not add. Requested controls
 * that succeeded alongside the failure fill other requests, so they do not count.
 */
const countReplacements = (
  attemptedData: DataControl[],
  failures: ControlFailure[],
  storedFields: string[]
): number => {
  if (failures.length === 0) {
    return 0;
  }
  const firstFailedCall = Math.min(...failures.map(({ call }) => call));
  const fieldsUpToFailure = attemptedData
    .filter(({ call }) => call <= firstFailedCall)
    .map(({ field }) => field);
  const replacements = attemptedData
    .filter(({ userRequested, call }) => userRequested && call > firstFailedCall)
    .map(({ field }) => field)
    .filter(
      (field) =>
        !fieldsUpToFailure.some((earlier) => sameField(earlier, field)) &&
        storedFields.some((stored) => sameField(stored, field))
    );
  return unique(replacements.map(withoutKeyword)).length;
};

/** Controls the agent asked for, the ones the server rejected, and the ones stored. */
const readControls = (
  dashboard: DashboardAttachmentData,
  steps: NonNullable<DashboardAgentTaskOutput['steps']>
) => {
  const controls = getControls(dashboard);
  return {
    attempted: getAttemptedControls(steps),
    failures: getControlFailures(steps),
    storedFields: controls.flatMap(getControlFields),
    rangeSliderFields: controls
      .filter(({ type }) => type === RANGE_SLIDER_CONTROL)
      .flatMap(getControlFields),
    timeSliderCount: controls.filter(({ type }) => type === TIME_SLIDER_CONTROL).length,
  };
};

const checkSourcing = (
  {
    requested,
    mappedFields,
    mustInclude = [],
    mustExclude = [],
    rangeSliders = [],
    timeSlider,
  }: ControlsGold,
  {
    storedFields,
    rangeSliderFields,
    timeSliderCount,
    attempted,
    message,
  }: {
    storedFields: string[];
    rangeSliderFields: string[];
    timeSliderCount: number;
    attempted: AttemptedControl[];
    message: string;
  }
): Check[] => {
  const checks: Check[] = [];
  const unmappedStored = unique(storedFields.filter((field) => !isMapped(field, mappedFields)));
  checks.push({
    assertion: 'storedControlsMapped',
    passed: unmappedStored.length === 0,
    detail:
      unmappedStored.length === 0
        ? `${storedFields.length} stored control(s), all on mapped fields`
        : `controls on fields the index does not have: ${unmappedStored.join(', ')}`,
  });

  const attemptedData = attempted.filter(isDataControl);
  const attemptedFields = unique(attemptedData.map(({ field }) => field));
  const unmappedAttempted = attemptedFields.filter((field) => !isMapped(field, mappedFields));
  if (requested && attemptedData.length === 0) {
    checks.push({
      assertion: 'userRequestedFlag',
      passed: false,
      detail: 'the prompt asked for controls, but the agent asked generate_dashboard for none',
    });
  }
  if (attemptedData.length > 0) {
    checks.push({
      assertion: 'attemptedControlsMapped',
      passed: unmappedAttempted.length === 0,
      detail:
        unmappedAttempted.length === 0
          ? `asked for controls on ${attemptedFields.join(', ')}`
          : `asked for controls on ES|QL-derived columns: ${unmappedAttempted.join(', ')}`,
    });
    // The agent may add controls of its own next to the requested ones, so a
    // request is honoured when at least one control carries the flag; with no
    // request, none may.
    const flagged = attemptedData.filter(({ userRequested }) => userRequested).length;
    checks.push({
      assertion: 'userRequestedFlag',
      passed: requested ? flagged > 0 : flagged === 0,
      detail: requested
        ? `${flagged}/${attemptedData.length} control(s) flagged user_requested`
        : `${flagged} unrequested control(s) flagged user_requested`,
    });
  }

  for (const field of mustInclude) {
    const found = storedFields.some((stored) => sameField(stored, field));
    checks.push({
      assertion: `mustInclude.${field}`,
      passed: found,
      detail: found
        ? `a control filters on ${field}`
        : `no control on ${field}; found [${storedFields.join(', ')}]`,
    });
  }

  for (const field of mustExclude) {
    const kept = storedFields.some((stored) => sameField(stored, field));
    checks.push({
      assertion: `mustExclude.${field}`,
      passed: !kept,
      detail: kept ? `a control still filters on ${field}` : `no control on ${field}`,
    });
  }

  for (const field of rangeSliders) {
    const found = rangeSliderFields.some((stored) => sameField(stored, field));
    checks.push({
      assertion: `rangeSlider.${field}`,
      passed: found,
      detail: found
        ? `a range slider filters on ${field}`
        : `no range slider on ${field}; range sliders are on [${rangeSliderFields.join(', ')}]`,
    });
  }

  if (timeSlider !== undefined) {
    checks.push({
      assertion: 'timeSlider',
      passed: timeSliderCount === (timeSlider ? 1 : 0),
      detail: `expected ${
        timeSlider ? 'one time slider' : 'no time slider'
      }, found ${timeSliderCount}`,
    });
  }

  checks.push({
    assertion: 'replyWithoutRawErrors',
    passed: !RAW_FAILURE_TEXT.test(message),
    detail: RAW_FAILURE_TEXT.test(message)
      ? `the reply repeats a raw control error: "${RAW_FAILURE_TEXT.exec(message)?.[0]}"`
      : 'the reply repeats no raw control error',
  });

  return checks;
};

/**
 * What the reply must say about the requested controls the dashboard does not
 * have: named filters with no control on a stand-in field, and failed controls
 * no later call replaced. Judged by the reply evaluator, not here.
 */
export const getControlReplyCriteria = (
  expected: DashboardDatasetExample['output'],
  output: DashboardAgentTaskOutput
): string[] => {
  const gold = expected?.controls;
  if (!gold?.requested || !output.dashboard) {
    return [];
  }
  const { attempted, failures, storedFields } = readControls(output.dashboard, output.steps ?? []);
  const missingFilters = (gold.requestedFilters ?? [])
    .filter(
      ({ substitutes }) =>
        !storedFields.some((stored) => substitutes.some((field) => sameField(stored, field)))
    )
    .map(({ name }) => name);
  const failedFields = getFailedFields(failures);
  const unreplaced =
    failedFields.length -
    countReplacements(attempted.filter(isDataControl), failures, storedFields);
  return [
    ...missingFilters.map(
      (name) =>
        `The reply tells the user that the ${name} filter could not be added as a dashboard control. Naming ${name} only as a chart or breakdown does not count.`
    ),
    ...(unreplaced > 0
      ? [
          `The reply tells the user in plain words which requested filters could not be added as controls. Controls on these fields failed: ${failedFields.join(
            ', '
          )}; the dashboard's controls are on: ${
            storedFields.join(', ') || 'none'
          }. A failed filter that a control on another field stands in for needs no mention.`,
        ]
      : []),
  ];
};

/**
 * Controls query the index directly, so a control on a column that only
 * exists in an ES|QL result (`DISSECT`, `GROK`, `EVAL`) renders "Unknown
 * column". Checks that the agent asked for and stored controls on mapped
 * fields only, flagged at least one `user_requested` exactly when the prompt asked
 * for controls, added the controls the prompt names and removed the ones it
 * drops (the time slider included), and did not repeat a raw control error in
 * the reply. Whether the reply accounts for dropped controls is judged by the
 * reply evaluator.
 * Scored as the fraction of assertions that hold.
 */
export const dashboardControlSourcingEvaluator: DashboardAgentEvaluator = {
  name: DASHBOARD_CONTROL_SOURCING_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ expected, output }) => {
    const gold = expected?.controls;
    if (!gold) {
      return skippedResult('No gold controls.');
    }
    const { dashboard, before, steps = [] } = output;
    // Without a write on a seeded example the result is the seed, which has none of the requested controls.
    if (!dashboard || (before && !hasWrittenDashboard(output))) {
      return noDashboardResult;
    }

    const { attempted, failures, storedFields, rangeSliderFields, timeSliderCount } = readControls(
      dashboard,
      steps
    );
    const checks = checkSourcing(gold, {
      storedFields,
      rangeSliderFields,
      timeSliderCount,
      attempted,
      message: output.messages.at(-1)?.message ?? '',
    });
    return scoreChecks(checks, {
      subject: 'control sourcing',
      passLabel: 'mapped',
      metadata: { attempted, storedFields, failures },
    });
  },
};
