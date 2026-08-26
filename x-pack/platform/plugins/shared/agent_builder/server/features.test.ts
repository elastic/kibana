/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { registerFeatures } from './features';

describe('registerFeatures', () => {
  it('grants read access to Agent Memory AI index content', () => {
    const features = featuresPluginMock.createSetup();

    registerFeatures({ features });

    const feature = features.registerKibanaFeature.mock.calls[0][0];
    expect(feature.privileges).toMatchObject({
      all: { aiIndex: { read: ['agent_memory'] } },
      read: { aiIndex: { read: ['agent_memory'] } },
    });
  });
});
