/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PreviewRuleData } from '../../../../../../application/rule/methods/preview';
import type {
  PreviewRuleActionV1,
  PreviewRuleRequestBodyV1,
} from '../../../../../../../common/routes/rule/apis/preview';
import type { RuleParams, ActionRequest } from '../../../../../../application/rule/types';

const transformPreviewBodyActions = (actions: PreviewRuleActionV1[]): ActionRequest[] => {
  if (!actions) {
    return [];
  }

  return actions.map(({ group, id, params, uuid, frequency }) => {
    return {
      group: group ?? 'default',
      id,
      params,
      frequency,
      ...(uuid ? { uuid } : {}),
    };
  });
};

export const transformPreviewBody = <Params extends RuleParams = never>(
  previewBody: PreviewRuleRequestBodyV1<Params>
): PreviewRuleData<Params> => {
  return {
    name: previewBody.name,
    alertTypeId: previewBody.rule_type_id,
    consumer: previewBody.consumer,
    schedule: previewBody.schedule,
    tags: previewBody.tags,
    params: previewBody.params,
    actions: transformPreviewBodyActions(previewBody.actions),
  };
};
