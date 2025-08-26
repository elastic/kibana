/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder, BasicPrettyPrinter } from '@kbn/esql-ast';
import { transpile } from '.';
import type { StreamlangDSL } from '../../../types/streamlang';
import type { SetProcessor } from '../../../types/processors';

describe('ESQL - Wrapping OR within NOT', () => {
  it('should wrap NOT with () around multiple ORs', () => {
    // Create a direct ESQL AST structure: NOT(field1 == "value1" OR field2 == "value2")
    const notCondition = Builder.expression.func.unary(
      'NOT',
      Builder.expression.func.binary('or', [
        Builder.expression.func.binary('==', [
          Builder.expression.column('field1'),
          Builder.expression.literal.string('value1'),
        ]),
        Builder.expression.func.binary('==', [
          Builder.expression.column('field2'),
          Builder.expression.literal.string('value2'),
        ]),
      ])
    );

    const evalCommand = Builder.command({
      name: 'eval',
      args: [
        Builder.expression.func.binary('=', [Builder.expression.column('result'), notCondition]),
      ],
    });

    const query = Builder.expression.query([evalCommand]);
    const result = BasicPrettyPrinter.multiline(query);

    // Fails because the result is `EVAL result = NOT field1 == "value1" OR field2 == "value2"`
    expect(result).toEqual(`EVAL result = NOT(field1 == "value1" OR field2 == "value2")`);
  });

  it('where.not.or should wrap correctly in parenthesis', () => {
    const dslWithNotOr: StreamlangDSL = {
      steps: [
        {
          action: 'set',
          to: 'result_field',
          value: 'matched',
          where: {
            not: {
              or: [
                { field: 'status', eq: 'active' },
                { field: 'type', eq: 'premium' },
              ],
            },
          },
        } as SetProcessor,
      ],
    };

    const result = transpile(dslWithNotOr);

    // Fails because the result is `| EVAL result_field = CASE(NOT status == "active" OR type == "premium", "matched")`
    expect(result.query).toEqual(
      `| EVAL result_field = CASE(NOT(status == "active" OR type == "premium"), "matched")`
    );
  });
});
