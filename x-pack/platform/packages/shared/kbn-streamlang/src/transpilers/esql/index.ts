/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/function';
import type { BasicPrettyPrinterOptions } from '@kbn/esql-language';
import type { StreamlangDSL } from '../../../types/streamlang';
import { streamlangDSLSchema } from '../../../types/streamlang';
import { flattenSteps } from '../shared/flatten_steps';
import { convertConditionToESQL, convertStreamlangDSLToESQLCommands } from './conversions';
import type { Condition } from '../../../types/conditions';
import type { PreludeField } from './prelude';
import { generatePrelude } from './prelude';

const DEFAULT_PIPE_TAB = '  ';

export { conditionToESQLAst } from './condition_to_esql';
export {
  generatePrelude,
  generateInsistCommands,
  generateTypedEvalCasts,
  type PreludeField,
  type PreludeOptions,
  type PreludeFieldType,
} from './prelude';

export interface ESQLTranspilationOptions {
  pipeTab: BasicPrettyPrinterOptions['pipeTab'];
  sourceIndex?: string;
  limit?: number;
  /**
   * Prelude fields for draft stream execution.
   * When provided, INSIST_🐔 and typed EVAL casts are prepended to the query.
   */
  preludeFields?: PreludeField[];
}

export interface ESQLTranspilationResult {
  query: string;
  commands: string[];
  /** Prelude query fragment (INSIST_🐔 + type casts) if preludeFields were provided */
  prelude?: string;
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

  // Generate prelude if fields are provided
  let preludeQuery = '';
  if (transpilationOptions.preludeFields && transpilationOptions.preludeFields.length > 0) {
    const preludeResult = generatePrelude({ fields: transpilationOptions.preludeFields });
    preludeQuery = preludeResult.query;
  }

  // Combine prelude with main commands
  const queryParts = [preludeQuery, `  | ${commandsArray.join('\n|')}`].filter(Boolean);

  return {
    query: queryParts.join('\n'),
    commands: commandsArray,
    prelude: preludeQuery || undefined,
  };
};
