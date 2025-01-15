/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { RuleSnoozeModal } from '../application/sections';
import { RuleSnoozeModalProps } from '../application/sections/rules_list/components/rule_snooze_modal';

export const getRuleSnoozeModalLazy = (props: RuleSnoozeModalProps) => {
  return <RuleSnoozeModal {...props} />;
};
