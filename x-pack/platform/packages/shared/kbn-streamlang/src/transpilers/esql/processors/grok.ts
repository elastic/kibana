/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-ast';
import type { ESQLAstCommand, ESQLAstItem } from '@kbn/esql-ast';
import type { GrokProcessor } from '../../../../types/processors';
import { parseMultiGrokPatterns } from '../../../../types/utils/grok_patterns';
import { conditionToESQL } from '../condition_to_esql';
import {
  castFieldsToGrokTypes,
  buildOptInCondition,
  buildOptOutCondition,
  buildFork,
} from './common';

/**
 * Converts a Streamlang GrokProcessor into a list of ES|QL AST commands.
 *
 * Forking logic:
 *  - If neither `ignore_missing` nor `where` is provided: emit a single GROK command.
 *  - Otherwise, fork into:
 *      * grok (opt-in) branch e.g. WHERE NOT(from IS NULL) AND (where condition, if provided)
 *      * skip (opt-out) branch e.g. WHERE (from IS NULL) OR (NOT where condition, if provided)
 *
 * Type handling:
 *  - Pre-fork: cast all GROKed target fields to their suffixed (or default) types with
 *              TO_STRING (keyword), TO_INTEGER or TO_DOUBLE. This is to prevent the verification_exception
 *              which GROK raises when the mapped field types conflict with GROK output types.
 *              For such a case, GROK fails with an error e.g.:
 *              `"""Found 1 problem
 * line 4:12: Column [size] has conflicting data types in FORK branches: [KEYWORD] and [INTEGER]"""`
 *
 * Example:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'grok',
 *          from: 'message',
 *          patterns: ["%{IP:client.ip} %{NUMBER:size:int} %{NUMBER:burn_rate:float}"],
 *          ignore_missing: true,
 *          where: { field: 'flags.process', exists: true },
 *        } as GrokProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates (conceptually):
 *    ```txt
 *    | EVAL `client.ip` = TO_STRING(`client.ip`)
 *    | EVAL `size` = TO_INTEGER(`size`)
 *    | EVAL `burn_rate` = TO_DOUBLE(`burn_rate`)
 *    | FORK
 *      (WHERE NOT(message IS NULL) AND NOT(`flags.process` IS NULL) | GROK message "%{IP:client.ip} %{NUMBER:size:int} %{NUMBER:burn_rate:float}")
 *      (WHERE NOT NOT(message IS NULL) OR NOT NOT(`flags.process` IS NULL))
 *    | DROP _fork
 *    ```
 */
export function convertGrokProcessorToESQL(processor: GrokProcessor): ESQLAstCommand[] {
  const {
    from,
    patterns, // eslint-disable-next-line @typescript-eslint/naming-convention
    ignore_missing = false, // default mirrors ingest grok behavior
    where,
  } = processor;

  const fromColumn = Builder.expression.column(from);
  const primaryPattern = patterns[0];
  const grokCommand = buildGrokCommand(fromColumn, primaryPattern);

  // Need FORK if conditional or ignore_missing semantics are involved
  const needFork = ignore_missing || Boolean(where);
  if (!needFork) {
    return [grokCommand];
  }

  const commands: ESQLAstCommand[] = [];

  // Pre-cast existing target fields to their configured GROK types to prevent type conflicts
  const { allFields } = parseMultiGrokPatterns([primaryPattern]);
  if (allFields.length > 0) {
    commands.push(...castFieldsToGrokTypes(allFields));
  }

  // Build opt-in / opt-out conditions for FORK
  const grokOptIn = buildOptInCondition(from, ignore_missing, where, conditionToESQL);
  const grokOptOut = buildOptOutCondition(from, ignore_missing, where, conditionToESQL);

  // If no opt-out branch, execute GROK directly
  if (!grokOptOut) {
    commands.push(grokCommand);
    return commands;
  }

  // Construct branch queries
  const grokBranch = Builder.expression.query([
    Builder.command({ name: 'where', args: [grokOptIn] }),
    grokCommand,
  ]);
  const skipBranch = Builder.expression.query([
    Builder.command({ name: 'where', args: [grokOptOut] }),
  ]);

  // FORK command
  commands.push(buildFork(grokBranch, skipBranch));

  // Drop helper column
  commands.push(Builder.command({ name: 'drop', args: [Builder.expression.column('_fork')] }));

  return commands;
}

/** Build the GROK command (primary pattern only) */
function buildGrokCommand(fromColumn: ESQLAstItem, pattern: string): ESQLAstCommand {
  return Builder.command({
    name: 'grok',
    args: [fromColumn, Builder.expression.literal.string(pattern)],
  });
}
