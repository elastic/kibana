/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ImpactPill {
  entityId: string;
  /** Queue rows whose conversation carries this entity. */
  count: number;
  /** Entity type (`host`, `user`, …) when any row reported one for this id. */
  entityType?: string;
  /**
   * Display name: Entity Store `entity.name` when the store has one, otherwise the name stored
   * on the impact.
   */
  name?: string;
}
