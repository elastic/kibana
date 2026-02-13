/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { Parser, Walker, walk, isColumn } from '@kbn/esql-language';
import type { ESQLColumn, ESQLCommandOption, ESQLFunction } from '@kbn/esql-language';

/**
 * Extracts column names from the last BY clause in a STATS command.
 *
 * The `@kbn/esql-language` package provides tools to parse ES|QL queries into an
 * Abstract Syntax Tree (AST). The AST represents the query as a tree of nodes,
 * where each node represents a part of the query (commands, columns, functions, etc).
 *
 * For example, the query: `FROM logs-* | STATS count() BY host.name`
 * Gets parsed into an AST like:
 * ```
 * root
 * └── commands[]
 *     ├── { name: 'from', args: ['logs-*'] }
 *     └── { name: 'stats', args: [...], options: [...] }
 *         └── options[]
 *             └── { name: 'by', args: [{ type: 'column', name: 'host.name' }] }
 * ```
 *
 * ## Supported BY Clause Patterns
 *
 * This function handles several patterns that can appear in `STATS ... BY`:
 *
 * 1. **Simple column reference**: `STATS count() BY host.name`
 *    - AST: `{ type: 'column', name: 'host.name' }`
 *    - Result: `['host.name']`
 *
 * 2. **Multiple columns**: `STATS count() BY host.name, service.name`
 *    - AST: Two column nodes in the BY option's args
 *    - Result: `['host.name', 'service.name']`
 *
 * 3. **Function (e.g., BUCKET)**: `STATS count() BY BUCKET(@timestamp, 1h)`
 *    - AST: `{ type: 'function', name: 'bucket', text: 'BUCKET(@timestamp, 1h)' }`
 *    - Result: `['BUCKET(@timestamp, 1h)']` (uses full function text)
 *
 * 4. **Aliased function**: `STATS count() BY category = CATEGORIZE(message)`
 *    - AST: `{ type: 'function', name: '=', args: [column, function] }`
 *    - The `=` is treated as a function with the alias on the left
 *    - Result: `['category']` (uses the alias, not the full expression)
 *
 * @param query - The ES|QL query string
 * @returns Array of column/field names from the BY clause
 */
export const getGroupByColumnsFromQuery = (query: string): string[] => {
  if (!query) {
    return [];
  }

  try {
    // Parse the query string into an AST (Abstract Syntax Tree)
    // The parser returns { root, errors } where root contains the parsed commands
    const { root, errors } = Parser.parse(query);

    // If there are parse errors (invalid syntax), bail out early
    // We don't want to extract potentially incorrect grouping columns
    if (errors.length > 0) {
      return [];
    }

    // Filter to find only STATS commands from all commands in the query
    // A query can have multiple commands separated by pipes: FROM x | STATS y | STATS z
    const statsCommands = root.commands.filter((cmd) => cmd.name === 'stats');
    if (statsCommands.length === 0) {
      return [];
    }

    // Use Walker.matchAll to find all nodes matching a pattern within the STATS commands
    // We're looking for nodes with type: 'option' and name: 'by' (the BY clause)
    // Note: A STATS command can technically have multiple BY clauses (though unusual)
    const statsByOptions = Walker.matchAll(statsCommands, {
      type: 'option',
      name: 'by',
    }) as ESQLCommandOption[];

    if (statsByOptions.length === 0) {
      return [];
    }

    // If there are multiple STATS commands or BY clauses, use the last one
    // This is typically the most relevant for alert grouping purposes
    const lastByOption = statsByOptions[statsByOptions.length - 1];

    const columns: string[] = [];

    // Use walk() to traverse all nodes within the BY clause
    // walk() calls our visitor callbacks for each node it encounters
    walk(lastByOption, {
      // visitColumn is called for each column reference node
      // Example: In `BY host.name`, this handles the `host.name` column
      visitColumn: (node: ESQLColumn) => {
        columns.push(node.name);
      },

      // visitFunction is called for each function node
      // This handles two cases:
      visitFunction: (node: ESQLFunction) => {
        // Case 1: Assignment (aliased expression)
        // Example: `BY category = CATEGORIZE(message)`
        // In the AST, `=` is represented as a function with two arguments:
        // - args[0]: the alias (left side) - a column node
        // - args[1]: the expression (right side) - usually a function
        if (node.name === '=' && node.args.length === 2) {
          const [left] = node.args;
          if (isColumn(left)) {
            // Extract the alias name (e.g., 'category')
            // We use the alias because that's what the grouping key will be called
            columns.push((left as ESQLColumn).name);
          }
        }
        // Case 2: Standalone function (not an assignment)
        // Example: `BY BUCKET(@timestamp, 1h)`
        // We exclude `=` here because we already handled it above
        // For standalone functions, we use the full text representation
        // because that's how the grouping key appears in results
        else if (node.name !== '=') {
          columns.push(node.text);
        }
      },
    });

    return [...new Set(columns)];
  } catch {
    return [];
  }
};

interface UseDefaultGroupByProps {
  query: string;
}

export const useDefaultGroupBy = ({ query }: UseDefaultGroupByProps) => {
  const defaultGroupBy = useMemo(() => {
    return getGroupByColumnsFromQuery(query);
  }, [query]);

  return { defaultGroupBy };
};
