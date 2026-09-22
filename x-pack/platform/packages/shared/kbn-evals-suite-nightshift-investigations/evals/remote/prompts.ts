/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Eval-only suffix appended to every remote-telemetry question. It follows the shape of the
 * Deductive per-cluster constraints: the incident record that describes the answer is off
 * limits, evidence must precede the incident being declared, and resolution updates never
 * count as causes.
 */
export const ELASTIC_INVESTIGATION_EVAL_CONSTRAINTS =
  '\n\n[EVAL-ONLY INVESTIGATION CONSTRAINTS]\n- Ground the root cause in observability evidence from the connected Elasticsearch cluster: logs, metrics, traces, alerts and deployment or configuration changes.\n- Do NOT look up the incident, alert or ticket that describes this problem in any incident, paging, chat or ticketing system; its notes contain the answer and using them invalidates the evaluation.\n- Use only evidence recorded BEFORE the incident was detected. Later mitigation or resolution updates are not causal evidence.\n- If pre-incident evidence is insufficient, explicitly state that limitation.';
