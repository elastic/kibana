/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_MEMORY_API_PRIVILEGES, AGENT_MEMORY_FEATURE_ID, registerFeatures } from './features';

describe('registerFeatures', () => {
  it('registers an API-only Agent Memory feature', () => {
    const registerKibanaFeature = jest.fn();

    registerFeatures({ features: { registerKibanaFeature } as never });

    const feature = registerKibanaFeature.mock.calls[0][0];
    expect(feature).toEqual(
      expect.objectContaining({
        id: AGENT_MEMORY_FEATURE_ID,
        name: 'Agent Memory',
        app: [],
        catalogue: [],
      })
    );
    expect(feature).not.toHaveProperty('management');

    expect(feature.privileges.all).toEqual(
      expect.objectContaining({
        app: [],
        api: [AGENT_MEMORY_API_PRIVILEGES.read, AGENT_MEMORY_API_PRIVILEGES.write],
        catalogue: [],
        savedObject: { all: [], read: [] },
        ui: [],
      })
    );
    expect(feature.privileges.all).not.toHaveProperty('management');

    expect(feature.privileges.read).toEqual(
      expect.objectContaining({
        app: [],
        api: [AGENT_MEMORY_API_PRIVILEGES.read],
        catalogue: [],
        savedObject: { all: [], read: [] },
        ui: [],
      })
    );
    expect(feature.privileges.read).not.toHaveProperty('management');
  });
});
