/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleAction, RuleSystemAction } from '@kbn/alerting-types';
import { asSavedObjectExecutionSource } from '@kbn/actions-plugin/server';
import type { TaskPriority } from '@kbn/task-manager-plugin/server';
import { RULE_SAVED_OBJECT_TYPE } from '../../..';

interface FormatActionToEnqueueOpts {
  action: RuleAction | RuleSystemAction;
  apiKeyId?: string;
  /**
   * Resolved credential to enqueue for this connector action. Either the
   * base64-encoded ES API key (`id:secret`) or the raw `essu_…` UIAM secret;
   * see `getFakeKibanaRequest` in `rule_loader.ts` (`effectiveApiKey`).
   */
  apiKey: string | null;
  /**
   * True when `apiKey` is an external (user-created Cloud) UIAM credential. The
   * actions plugin persists it on the action task params and uses it to mark the
   * connector execution fake request so the Elasticsearch cluster client does not
   * attach the UIAM shared secret, which UIAM rejects for external keys.
   */
  uiamApiKeyExternal?: boolean | null;
  executionId: string;
  priority?: TaskPriority;
  ruleConsumer: string;
  ruleId: string;
  ruleTypeId: string;
  spaceId: string;
}

export const formatActionToEnqueue = (opts: FormatActionToEnqueueOpts) => {
  const {
    action,
    apiKey,
    apiKeyId,
    uiamApiKeyExternal,
    executionId,
    priority,
    ruleConsumer,
    ruleId,
    ruleTypeId,
    spaceId,
  } = opts;

  const namespace = spaceId === 'default' ? {} : { namespace: spaceId };
  return {
    id: action.id,
    uuid: action.uuid,
    params: action.params,
    spaceId,
    apiKey: apiKey ?? null,
    apiKeyId,
    // Only persisted when true: absent means internal-key treatment (fail closed).
    ...(uiamApiKeyExternal ? { uiamApiKeyExternal: true } : {}),
    consumer: ruleConsumer,
    source: asSavedObjectExecutionSource({
      id: ruleId,
      type: RULE_SAVED_OBJECT_TYPE,
    }),
    executionId,
    relatedSavedObjects: [
      {
        id: ruleId,
        type: RULE_SAVED_OBJECT_TYPE,
        namespace: namespace.namespace,
        typeId: ruleTypeId,
      },
    ],
    actionTypeId: action.actionTypeId,
    priority,
  };
};
