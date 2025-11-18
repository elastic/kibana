/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import type { ActionContextVariables, SummaryActionContextVariables } from '@kbn/alerting-types';
import type { AADAlert } from '@kbn/alerts-as-data-utils';
import type { RuleActionParams, RuleTypeParams } from '../types';
import type { ActionSchedulerRule } from './action_scheduler/types';

export interface TransformActionParamsOptions {
  actionsPlugin: ActionsPluginStartContract;
  actionTypeId: string;
  spaceId: string;
  tags?: string[];
  actionId: string;
  actionParams: RuleActionParams;
  aadAlert?: AADAlert;
}

interface SummarizedAlertsWithAll {
  new: {
    count: number;
    data: unknown[];
  };
  recovered: {
    count: number;
    data: unknown[];
  };
  all: {
    count: number;
    data: unknown[];
  };
}

export function transformActionParams({
  actionsPlugin,
  actionTypeId,
  actionId,
  spaceId,
  tags,
  actionParams,
  aadAlert,
}: TransformActionParamsOptions): RuleActionParams {
  // when the list of variables we pass in here changes,
  // the UI will need to be updated as well; see:
  // x-pack/platform/plugins/shared/triggers_actions_ui/public/application/lib/action_variables.ts

  const variables: ActionContextVariables = {
    tags,
    spaceId,
    date: new Date().toISOString(),
    rule: {
      id: aadAlert['rule.id'],
      parentId: aadAlert['rule.parent_id'],
    },
    status: aadAlert.status,
  };

  const variablesWithAADFields: Record<string, unknown> = {
    ...(aadAlert ? { ...aadAlert } : {}),
    // we do not want the AAD fields to overwrite the base fields
    ...variables,
  };

  return actionsPlugin.renderActionParameterTemplates(
    actionTypeId,
    actionId,
    actionParams,
    variablesWithAADFields
  );
}

export function transformSummaryActionParams({
  alerts,
  rule,
  actionsPlugin,
  actionId,
  actionTypeId,
  spaceId,
  actionParams,
}: {
  alerts: SummarizedAlertsWithAll;
  rule: ActionSchedulerRule<RuleTypeParams>;
  actionsPlugin: ActionsPluginStartContract;
  actionId: string;
  actionTypeId: string;
  spaceId: string;
  actionParams: RuleActionParams;
}): RuleActionParams {
  // when the list of variables we pass in here changes,
  // the UI will need to be updated as well; see:
  // x-pack/platform/plugins/shared/triggers_actions_ui/public/application/lib/action_variables.ts

  const variables: SummaryActionContextVariables = {
    spaceId,
    tags: rule.tags,
    date: new Date().toISOString(),
    alerts,
  };

  return actionsPlugin.renderActionParameterTemplates(actionTypeId, actionId, actionParams, {
    ...variables,
  });
}
