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
  it('should group OR within AND correctly', () => {
    const orCondition = Builder.expression.func.binary('and', [
      Builder.expression.func.binary('==', [
        Builder.expression.column('field1'),
        Builder.expression.literal.string('value1'),
      ]),
      Builder.expression.func.binary('or', [
        Builder.expression.func.binary('==', [
          Builder.expression.column('field2'),
          Builder.expression.literal.string('value2'),
        ]),
        Builder.expression.func.binary('==', [
          Builder.expression.column('field3'),
          Builder.expression.literal.string('value3'),
        ]),
      ]),
    ]);

    const evalCommand = Builder.command({
      name: 'eval',
      args: [
        Builder.expression.func.binary('=', [Builder.expression.column('result'), orCondition]),
      ],
    });

    const query = Builder.expression.query([evalCommand]);
    const result = BasicPrettyPrinter.multiline(query);

    expect(result).toEqual(
      `EVAL result = (field1 == "value1" AND (field2 == "value2" OR field3 == "value3"))`
    );
  });

  it('should wrap NOT with () around multiple ORs', () => {
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

    expect(result).toEqual(`EVAL result = NOT (field1 == "value1" OR field2 == "value2")`);
  });

  it('where.and.or should wrap correctly in parenthesis', () => {
    const dslWithAndOr: StreamlangDSL = {
      steps: [
        {
          action: 'set',
          to: 'result_field',
          value: 'matched',
          where: {
            and: [
              { field: 'status', eq: 'active' },
              {
                or: [
                  { field: 'type', eq: 'premium' },
                  { field: 'category', eq: 'gold' },
                ],
              },
            ],
          },
        } as SetProcessor,
      ],
    };

    const result = transpile(dslWithAndOr);

    expect(result.query).toEqual(
      `  | EVAL result_field = CASE(status == "active" AND (type == "premium" OR category == "gold"), "matched", result_field)`
    );
  });

  it('where.or.and should wrap correctly in parenthesis', () => {
    const dslWithOrAnd: StreamlangDSL = {
      steps: [
        {
          action: 'set',
          to: 'result_field',
          value: 'matched',
          where: {
            or: [
              { field: 'status', eq: 'active' },
              {
                and: [
                  { field: 'type', eq: 'premium' },
                  { field: 'category', eq: 'gold' },
                ],
              },
            ],
          },
        } as SetProcessor,
      ],
    };

    const result = transpile(dslWithOrAnd);

    expect(result.query).toEqual(
      `  | EVAL result_field = CASE(status == "active" OR type == "premium" AND category == "gold", "matched", result_field)`
    );
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

    expect(result.query).toEqual(
      `  | EVAL result_field = CASE(NOT (status == "active" OR type == "premium"), "matched", result_field)`
    );
  });

  it('where.not.and.or should wrap correctly in parenthesis', () => {
    const dslWithNotAndOr: StreamlangDSL = {
      steps: [
        {
          action: 'set',
          to: 'result_field',
          value: 'matched',
          where: {
            not: {
              and: [
                { field: 'status', eq: 'active' },
                {
                  or: [
                    { field: 'type', eq: 'premium' },
                    { field: 'category', eq: 'gold' },
                  ],
                },
              ],
            },
          },
        } as SetProcessor,
      ],
    };

    const result = transpile(dslWithNotAndOr);

    expect(result.query).toEqual(
      `  | EVAL result_field = CASE(NOT (status == "active" AND (type == "premium" OR category == "gold")), "matched", result_field)`
    );
  });
});
