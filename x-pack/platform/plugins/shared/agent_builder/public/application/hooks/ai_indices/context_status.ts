/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ContextStatus = 'on' | 'auto' | 'off';

interface ContextStatusArgs {
  /** AI indices stored on the agent itself (`configuration.ai_indices`). */
  own: string[];
  /** AI indices contributed by the agent's type, which always apply. */
  base: string[];
}

/**
 * Derives how an agent uses the Context Engine.
 *
 * - `on`   — the agent has AI indices of its own.
 * - `auto` — none of its own, but its type contributes some, so it still retrieves.
 * - `off`  — neither, so the agent does not use the Context Engine at all.
 *
 * `base` comes from the internal base-configuration route: type base configurations are resolved
 * per request on the server and are not part of the public agent response.
 */
export const getContextStatus = ({ own, base }: ContextStatusArgs): ContextStatus => {
  if (own.length > 0) {
    return 'on';
  }
  return base.length > 0 ? 'auto' : 'off';
};
