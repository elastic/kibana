/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Whether proposals decided on cases (the pending decisions counter, the Needs decision filter)
 * are on. Cases doesn't own the setting that turns them on, so the plugin that adds the decisions
 * provides the answer; off until it does.
 */

class DecisionsAvailability {
  private getter: () => boolean = () => false;

  setEnabled(getter: () => boolean): void {
    this.getter = getter;
  }

  isEnabled(): boolean {
    try {
      return this.getter();
    } catch {
      return false;
    }
  }
}

export const decisionsAvailability = new DecisionsAvailability();
