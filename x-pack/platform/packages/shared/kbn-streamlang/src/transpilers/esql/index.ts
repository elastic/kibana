/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/function';
import type { BasicPrettyPrinterOptions } from '@kbn/esql-ast';
import type { StreamlangDSL } from '../../../types/streamlang';
import { streamlangDSLSchema } from '../../../types/streamlang';
import { flattenSteps } from '../shared/flatten_steps';
import { convertConditionToESQL, convertStreamlangDSLToESQLCommands } from './conversions';
import type { Condition } from '../../../types/conditions';

const DEFAULT_PIPE_TAB = '  ';

export interface ESQLTranspilationOptions {
  pipeTab: BasicPrettyPrinterOptions['pipeTab'];
  sourceIndex?: string;
  limit?: number;
}

export interface ESQLTranspilationResult {
  query: string;
  commands: string[];
}

export const conditionToESQL = (condition: Condition): string => {
  return convertConditionToESQL(condition);
};

export const transpile = (
  streamlang: StreamlangDSL,
  transpilationOptions: ESQLTranspilationOptions = { pipeTab: DEFAULT_PIPE_TAB }
): ESQLTranspilationResult => {
  const validatedStreamlang = streamlangDSLSchema.parse(streamlang);

  const esqlCommandsFromStreamlang = pipe(flattenSteps(validatedStreamlang.steps), (steps) =>
    convertStreamlangDSLToESQLCommands(steps, transpilationOptions)
  );

  const commandsArray = [esqlCommandsFromStreamlang].filter(Boolean);

  return {
    query: `  | ${commandsArray.join('\n|')}`,
    commands: commandsArray,
  };
};
