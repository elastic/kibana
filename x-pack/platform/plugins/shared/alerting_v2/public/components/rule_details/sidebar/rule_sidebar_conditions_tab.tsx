/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHorizontalRule } from '@elastic/eui';
import type { RuleApiResponse } from '../../../services/rules_api';
import { RuleConditions } from './rule_conditions';
import { RuleMetadata } from './rule_metadata';

export interface RuleSidebarConditionsTabProps {
  rule: RuleApiResponse;
}

export const RuleSidebarConditionsTab: React.FC<RuleSidebarConditionsTabProps> = ({ rule }) => {
  return (
    <>
      <RuleConditions rule={rule} />
      <EuiHorizontalRule margin="l" />
      <RuleMetadata rule={rule} />
    </>
  );
};
