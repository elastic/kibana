/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evalsTools } from './tools/common';

/**
 * Guidance shown to the agent when the eval-experiment-authoring skill is loaded. It
 * documents the tools and the recommended discover -> preview -> save/run flow.
 */
export const EVAL_EXPERIMENTS_SKILL_CONTENT = `## When to Use This Skill

Use this skill when the user wants to **evaluate an Agent Builder agent or tool** with the
Evaluations (evals) feature: composing an experiment, previewing it, saving it as a
reusable workflow, or running it now.

Do **not** use this skill to author general workflows (use the workflow-authoring skill) or
to answer questions about evaluation results that already exist.

## Core Concepts

An **experiment** evaluates a **target** (one Agent Builder \`agent_id\` **or** one \`tool_id\`)
against one or more **datasets**, scoring each example with one or more **evaluators**, using
one or more model **connectors**. Two or more connectors trigger a cross-model comparison.

Experiments run as **workflows**. You never hand-write the workflow YAML — the preview/save/run
tools generate valid YAML deterministically from the configuration.

## Gathering the Configuration (ask, don't assume)

Every experiment requires the inputs below. **Never** fill any of them with a guess or a default,
and never silently auto-pick the first (or only) candidate a discovery tool returns:

- **Target** — exactly one \`agent_id\` or \`tool_id\`.
- **Model(s) under evaluation** — one or more \`connector_ids\` (two or more = cross-model).
- **Dataset(s)** — one or more \`dataset_ids\`.
- **Evaluator(s)** — one or more, plus a judge \`connector_id\` for every \`needsJudgeConnector: true\` evaluator.

If the user has not **explicitly** specified one of these, stop and ask before continuing. When you
ask: call the matching discovery tool, present up to **5** concrete options (each as \`name (id)\`),
and invite the user to type a different value or ask to see more. If a discovery tool returns exactly
one candidate, propose it explicitly and ask the user to confirm — do not assume it. Only proceed to
preview/save/run once every input above has been confirmed by the user.

## Recommended Flow

1. **Discover** the building blocks (only fetch what you still need):
   - \`${evalsTools.listDatasets}\` - datasets and their ids.
   - \`${evalsTools.listTargets}\` - agents and tools to pick the \`agent_id\` or \`tool_id\`.
   - \`${evalsTools.listConnectors}\` - model connectors and their ids. Use this to map a model name
     the user mentioned (e.g. "Claude Opus 4.5") to a \`connector_id\`, for both the model under
     evaluation and any llm evaluator judge.
   - \`${evalsTools.listEvaluators}\` - evaluators. Note two flags per evaluator:
     - \`needsJudgeConnector: true\` -> it is an \`llm\` evaluator and **requires** a \`connector_id\` per evaluator.
     - \`supportsBareToolTrace: false\` -> it only produces meaningful scores for an **agent** target, not a bare \`tool_id\`.
2. **Preview** with \`${evalsTools.previewExperiment}\` to show the generated workflow YAML and the
   run plan (single, dataset fan-out, or cross-model). This writes nothing — use it to confirm the
   configuration with the user.
3. **Save or run**:
   - \`${evalsTools.saveExperiment}\` - persist a reusable workflow. Returns a \`workflow_id\`.
     To re-save the same experiment after edits, pass that \`workflow_id\` back so it is **updated in
     place** instead of duplicated.
   - \`${evalsTools.runExperiment}\` - run immediately. This launches real workflow executions (which
     call the model/connectors and ingest scores), so it always asks the user to confirm first.
     It returns a \`results_url\` to view the live run.

## Composition Rules

- Provide exactly **one** of \`agent_id\` or \`tool_id\` (never both, never neither).
- \`connector_ids\`, \`dataset_ids\`, and \`evaluators\` each need at least one entry.
- Resolve every connector id (models under evaluation and judge connectors) from
  \`${evalsTools.listConnectors}\`. Never guess connector ids or try to read them from system
  indices or a throwaway workflow. If a name is unspecified or ambiguous, ask the user to pick from
  the list — do not default to the first match.
- For every evaluator with \`needsJudgeConnector: true\`, include a \`connector_id\`. Omit it for
  \`code\` evaluators.
- When evaluating a bare \`tool_id\`, prefer evaluators with \`supportsBareToolTrace: true\`; warn the
  user if they ask for one that does not apply.
- Results are always recorded in the user's current space.

## Presenting to the User

When you summarize a configuration or run plan for the user (e.g. before asking to run), use a
short **bulleted list**, not a markdown table.

## After Running

Share the returned \`results_url\` so the user can watch the run and inspect scores as they are
ingested. Report the run mode (single / dataset fan-out / cross-model) and how many executions
were launched.`;
