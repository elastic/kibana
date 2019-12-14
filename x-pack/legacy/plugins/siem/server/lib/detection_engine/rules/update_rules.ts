/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaults } from 'lodash/fp';
import { AlertAction } from '../../../../../alerting/server/types';
import { readRules } from './read_rules';
import { UpdateRuleParams } from './types';
import { updateTags } from './update_tags';

export const calculateInterval = (
  interval: string | undefined,
  ruleInterval: string | undefined
): string => {
  if (interval != null) {
    return interval;
  } else if (ruleInterval != null) {
    return ruleInterval;
  } else {
    return '5m';
  }
};

export const calculateName = ({
  updatedName,
  originalName,
}: {
  updatedName: string | undefined;
  originalName: string | undefined;
}): string => {
  if (updatedName != null) {
    return updatedName;
  } else if (originalName != null) {
    return originalName;
  } else {
    // You really should never get to this point. This is a fail safe way to send back
    // the name of "untitled" just in case a rule name became null or undefined at
    // some point since TypeScript allows it.
    return 'untitled';
  }
};

export const updateRules = async ({
  alertsClient,
  actionsClient, // TODO: Use this whenever we add feature support for different action types
  description,
  falsePositives,
  enabled,
  query,
  language,
  outputIndex,
  savedId,
  meta,
  filters,
  from,
  immutable,
  id,
  ruleId,
  index,
  interval,
  maxSignals,
  riskScore,
  name,
  severity,
  tags,
  threats,
  to,
  type,
  references,
}: UpdateRuleParams) => {
  const rule = await readRules({ alertsClient, ruleId, id });
  if (rule == null) {
    return null;
  }

  // TODO: Remove this as cast as soon as rule.actions TypeScript bug is fixed
  // where it is trying to return AlertAction[] or RawAlertAction[]
  const actions = (rule.actions as AlertAction[] | undefined) || [];

  const params = rule.params || {};

  const nextParams = defaults(
    {
      ...params,
    },
    {
      description,
      falsePositives,
      from,
      immutable,
      query,
      language,
      outputIndex,
      savedId,
      meta,
      filters,
      index,
      maxSignals,
      riskScore,
      severity,
      threats,
      to,
      type,
      references,
    }
  );

  if (rule.enabled && enabled === false) {
    await alertsClient.disable({ id: rule.id });
  } else if (!rule.enabled && enabled === true) {
    await alertsClient.enable({ id: rule.id });
  } else {
    // enabled is null or undefined and we do not touch the rule
  }

  return alertsClient.update({
    id: rule.id,
    data: {
      tags: updateTags(rule.tags, tags),
      name: calculateName({ updatedName: name, originalName: rule.name }),
      interval: calculateInterval(interval, rule.interval),
      actions,
      params: nextParams,
    },
  });
};
