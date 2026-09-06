/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { actionPolicyAttachmentConverter } from './action_policy_auto_attach';
import { useAutoAddToChat } from './use_auto_add_to_chat';

export const useActionPolicyAutoAttach = (policy: ActionPolicyResponse | undefined): void => {
  useAutoAddToChat(policy, actionPolicyAttachmentConverter);
};
