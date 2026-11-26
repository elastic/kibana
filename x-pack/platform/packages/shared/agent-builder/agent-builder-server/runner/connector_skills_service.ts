/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Runtime service to resolve connector-contributed skill IDs during agent execution.
 */
export interface ConnectorSkillsService {
  /**
   * Given an agent's connector IDs, returns the IDs of the built-in skills contributed by the
   * types of those connectors. Connectors that are not found, or whose type has no skills, are
   * silently ignored.
   */
  resolveSkillIds(connectorIds: string[]): Promise<string[]>;
}
