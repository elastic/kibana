/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TIME_SLIDER_CONTROL,
  getControlFields,
  getControls,
  withoutKeyword,
} from '../dashboard_panels';
import type { ControlsGold, DashboardAgentEvaluator } from '../types';
import { noDashboardResult, scoreChecks, skippedResult, type Check } from '../evaluator_utils';
import {
  getAddControlsFailures,
  getAttemptedControls,
  type AttemptedControl,
  type OperationFailure,
} from '../extract_dashboard';

export const DASHBOARD_CONTROL_SOURCING_EVALUATOR_NAME = 'Dashboard Control Sourcing';

/** Fragments of the server's `add_controls` failure messages the reply must not repeat. */
const RAW_FAILURE_TEXT =
  /not mapped on index|unknown column|conflicting mappings|not aggregatable|needs a (keyword|numeric)/i;
/**
 * A sentence that names a filter missing from the dashboard and talks about
 * controls accounts for it: the stored controls already show it was not added.
 * Naming it alone is not enough, since the same field is often a chart breakdown.
 */
const MENTIONS_CONTROL = /\b(controls?|filters?|dropdowns?)\b/i;

/** Exact membership: the mapped field list already names every real `.keyword` sibling. */
const isMapped = (field: string, mappedFields: readonly string[]): boolean =>
  mappedFields.includes(field);

const sameField = (a: string, b: string): boolean => withoutKeyword(a) === withoutKeyword(b);

type DataControl = AttemptedControl & { field: string };

const isDataControl = (control: AttemptedControl): control is DataControl =>
  control.type !== TIME_SLIDER_CONTROL && control.field !== undefined;

const unique = (values: string[]): string[] => [...new Set(values)];

/**
 * Controls the failures cover: the server groups same-message failures as
 * "a, b, c", and a field retried and rejected again is still one failed control.
 */
const getFailedFields = (failures: OperationFailure[]): string[] =>
  unique(
    failures.flatMap(({ identifier }) =>
      identifier.split(',').map((field) => withoutKeyword(field.trim()))
    )
  );

/**
 * Stored requested controls on fields first asked for in a later
 * `generate_dashboard` call than the first `add_controls` failure: retries
 * that stand in for a control the server could not add. Requested controls
 * that succeeded alongside the failure fill other requests, so they do not count.
 */
const countReplacements = (
  attemptedData: DataControl[],
  failures: OperationFailure[],
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

const toSentences = (message: string): string[] =>
  message.split(/(?<=[.!?])\s+|\n+/).filter((sentence) => sentence.trim().length > 0);

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Underscores and dots separate words too, so `http_method` names the
// "method" filter and "status code" names the `status_code` field.
const namesTerm = (sentence: string, terms: readonly string[]): boolean =>
  terms.some((term) => {
    const words = term
      .split(/[\s._]+/)
      .map(escapeRegExp)
      .join('[\\s_.-]+');
    return new RegExp(`(?:^|[^a-z0-9])${words}(?:$|[^a-z0-9])`, 'i').test(sentence);
  });

const accountsFor = (sentences: string[], terms: readonly string[]): boolean =>
  sentences.some((sentence) => namesTerm(sentence, terms) && MENTIONS_CONTROL.test(sentence));

const checkSourcing = (
  { requested, mappedFields, mustInclude = [], requestedFilters = [] }: ControlsGold,
  {
    storedFields,
    attempted,
    failures,
    message,
  }: {
    storedFields: string[];
    attempted: AttemptedControl[];
    failures: OperationFailure[];
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

  // A requested filter the agent neither added on a substitute nor called out
  // was dropped silently, whether or not the server ever saw it.
  const sentences = toSentences(message);
  for (const { name, terms, substitutes } of requestedFilters) {
    const substitute = storedFields.find((stored) =>
      substitutes.some((field) => sameField(stored, field))
    );
    const acknowledged = accountsFor(sentences, terms);
    checks.push({
      assertion: `requestedFilter.${name}`,
      passed: substitute !== undefined || acknowledged,
      detail: substitute
        ? `${name} is filtered on ${substitute}`
        : acknowledged
        ? `the reply names the ${name} filter alongside controls`
        : `no control for ${name}, and the reply does not account for it`,
    });
  }

  checks.push({
    assertion: 'replyWithoutRawErrors',
    passed: !RAW_FAILURE_TEXT.test(message),
    detail: RAW_FAILURE_TEXT.test(message)
      ? `the reply repeats a raw add_controls error: "${RAW_FAILURE_TEXT.exec(message)?.[0]}"`
      : 'the reply repeats no raw add_controls error',
  });

  // A failed requested control the agent replaced with a stored mapped one
  // (the retry the guidance allows) needs no mention; one it gave up on does.
  // Replacements are not tied to the failure they stand in for, so the reply
  // must name at least as many failed fields as were left unreplaced.
  const failedFields = getFailedFields(failures);
  const satisfiedCount = countReplacements(attemptedData, failures, storedFields);
  const unreplacedCount = failedFields.length - satisfiedCount;
  if (requested && unreplacedCount > 0) {
    const named = failedFields.filter((field) => accountsFor(sentences, [field]));
    checks.push({
      assertion: 'droppedFiltersAcknowledged',
      passed: named.length >= unreplacedCount,
      detail: `${failedFields.length} requested control(s) failed (${failedFields.join(
        ', '
      )}) and ${satisfiedCount} replaced; the reply accounts for ${
        named.length === 0 ? 'none' : named.join(', ')
      }`,
    });
  }

  return checks;
};

/**
 * Controls query the index directly, so a control on a column that only
 * exists in an ES|QL result (`DISSECT`, `GROK`, `EVAL`) renders "Unknown
 * column". Checks that the agent asked for and stored controls on mapped
 * fields only, flagged at least one `user_requested` exactly when the prompt asked
 * for controls, added the controls the prompt names, and, when a requested control
 * could not be added, said so in plain words instead of repeating the error.
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
    const { dashboard } = output;
    if (!dashboard) {
      return noDashboardResult;
    }

    const steps = output.steps ?? [];
    const attempted = getAttemptedControls(steps);
    const failures = getAddControlsFailures(steps);
    const storedFields = getControls(dashboard).flatMap(getControlFields);
    const checks = checkSourcing(gold, {
      storedFields,
      attempted,
      failures,
      message: output.messages.at(-1)?.message ?? '',
    });
    return scoreChecks(checks, {
      subject: 'control sourcing',
      passLabel: 'mapped',
      metadata: { attempted, storedFields, failures },
    });
  },
};
