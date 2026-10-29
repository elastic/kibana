/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, sortBy, uniq } from 'lodash';
import type { ApiTarget } from '../apis';
import { apiTargets } from '../apis';
import type { AgentApprovals } from './definition';

/**
 * Normalizes auto-approval defaults so that "no defaults" has a single representation.
 *
 * @param approvals - Defaults as supplied by a request, a form, or read from storage.
 * @returns The defaults with each backend's selectors deduplicated and sorted and empty backends
 * dropped, or `undefined` when no backend has any selector left.
 */
export const normalizeAgentApprovals = (
  approvals: AgentApprovals | undefined
): AgentApprovals | undefined => {
  const autoApprovedApis = apiTargets.reduce<Partial<Record<ApiTarget, string[]>>>(
    (selectorsByTarget, target) => {
      const selectors = approvals?.auto_approved_apis?.[target] ?? [];
      if (selectors.length > 0) {
        selectorsByTarget[target] = sortBy(uniq(selectors));
      }
      return selectorsByTarget;
    },
    {}
  );
  return Object.keys(autoApprovedApis).length > 0
    ? { auto_approved_apis: autoApprovedApis }
    : undefined;
};

/**
 * Compares two sets of auto-approval defaults after normalization, ignoring order, duplicates,
 * and empty backends.
 */
export const agentApprovalsEqual = (
  value: AgentApprovals | undefined,
  other: AgentApprovals | undefined
): boolean => isEqual(normalizeAgentApprovals(value), normalizeAgentApprovals(other));
