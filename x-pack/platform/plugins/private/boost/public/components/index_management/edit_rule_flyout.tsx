/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getDefaultRuleType } from '../../../common/presets';
import type { BoostRule } from '../../../common/types';
import { ProjectDefaultFlyout } from '../project_defaults/project_default_flyout';
import { RuleFlyout } from '../rules/rule_flyout';

interface EditRuleFlyoutProps {
  rule: BoostRule;
  onClose: () => void;
}

/** Edits a rule, or a default rule as its project default, as the boost app does. */
export const EditRuleFlyout = ({ rule, onClose }: EditRuleFlyoutProps) => {
  const defaultType = rule.is_builtin ? getDefaultRuleType(rule.name) : undefined;
  return defaultType ? (
    <ProjectDefaultFlyout type={defaultType} onClose={onClose} />
  ) : (
    <RuleFlyout rule={rule} onClose={onClose} />
  );
};
