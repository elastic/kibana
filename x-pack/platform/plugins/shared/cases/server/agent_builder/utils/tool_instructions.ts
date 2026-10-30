/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isTopLevelAppEnabled } from '../../common/top_level_app';

/** Appended to every Cases tool description; applies to all string fields. */
export const CASES_TOOL_TEXT_INSTRUCTION =
  '\n\nText fields: use real newlines, not literal \\n sequences.';

/**
 * Prepended to every Cases tool description. Cases are partitioned across three
 * solutions; the agent must establish which one before any operation (including
 * by `case_id` — IDs resolve a record but context confirms intent).
 */
export const CASES_SOLUTION_CONTEXT_INSTRUCTION =
  'STOP. Do NOT call this tool unless the user has named which Elastic app they are in — Security, Observability, or Stack Management — in their current or an earlier message. Otherwise ASK first: "Which Elastic app is this in — Security, Observability, or Stack Management?" Topic-keyword inference is NOT enough. Calling this tool with multiple solution values to "cover all three" is ALWAYS a bug. Applies to every mode, including operations on a `case_id`.';

/**
 * With the top-level Cases app every case lives in one app, and `owner` only records which
 * solution a case came from, so the agent must not ask the user to pick an app first.
 */
export const CASES_SOURCE_INSTRUCTION =
  "Cases from every solution live in one Cases app. `owner` is the solution a case came from (`securitySolution`, `observability`, or `cases`). Pass it only to narrow results when the user asks for one solution's cases; otherwise omit it to cover every case the user can access. Never ask which app the user is in.";

/** The solution guidance for cases tool descriptions, for the current Cases app mode. */
export const getCasesSolutionContextInstruction = (): string =>
  isTopLevelAppEnabled() ? CASES_SOURCE_INSTRUCTION : CASES_SOLUTION_CONTEXT_INSTRUCTION;
