/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Local step enum for the staged ES|QL wizard (LEAD DECISION 2026-09-29,
 * g2sz.10, pass 2: shell option (b) — a thin ES|QL-only stepper with its own
 * enum + WizardNav + EuiStepsHorizontal, rather than extending the shared
 * `WIZARD_STEPS` used by the classic DataView-backed wizards).
 */
export enum ESQL_WIZARD_STEPS {
  QUERY_TIME_RANGE,
  PICK_FIELDS,
  JOB_DETAILS,
  SUMMARY,
}

export const ESQL_WIZARD_STEP_ORDER: ESQL_WIZARD_STEPS[] = [
  ESQL_WIZARD_STEPS.QUERY_TIME_RANGE,
  ESQL_WIZARD_STEPS.PICK_FIELDS,
  ESQL_WIZARD_STEPS.JOB_DETAILS,
  ESQL_WIZARD_STEPS.SUMMARY,
];
