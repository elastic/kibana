/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const queryKeys = {
  applicationConnections: {
    all: ['applicationConnections'] as const,
    clients: {
      all: ['applicationConnections', 'clients', 'list'] as const,
      byId: (clientId: string) => ['applicationConnections', 'clients', clientId] as const,
    },
    connections: {
      all: ['applicationConnections', 'connections', 'list'] as const,
      byClient: (clientId: string) =>
        ['applicationConnections', 'connections', { clientId }] as const,
    },
  },
};
