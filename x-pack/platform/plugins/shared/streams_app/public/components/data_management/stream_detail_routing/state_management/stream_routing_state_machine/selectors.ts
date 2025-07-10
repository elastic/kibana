/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import { StreamRoutingContext } from './types';

/**
 * Selects the set of dotted fields that are not supported by the current simulation.
 */
export const selectCurrentRule = createSelector(
  [
    (context: StreamRoutingContext) => context.routing,
    (context: StreamRoutingContext) => context.currentRuleId,
  ],
  (routing, currentRuleId) => {
    const currentRoutingRule = routing.find((rule) => rule.id === currentRuleId);

    if (!currentRoutingRule) {
      throw new Error('Current routing rule not found');
    }

    return currentRoutingRule;
  }
);
