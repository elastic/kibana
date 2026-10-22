/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceAccountDisplayNameResolver } from '@kbn/agent-builder-browser';

const resolvers: ServiceAccountDisplayNameResolver[] = [];

/** Registers a display name for service account chat authors. Later registrations are tried first. */
export const registerServiceAccountDisplayName = (
  resolver: ServiceAccountDisplayNameResolver
): void => {
  resolvers.unshift(resolver);
};

/** The first registered resolver that recognizes the principal, if any. */
export const resolveServiceAccountDisplayName = (
  principal: Parameters<ServiceAccountDisplayNameResolver>[0]
): string | undefined => {
  for (const resolver of resolvers) {
    const name = resolver(principal);
    if (name) return name;
  }
  return undefined;
};

/** Drops every resolver. Tests use this so one file cannot leak into the next. */
export const clearServiceAccountDisplayNameResolvers = (): void => {
  resolvers.length = 0;
};
