/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Guidance shown to the agent when the eval-dataset-management skill is loaded. It
 * documents the tools and the recommended discover -> preview -> save/run flow.
 */
export const EVAL_DATASET_MANAGEMENT_SKILL_CONTENT = `## When to Use This Skill

Use this skill when the user wants to **manage evaluation datasets** with the
Evaluations (evals) feature: creating, updating, deleting, and curating them.

## Core Concepts

The target is either:
- \`target: 'inference'\` — invoke the model connector(s) directly, with no agent in the loop.
- \`target: 'agent'\` — run an Agent Builder agent via converse. Requires an \`agent_id\`.

Experiments run as **workflows**. You never hand-write the workflow YAML — the preview/save/run
tools generate valid YAML deterministically from the configuration.

## Gathering the Configuration (ask, don't assume)

Every experiment requires the inputs below. **Never** fill any of them with a guess or a default,
and never silently auto-pick the first (or only) candidate a discovery tool returns:

- **Target** — \`target: 'inference'\` (direct model invocation) or \`target: 'agent'\` plus the
  \`agent_id\` to evaluate. Never infer this from context: if the user has not said which one they
  want, ask, and offer both.
- **Model(s) under evaluation** — one or more \`connector_ids\` (two or more = cross-model).
- **Dataset(s)** — one or more \`dataset_ids\`.
- **Evaluator(s)** — one or more, plus a judge \`connector_id\` for every \`needsJudgeConnector: true\` evaluator.

If the user has not **explicitly** specified one of these, stop and ask before continuing. When you
ask: call the matching discovery tool, present up to **5** concrete options (each as \`name (id)\`),
and invite the user to type a different value or ask to see more. If a discovery tool returns exactly
one candidate, propose it explicitly and ask the user to confirm — do not assume it. Only proceed to
preview/save/run once every input above has been confirmed by the user.



## Dataset Management Rules

`;
