/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { exportRulesSchema } from './export_rules_schema';
import { ExportRulesRequestRest } from '../../rules/types';

describe('create rules schema', () => {
  test('null value or absent values validate', () => {
    expect(exportRulesSchema.validate(null).error).toBeFalsy();
  });

  test('empty object does not validate', () => {
    expect(exportRulesSchema.validate<Partial<ExportRulesRequestRest>>({}).error).toBeTruthy();
  });

  test('empty object array does validate', () => {
    expect(
      exportRulesSchema.validate<Partial<ExportRulesRequestRest>>({ objects: [] }).error
    ).toBeTruthy();
  });

  test('array with rule_id validates', () => {
    expect(
      exportRulesSchema.validate<Partial<ExportRulesRequestRest>>({
        objects: [{ rule_id: 'test-1' }],
      }).error
    ).toBeFalsy();
  });

  test('array with id does not validate as we do not allow that on purpose since we export rule_id', () => {
    expect(
      exportRulesSchema.validate({
        objects: [{ id: 'test-1' }],
      }).error
    ).toBeTruthy();
  });
});
