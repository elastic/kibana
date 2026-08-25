/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  smlIndexName,
  smlMappingsComponentProperties,
  smlMappingsComponentTemplateName,
  storageSettings,
} from './sml_storage';

describe('smlIndexName', () => {
  it('is the ai-index-idx-sml-data index', () => {
    expect(smlIndexName).toBe('ai-index-idx-sml-data');
  });
});

describe('storageSettings', () => {
  it('composes the base mappings, the user slot, then SML in that order', () => {
    // SML last so a user editing `ai-index@custom` cannot clobber SML's fields.
    expect(storageSettings.composedOf).toEqual([
      'ai-index@mappings',
      'ai-index@custom',
      smlMappingsComponentTemplateName,
    ]);
  });

  it('tolerates only the user slot being absent', () => {
    expect(storageSettings.ignoreMissingComponentTemplates).toEqual(['ai-index@custom']);
  });

  it('installs no properties of its own on the index template', () => {
    expect(storageSettings.inlineSchemaMappings).toBe(false);
  });

  it('outranks the stack ai-index-idx template, which sits at priority 500', () => {
    expect(storageSettings.priority).toBeGreaterThan(500);
  });

  it('keeps the schema covering the whole document, base fields included', () => {
    // The schema drives SmlDocument and the mapping version hash, so it must
    // describe fields that reach the index via the base component too.
    expect(Object.keys(storageSettings.schema.properties)).toEqual(
      expect.arrayContaining(['title', 'content', 'description', 'type', 'references'])
    );
  });

  it('normalizes `type` to lowercase from SML\'s own component, not the base', () => {
    // The base maps `type` as a plain keyword; SML needs it lowercased so the @ menu
    // prefix query is case-insensitive. Like `tags`, it lives in SML's component,
    // which is composed last and therefore wins over the base mapping.
    expect(storageSettings.schema.properties.type).toMatchObject({
      type: 'keyword',
      normalizer: 'lowercase',
    });
    expect(smlMappingsComponentProperties.type).toMatchObject({
      type: 'keyword',
      normalizer: 'lowercase',
    });
  });
});
