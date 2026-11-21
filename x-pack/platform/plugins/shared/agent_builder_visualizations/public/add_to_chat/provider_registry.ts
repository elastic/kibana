/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AddToChatProvider, AddToChatProviderRegistry } from './types';

export const createAddToChatProviderRegistry = (): AddToChatProviderRegistry => {
  const providers: AddToChatProvider[] = [];
  return {
    register: (provider) => {
      if (providers.some(({ id }) => id === provider.id)) {
        throw new Error(`An "Add to chat" provider with id "${provider.id}" is already registered`);
      }
      providers.push(provider);
    },
    getAll: () => providers,
  };
};
