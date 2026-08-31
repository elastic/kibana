/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleApiResponse } from '../services/rules_api';
import { ruleAttachmentConverter } from './rule_auto_attach';
import { useAutoAttach } from './use_auto_attach';

export const useRuleAutoAttach = (rule: RuleApiResponse | undefined): void => {
  useAutoAttach(rule, ruleAttachmentConverter);
};
