/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useService, CoreStart } from '@kbn/core-di-browser';
import { canAccessTriggersActionsRules } from '@kbn/rule-data-utils';
import { UserCapabilities } from '../../services/user_capabilities';

export type RuleLibraryEngine = 'v1' | 'v2';

export interface RuleLibraryAccess {
  canAccessV1: boolean;
  canAccessV2: boolean;
}

/**
 * v2 access is `alerting_v2_rules` read. v1 access is the classic Rules
 * management capability the rules list uses for its V1 tab.
 */
export const useRuleLibraryAccess = (): RuleLibraryAccess => {
  const userCapabilities = useService(UserCapabilities);
  const application = useService(CoreStart('application'));

  return {
    canAccessV1: canAccessTriggersActionsRules(application.capabilities),
    canAccessV2: userCapabilities.canRead('rules'),
  };
};

/**
 * V2 when the user can read it, otherwise V1.
 * Returns null when the user can read neither library. Callers check access before rendering a list.
 */
export const getDefaultRuleLibraryEngine = ({
  canAccessV1,
  canAccessV2,
}: RuleLibraryAccess): RuleLibraryEngine | null => {
  if (canAccessV2) {
    return 'v2';
  }
  if (canAccessV1) {
    return 'v1';
  }
  return null;
};
