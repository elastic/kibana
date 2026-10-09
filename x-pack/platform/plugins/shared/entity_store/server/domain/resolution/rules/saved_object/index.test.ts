/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RESOLUTION_RULE_IDS, RESOLUTION_RULE_KINDS } from '../../../../../common';
import { EntityResolutionRuleType, EntityResolutionRuleTypeName } from '.';

interface TestSchema {
  validate(input: unknown): unknown;
}

interface TestModelVersion {
  schemas?: {
    create?: TestSchema;
    forwardCompatibility?: TestSchema;
  };
}

describe('EntityResolutionRuleType', () => {
  const modelVersions = EntityResolutionRuleType.modelVersions as Record<number, TestModelVersion>;
  const validAttributes = {
    id: RESOLUTION_RULE_IDS.RELATED_USER_ALIAS_RESOLUTION,
    kind: RESOLUTION_RULE_KINDS.RELATED_USER_ALIAS_RESOLUTION,
    managed: true,
    enabled: false,
  };

  it('registers as a multiple-isolated saved object type with expected mappings', () => {
    expect(EntityResolutionRuleType.name).toBe(EntityResolutionRuleTypeName);
    expect(EntityResolutionRuleType.namespaceType).toBe('multiple-isolated');
    expect(EntityResolutionRuleType.hiddenFromHttpApis).toBe(true);
    expect(EntityResolutionRuleType.mappings).toEqual({
      dynamic: false,
      properties: {},
    });
  });

  it('accepts the minimal managed rule attributes', () => {
    const createSchema = modelVersions[1].schemas?.create;

    expect(createSchema?.validate(validAttributes)).toEqual(validAttributes);
  });

  it('rejects unknown rule ids and kinds', () => {
    const createSchema = modelVersions[1].schemas?.create;

    expect(() => createSchema?.validate({ ...validAttributes, id: 'unknown_rule' })).toThrow();
    expect(() => createSchema?.validate({ ...validAttributes, kind: 'unknown_kind' })).toThrow();
  });

  it('ignores unknown forward-compatibility attributes', () => {
    const forwardSchema = modelVersions[1].schemas?.forwardCompatibility;

    expect(forwardSchema?.validate({ ...validAttributes, futureField: 'ignored' })).toEqual(
      validAttributes
    );
  });
});
