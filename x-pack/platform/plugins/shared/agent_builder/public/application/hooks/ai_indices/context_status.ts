/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ContextStatus = 'on' | 'auto' | 'off';

interface ContextStatusArgs {
  /** AI indices assigned to the agent itself. Editable: they can be added and removed here. */
  assigned: string[];
  /**
   * AI indices inherited from the agent's type, which always apply on top of the assigned ones.
   * Fixed: they cannot be removed from the agent, which is why they render disabled.
   */
  inherited: string[];
}

/**
 * Derives how an agent uses the Context Engine.
 *
 * - `on`   — the agent has AI indices assigned to it.
 * - `auto` — none assigned, but it inherits some from its type, so it still retrieves.
 * - `off`  — neither, so the agent does not use the Context Engine at all.
 *
 * Inherited indices come from the internal base-configuration route: an agent type's base
 * configuration is resolved per request on the server and is not part of the public agent response.
 */
export const getContextStatus = ({ assigned, inherited }: ContextStatusArgs): ContextStatus => {
  if (assigned.length > 0) {
    return 'on';
  }
  return inherited.length > 0 ? 'auto' : 'off';
};
