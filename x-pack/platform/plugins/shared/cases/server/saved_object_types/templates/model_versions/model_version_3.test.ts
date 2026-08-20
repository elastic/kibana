/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { modelVersion3, templateSchemaV3 } from './model_version_3';
import { MAX_TEMPLATE_DEFINITION_LENGTH } from '../../../../common/constants';

const baseAttributes = {
  templateId: 'template-1',
  name: 'Template',
  owner: 'securitySolution',
  definition: '',
  templateVersion: 1,
  deletedAt: null,
};

describe('templates model version 3', () => {
  it('registers a mappings_addition change for legacyKey', () => {
    expect(modelVersion3.changes.map((change) => change.type)).toEqual(['mappings_addition']);
    expect(modelVersion3.changes[0]).toEqual({
      type: 'mappings_addition',
      addedMappings: { legacyKey: { type: 'keyword', ignore_above: 1024 } },
    });
  });

  it('accepts an optional legacyKey', () => {
    expect(() =>
      templateSchemaV3.validate({ ...baseAttributes, legacyKey: 'v1-template-key' })
    ).not.toThrow();
  });

  it('accepts documents without a legacyKey (templates created directly in v2)', () => {
    expect(() => templateSchemaV3.validate(baseAttributes)).not.toThrow();
  });

  it('accepts a definition at the maximum length', () => {
    expect(() =>
      templateSchemaV3.validate({
        ...baseAttributes,
        definition: 'a'.repeat(MAX_TEMPLATE_DEFINITION_LENGTH),
      })
    ).not.toThrow();
  });

  it('rejects a definition longer than the maximum length', () => {
    const overlongDefinitionLength = MAX_TEMPLATE_DEFINITION_LENGTH + 1;

    expect(() =>
      templateSchemaV3.validate({
        ...baseAttributes,
        definition: 'a'.repeat(overlongDefinitionLength),
      })
    ).toThrow(
      `[definition]: value has length [${overlongDefinitionLength}] but it must have a maximum length of [${MAX_TEMPLATE_DEFINITION_LENGTH}].`
    );
  });

  it('forwardCompatibility ignores unknown attributes written by newer nodes', () => {
    const forwardCompatible = templateSchemaV3.extends({}, { unknowns: 'ignore' });
    expect(() =>
      forwardCompatible.validate({ ...baseAttributes, someFutureField: true })
    ).not.toThrow();
  });
});
