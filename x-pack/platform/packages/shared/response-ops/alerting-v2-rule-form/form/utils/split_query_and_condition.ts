/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, BasicPrettyPrinter, isProperNode } from '@elastic/esql';
import type { ESQLAstItem, ESQLForkParens, ESQLSingleAstItem } from '@elastic/esql/types';

export interface SplitQueryResult {
  /** The query without the last WHERE clause */
  baseQuery: string;
  /** The WHERE clause expression (without the "WHERE" keyword) */
  condition: string;
}

/**
 * Splits an ES|QL query into a base query and a condition by extracting
 * the last WHERE clause.
 *
 * For alerting purposes, the "condition" is typically the threshold or filter
 * that determines when to trigger an alert, while the "base query" defines
 * what data to analyze.
 *
 * @example
 * // Query with STATS and trailing WHERE (threshold condition)
 * splitQueryAndCondition('FROM logs-* | STATS count() BY host | WHERE count > 100')
 * // Returns: { baseQuery: 'FROM logs-* | STATS count() BY host', condition: 'count > 100' }
 *
 * @example
 * // Query with only WHERE (document-level condition)
 * splitQueryAndCondition('FROM logs-* | WHERE status >= 500')
 * // Returns: { baseQuery: 'FROM logs-*', condition: 'status >= 500' }
 *
 * @param query - The ES|QL query string to split
 * @returns The split result with baseQuery and condition, or null if no WHERE clause exists
 */
export const splitQueryAndCondition = (query: string): SplitQueryResult | null => {
  if (!query?.trim()) {
    return null;
  }

  try {
    const { root, errors } = Parser.parse(query);

    // If there are parse errors, bail out
    if (errors.length > 0) {
      return null;
    }

    const { commands } = root;

    // Only split if the last command is WHERE — if WHERE appears earlier
    // (followed by STATS, etc.), the condition wouldn't properly bound
    // subsequent transformations.
    const lastCommand = commands.at(-1);
    if (lastCommand?.name !== 'where') {
      return null;
    }

    const whereCommand = lastCommand;

    // Extract the condition expression from the WHERE command's arguments
    const conditionArg = whereCommand.args[0];
    if (!conditionArg) {
      return null;
    }

    // Serialize the condition expression back to a string
    const condition = serializeExpression(conditionArg);
    if (!condition) {
      return null;
    }

    // Build the base query from all commands before the WHERE
    const baseCommands = commands.slice(0, -1);

    // If no commands remain, return null (edge case: query was only "WHERE ...")
    if (baseCommands.length === 0) {
      return null;
    }

    // Serialize each command and join with pipes
    const baseQuery = baseCommands.map((cmd) => BasicPrettyPrinter.command(cmd)).join(' | ');

    return {
      baseQuery,
      condition,
    };
  } catch {
    return null;
  }
};

/**
 * Serializes an AST expression node back to a string.
 * Handles both single nodes and arrays of nodes.
 */
const serializeExpression = (node: ESQLAstItem | ESQLForkParens): string | null => {
  if (Array.isArray(node)) {
    const firstProperNode = node.find(isProperNode);
    return firstProperNode
      ? BasicPrettyPrinter.expression(firstProperNode as ESQLSingleAstItem)
      : null;
  }
  return isProperNode(node) ? BasicPrettyPrinter.expression(node) : null;
};
