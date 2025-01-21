/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleAction, RuleSystemAction } from '@kbn/alerting-types';
import { asSavedObjectExecutionSource } from '@kbn/actions-plugin/server';
import { TaskPriority } from '@kbn/task-manager-plugin/server';
import { RULE_SAVED_OBJECT_TYPE } from '../../..';

interface FormatActionToEnqueueOpts {
  action: RuleAction | RuleSystemAction;
  apiKeyId?: string;
  apiKey: string | null;
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
