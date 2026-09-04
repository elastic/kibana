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

  it('model version 2 accepts the new OOTB rule ids and cross_field kind', () => {
    const createSchema = modelVersions[2].schemas?.create;
    const windowsSid = {
      id: RESOLUTION_RULE_IDS.WINDOWS_SID_BRIDGE,
      kind: RESOLUTION_RULE_KINDS.SAME_FIELD,
      managed: true,
      enabled: true,
    };
    const upn = {
      id: RESOLUTION_RULE_IDS.UPN_CROSS_FIELD_BRIDGE,
      kind: RESOLUTION_RULE_KINDS.CROSS_FIELD,
      managed: true,
      enabled: true,
    };

    expect(createSchema?.validate(windowsSid)).toEqual(windowsSid);
    expect(createSchema?.validate(upn)).toEqual(upn);
  });

  it('latest schema accepts every current rule id', () => {
    const createSchema = modelVersions[2].schemas?.create;
    const latestVersion = Math.max(
      ...Object.keys(EntityResolutionRuleType.modelVersions ?? {}).map(Number)
    );
    const latestCreate = (
      EntityResolutionRuleType.modelVersions as Record<number, TestModelVersion>
    )[latestVersion].schemas?.create;

    expect(latestCreate).toBe(createSchema);

    for (const id of Object.values(RESOLUTION_RULE_IDS)) {
      const kind =
        id === RESOLUTION_RULE_IDS.UPN_CROSS_FIELD_BRIDGE
          ? RESOLUTION_RULE_KINDS.CROSS_FIELD
          : id === RESOLUTION_RULE_IDS.RELATED_USER_ALIAS_RESOLUTION
          ? RESOLUTION_RULE_KINDS.RELATED_USER_ALIAS_RESOLUTION
          : RESOLUTION_RULE_KINDS.SAME_FIELD;
      const attributes = { id, kind, managed: true, enabled: true };
      expect(latestCreate?.validate(attributes)).toEqual(attributes);
    }
  });

  it('ignores unknown forward-compatibility attributes', () => {
    const forwardSchema = modelVersions[1].schemas?.forwardCompatibility;

    expect(forwardSchema?.validate({ ...validAttributes, futureField: 'ignored' })).toEqual(
      validAttributes
    );
  });
});
