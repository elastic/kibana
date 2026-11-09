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

/** The pills loaded so far, and how many remain. */
export interface PagedImpactPills {
  pills: readonly ImpactPill[];
  total: number;
  remaining: number;
  /** False once the server cannot be asked for more, even if `remaining` is above zero. */
  canShowMore: boolean;
  /** The most pills the server lists. */
  reachLimit: number;
  /** A request failed: the loaded pills stay, and no way to ask for more is offered. */
  loadFailed: boolean;
  isLoadingMore: boolean;
  showMore: () => void;
  /** Present once more than the first page has loaded. */
  showFewer?: () => void;
}
