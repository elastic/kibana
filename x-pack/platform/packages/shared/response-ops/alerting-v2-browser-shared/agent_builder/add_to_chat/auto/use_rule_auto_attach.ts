/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { ruleAttachmentConverter } from './rule_auto_attach';
import { useAutoAttach, type AutoAttachServices } from './use_auto_attach';

export const useRuleAutoAttach = (
  rule: RuleResponse | undefined,
  services: AutoAttachServices
): void => {
  useAutoAttach(rule, ruleAttachmentConverter, services);
};
