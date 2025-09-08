/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-ast';
import type { ESQLAstCommand, ESQLAstItem } from '@kbn/esql-ast';
import type { DissectProcessor } from '../../../../types/processors';
import { parseMultiDissectPatterns } from '../../../../types/utils/dissect_patterns';
import { conditionToESQL } from '../condition_to_esql';
import { castFieldsToString, buildOptInCondition, buildOptOutCondition, buildFork } from './common';

/**
 * Converts a Streamlang DissectProcessor into a list of ES|QL AST commands.
 *
 * Forking logic:
 *  - If neither ignore_missing nor where is provided: emit a single DISSECT command.
 *  - Otherwise, fork into:
 *      * dissect (opt-in) branch
 *      * skip (opt-out) branch
 *    Opt-in condition: (exists(from) if ignore_missing) AND (where condition, if provided)
 *    Opt-out condition: (NOT exists(from) if ignore_missing) OR (NOT where condition, if provided)
 *
 * Type handling:
 *  - Pre-fork: cast all prospective DISSECT output fields via TO_STRING to prevent FORK type conflicts.
 *  - Post-fork: no automatic casting; DISSECT yields keyword (string) values; further casts are user driven.
 *
 *  @example
 *     ```typescript
 *     const streamlangDSL: StreamlangDSL = {
 *        steps: [
 *          {
 *            action: 'dissect',
 *            from: 'message',
 *            pattern: '[%{log.level}] %{client.ip}',
 *            ignore_missing: true,
 *            where: {
 *              field: 'flags.process',
 *              exists: true,
 *            },
 *          } as DissectProcessor,
 *        ],
 *      };
 *    ```
 *
 *   Generates (conceptually):
 *    ```txt
 *      | EVAL `log.level` = TO_STRING(`log.level`)
 *      | EVAL `client.ip` = TO_STRING(`client.ip`)
 *      | FORK
 *        (WHERE NOT(message IS NULL) AND NOT(`flags.process` IS NULL) | DISSECT message "[%{log.level}] %{client.ip}")
 *        (WHERE NOT NOT(message IS NULL) OR NOT NOT(`flags.process` IS NULL))
 *      | DROP _fork
 *    ```
 */
export function convertDissectProcessorToESQL(processor: DissectProcessor): ESQLAstCommand[] {
  const {
    from,
    pattern, // eslint-disable-next-line @typescript-eslint/naming-convention
    append_separator, // eslint-disable-next-line @typescript-eslint/naming-convention
    ignore_missing = false, // default same as ES Dissect Enrich Processor
    where,
  } = processor;
  const fromColumn = Builder.expression.column(from);
  const dissectCommand = buildDissectCommand(pattern, fromColumn, append_separator);

  // Whenever there's a need to conditionally execute DISSECT, we need ES|QL's FORK
  // It's needed for a Streamlang's where clause or when ignore_missing is true
  const needFork = ignore_missing || Boolean(where);

  // If no forking needed, just return plain dissect command
  if (!needFork) {
    return [dissectCommand];
  }

  const commands: ESQLAstCommand[] = [];

  // Pre-cast all dissect output fields to string to unify branch schemas
  // ES|QL requires all branches to have identical schemas, or it fails with:
  // "type": "verification_exception",
  // "reason": """Found 1 problem line 2:5: Column [<a>] has conflicting data types in FORK branches: [<mapped-type>] and [KEYWORD]"""
  const { allFields } = parseMultiDissectPatterns([pattern]);
  const fieldNames = allFields.map((f) => f.name);
  commands.push(...castFieldsToString(fieldNames));

  // WHERE conditions for ES|QL's FORK branches
  const dissectCondition = buildOptInCondition(from, ignore_missing, where, conditionToESQL);
  const skipCondition = buildOptOutCondition(from, ignore_missing, where, conditionToESQL);

  // Unlikely that FORK won't have a skip branch, but handle it just in case
  if (!skipCondition) {
    commands.push(dissectCommand);
    return commands;
  }

  const dissectBranch = Builder.expression.query([
    Builder.command({ name: 'where', args: [dissectCondition] }),
    dissectCommand,
  ]);
  const skipBranch = Builder.expression.query([
    Builder.command({ name: 'where', args: [skipCondition] }),
  ]);

  // The FORK command
  commands.push(buildFork(dissectBranch, skipBranch));

  // Clean up the _fork field added by FORK
  commands.push(Builder.command({ name: 'drop', args: [Builder.expression.column('_fork')] }));

  return commands;
}

/** Build the base DISSECT command (no conditional logic) */
function buildDissectCommand(pattern: string, fromColumn: ESQLAstItem, appendSep?: string) {
  const args: ESQLAstItem[] = [fromColumn, Builder.expression.literal.string(pattern)];
  const cmd = Builder.command({ name: 'dissect', args });
  if (appendSep) {
    cmd.args.push(
      Builder.option({
        name: 'append_separator',
        args: [Builder.expression.literal.string(appendSep)],
      })
    );
  }
  return cmd;
}
