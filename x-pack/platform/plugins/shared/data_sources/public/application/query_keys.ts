/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const queryKeys = {
  dataSources: {
    all: ['dataSources'] as const,
    list: () => ['dataSources', 'list'] as const,
    byId: (id: string) => ['dataSources', 'detail', id] as const,
  },
  connectorTypes: {
    all: ['connectorTypes'] as const,
    list: () => ['connectorTypes', 'list'] as const,
    byId: (id: string) => ['connectorTypes', 'detail', id] as const,
  },
  stackConnectors: {
    all: ['stackConnectors'] as const,
    byId: (id: string) => ['stackConnectors', 'detail', id] as const,
  },
};
