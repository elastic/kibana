/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Agent reasoning and intended tool that caused the HITL pause (S5, nested HITL). */
export interface AgentContext {
  intended_tool: string;
  intended_tool_args: Record<string, unknown>;
  reasoning: string;
}

/** Alias for {@link AgentContext} — used in WAITING_FOR_INPUT step results. */
export type WaitingInputAgentContext = AgentContext;

const isNonArrayObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Type guard: returns true only when all three required fields are present and well-typed. */
export const isAgentContext = (value: unknown): value is AgentContext => {
  if (!isNonArrayObject(value)) return false;
  return (
    typeof value.reasoning === 'string' &&
    typeof value.intended_tool === 'string' &&
    isNonArrayObject(value.intended_tool_args)
  );
};

/** Lenient parser: returns an {@link AgentContext} if the minimal required fields are present.
 *  `intended_tool_args` defaults to `{}` when absent or invalid. */
export const parseAgentContext = (value: unknown): AgentContext | undefined => {
  if (!isNonArrayObject(value)) return undefined;
  const { intended_tool, intended_tool_args, reasoning } = value;
  if (typeof reasoning !== 'string' || typeof intended_tool !== 'string') return undefined;
  const args = isNonArrayObject(intended_tool_args) ? intended_tool_args : {};
  return { intended_tool, intended_tool_args: args, reasoning };
};
