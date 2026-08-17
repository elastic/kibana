/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { smlIndexName, storageSettings } from './sml_storage';

describe('smlIndexName', () => {
  it('is the ai-index-idx-sml-data index', () => {
    expect(smlIndexName).toBe('ai-index-idx-sml-data');
  });
});

describe('storageSettings', () => {
  it('leaves `type` without a normalizer so mapping updates stay additive', () => {
    // `normalizer` is not an updateable mapping parameter, and the storage adapter
    // reconciles schema drift with an in-place `putMapping`. Adding one here would
    // break indexing into any index created beforehand. Case-insensitive matching
    // comes from the registry rejecting non-lowercase type ids plus the query
    // lowercasing the typed text.
    expect(storageSettings.schema.properties.type).not.toHaveProperty('normalizer');
  });
});
