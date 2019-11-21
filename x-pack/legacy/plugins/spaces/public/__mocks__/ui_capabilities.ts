/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('ui/capabilities', () => ({
  capabilities: {
    get: jest.fn().mockReturnValue({
      navLinks: {},
      management: {},
      catalogue: {},
      spaces: {
        manage: true,
      },
    }),
  },
}));

import { capabilities, UICapabilities } from 'ui/capabilities';

export function setMockCapabilities(mockCapabilities: UICapabilities) {
  ((capabilities.get as unknown) as jest.Mock).mockReturnValue(mockCapabilities);
}
