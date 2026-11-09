/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import type { ESQLCommand, ESQLSource } from '@elastic/esql/types';

const ALLOWED_FOLLOW_UP_COMMANDS = new Set(['SORT', 'LIMIT', 'KEEP', 'DROP']);

const isDirectIndexSource = (arg: unknown): arg is ESQLSource =>
  typeof arg === 'object' &&
  arg !== null &&
  'sourceType' in arg &&
  (arg as ESQLSource).sourceType === 'index' &&
  typeof (arg as ESQLSource).name === 'string' &&
  (arg as ESQLSource).name.trim().length > 0;

const hasCommandOptions = (command: ESQLCommand): boolean => {
  const options = (command as ESQLCommand & { options?: unknown[] }).options;
  return Array.isArray(options) && options.length > 0;
};

/**
 * Extracts a comma-separated index pattern when an ES|QL query only reads from an index
 * (`FROM <index>[, <index>...]` optionally followed by `SORT`, `LIMIT`, `KEEP`, or `DROP`).
 * Returns `undefined` for `WHERE`, `STATS`, `EVAL`, `TS`, `METADATA`, subqueries, or parse errors.
 */
export const extractReadOnlyEsqlIndexPattern = (esql: string | undefined): string | undefined => {
  const trimmed = esql?.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    const parsed = Parser.parse(trimmed);
    if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
      return undefined;
    }

    const commands = parsed.root?.commands ?? [];
    if (commands.length === 0) {
      return undefined;
    }

    const [firstCommand, ...restCommands] = commands;
    if (firstCommand.name.toUpperCase() !== 'FROM' || hasCommandOptions(firstCommand)) {
      return undefined;
    }

    const args = Array.isArray(firstCommand.args) ? firstCommand.args : [];
    if (args.length === 0 || !args.every(isDirectIndexSource)) {
      return undefined;
    }

    const allRestAllowed = restCommands.every((command) =>
      ALLOWED_FOLLOW_UP_COMMANDS.has(command.name.toUpperCase())
    );
    if (!allRestAllowed) {
      return undefined;
    }

    const uniqueIndices = Array.from(
      new Set(args.map((source) => source.name.trim()).filter((name) => name.length > 0))
    );
    return uniqueIndices.length > 0 ? uniqueIndices.join(',') : undefined;
  } catch {
    return undefined;
  }
};
