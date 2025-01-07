/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromExpression } from '@kbn/interpreter';
import { filters } from './filters';

const { migrations } = filters();

describe('filters migrations', () => {
  const expression = 'filters group="1" group="3" ungrouped=true';
  const ast = fromExpression(expression);
  it('8.1.0. Should migrate `filters` expression to `kibana | selectFilter`', () => {
    const migrationObj = typeof migrations === 'function' ? migrations() : migrations || {};
    const migratedAst = migrationObj['8.1.0'](ast.chain[0]);
    expect(migratedAst !== null && typeof migratedAst === 'object').toBeTruthy();
    expect(migratedAst.type).toBe('expression');
    expect(Array.isArray(migratedAst.chain)).toBeTruthy();
    expect(migratedAst.chain[0].function === 'kibana').toBeTruthy();
    expect(migratedAst.chain[0].arguments).toEqual({});
    expect(migratedAst.chain[1].function === 'selectFilter').toBeTruthy();
    expect(migratedAst.chain[1].arguments).toEqual(ast.chain[0].arguments);
  });
});
