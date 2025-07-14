/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  RuleTagBadgeProps,
  RuleTagBadgeOptions,
} from '../application/sections/rules_list/components/rule_tag_badge';
import { RuleTagBadge } from '../application/sections';
export const getRuleTagBadgeLazy = <T extends RuleTagBadgeOptions = 'default'>(
  props: RuleTagBadgeProps<T>
) => {
  return <RuleTagBadge {...props} />;
};
