/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder, type ESQLAstCommand, type ESQLAstItem } from '@kbn/esql-language';
import type { NetworkDirectionProcessor } from '../../../../types/processors';
import { buildIgnoreMissingFilter } from './common';
import { conditionToESQLAst } from '../condition_to_esql';

const DEFAULT_TARGET_FIELD = 'network.direction';

/**
 * Converts a Streamlang NetworkDirectionProcessor into a list of ES|QL AST commands.
 *
 * @param processor - The NetworkDirectionProcessor to convert
 * @returns A list of ES|QL AST commands
 * @example
 * Input:
 * ```
 * {
 *   source_ip: '128.232.110.120',
 *   destination_ip: '192.168.1.1',
 *   internal_networks: ['private'],
 * }
 * ```
 * Output:
 * ```
 * | EVAL network.direction = NETWORK_DIRECTION('128.232.110.120', '192.168.1.1', ['private'])
 */
export const convertNetworkDirectionProcessorToESQL = (
  processor: NetworkDirectionProcessor
): ESQLAstCommand[] => {
  const {
    source_ip,
    destination_ip,
    target_field = DEFAULT_TARGET_FIELD,
    ignore_missing = false,
  } = processor;

  const commands: ESQLAstCommand[] = [];

  const networkDirectionFuncArgs: ESQLAstItem[] = [];
  // Wrap IP fields with TO_IP() to ensure type compatibility
  // ES|QL NETWORK_DIRECTION requires ip type
  networkDirectionFuncArgs.push(
    Builder.expression.func.call('TO_IP', [Builder.expression.column(source_ip)])
  );
  networkDirectionFuncArgs.push(
    Builder.expression.func.call('TO_IP', [Builder.expression.column(destination_ip)])
  );
  const networksArg =
    'internal_networks' in processor
      ? Builder.expression.list.literal({
          values: processor.internal_networks.map((network) =>
            Builder.expression.literal.string(network)
          ),
        })
      : Builder.expression.column(processor.internal_networks_field);
  networkDirectionFuncArgs.push(networksArg);

  const toColumn = Builder.expression.column(target_field);

  const networkDirectionFunc = Builder.expression.func.call('NETWORK_DIRECTION', [
    ...networkDirectionFuncArgs,
  ]);

  const missingFieldFilter = buildIgnoreMissingFilter(ignore_missing, source_ip, destination_ip);
  if (missingFieldFilter) {
    commands.push(missingFieldFilter);
  }

  if ('where' in processor && processor.where && !('always' in processor.where)) {
    const conditionExpression = conditionToESQLAst(processor.where);
    const caseExpression = Builder.expression.func.call('CASE', [
      conditionExpression,
      networkDirectionFunc,
      Builder.expression.literal.nil(),
    ]);
    commands.push(
      Builder.command({
        name: 'eval',
        args: [Builder.expression.func.binary('=', [toColumn, caseExpression])],
      })
    );
  } else {
    commands.push(
      Builder.command({
        name: 'eval',
        args: [Builder.expression.func.binary('=', [toColumn, networkDirectionFunc])],
      })
    );
  }

  return commands;
};
