/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder, type ESQLAstCommand } from '@kbn/esql-language';
import type { Condition } from '../../../../types/conditions';
import type { DropDocumentProcessor } from '../../../../types/processors';
import { conditionToESQLAst } from '../condition_to_esql';

export const convertDropDocumentProcessorToESQL = (
  processor: DropDocumentProcessor
): ESQLAstCommand[] => {
  const { where } = processor;
  const whereCondition = conditionToESQLAst(where as Condition);
  return [
    Builder.command({
      name: 'WHERE',
      args: [Builder.expression.func.unary('NOT', whereCondition)],
    }),
  ];
};
