/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The decider fields a display-name resolver may read. The stored username stays the principal. */
export interface ProposalActorRef {
  username: string | null;
}

/**
 * Returns a display name for this decider, or `undefined` when the resolver does not recognize
 * them. `getProposalDecision` then keeps `fullName`, then the username.
 */
export type ProposalActorDisplayNameResolver = (actor: ProposalActorRef) => string | undefined;

const resolvers: ProposalActorDisplayNameResolver[] = [];

/** Registers a display name used when a proposal decider has no full name. */
export const registerProposalActorDisplayName = (
  resolver: ProposalActorDisplayNameResolver
): void => {
  resolvers.unshift(resolver);
};

/** The first registered resolver that recognizes the decider, if any. */
export const resolveProposalActorDisplayName = (
  actor: ProposalActorRef | undefined
): string | undefined => {
  if (!actor) return undefined;
  for (const resolver of resolvers) {
    const name = resolver(actor);
    if (name) return name;
  }
  return undefined;
};

/** Drops every resolver. Tests use this so one file cannot leak into the next. */
export const clearProposalActorDisplayNameResolvers = (): void => {
  resolvers.length = 0;
};
