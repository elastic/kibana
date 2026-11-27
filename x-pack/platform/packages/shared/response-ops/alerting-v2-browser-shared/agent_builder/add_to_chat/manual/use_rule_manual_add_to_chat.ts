/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { ruleAttachmentConverter } from '../auto/rule_auto_attach';
import {
  useManualAddToChat,
  type ManualAddToChatServices,
  type UseManualAddToChatResult,
} from './use_manual_add_to_chat';

export const useRuleManualAddToChat = (
  rule: RuleResponse | undefined,
  services: ManualAddToChatServices
): UseManualAddToChatResult => useManualAddToChat(rule, ruleAttachmentConverter, services);
