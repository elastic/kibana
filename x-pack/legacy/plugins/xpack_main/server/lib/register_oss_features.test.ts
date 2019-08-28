/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FeatureRegistry } from './feature_registry';
import { registerOssFeatures } from './register_oss_features';

describe('registerOssFeatures', () => {
  it('registers features including timelion', () => {
    const registry = new FeatureRegistry();
    const savedObjectTypes = ['foo', 'bar'];
    registerOssFeatures(feature => registry.register(feature), savedObjectTypes, true);

    const features = registry.getAll();
    expect(features.map(f => f.id)).toMatchInlineSnapshot(`
Array [
  "discover",
  "visualize",
  "dashboard",
  "dev_tools",
  "advancedSettings",
  "indexPatterns",
  "savedObjectsManagement",
  "timelion",
]
`);
  });

  it('registers features excluding timelion', () => {
    const registry = new FeatureRegistry();
    const savedObjectTypes = ['foo', 'bar'];
    registerOssFeatures(feature => registry.register(feature), savedObjectTypes, false);

    const features = registry.getAll();
    expect(features.map(f => f.id)).toMatchInlineSnapshot(`
Array [
  "discover",
  "visualize",
  "dashboard",
  "dev_tools",
  "advancedSettings",
  "indexPatterns",
  "savedObjectsManagement",
]
`);
  });
});
