/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaults } from 'lodash/fp';
import { AlertAction, IntervalSchedule } from '../../../../../alerting/server/types';
import { readRules } from './read_rules';
import { UpdateRuleParams } from './types';
import { addTags } from './add_tags';

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

export const calculateVersion = (
  prevVersion: number | null | undefined,
  nextVersion: number | null | undefined
) => {
  if (nextVersion == null) {
    if (prevVersion != null) {
      return prevVersion + 1;
    } else {
      // really should never hit this code but to just be
      // safe let us always check the prev version and if
      // its null or undefined return a 1
      return 1;
    }
  } else {
    // The user wants to custom update their version number which
    // means this could be in the past. Up to the user if they want
    // to do this
    return nextVersion;
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
  timelineId,
  timelineTitle,
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
  version,
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
      timelineId,
      timelineTitle,
      meta,
      filters,
      index,
      maxSignals,
      riskScore,
      severity,
      threats,
      to,
      type,
      updatedAt: new Date().toISOString(),
      references,
      version: calculateVersion(rule.params.version, version),
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
      tags: addTags(
        tags,
        rule.params.ruleId,
        immutable != null ? immutable : rule.params.immutable // Add new one if it exists, otherwise re-use old one
      ),
      name: calculateName({ updatedName: name, originalName: rule.name }),
      schedule: {
        interval: calculateInterval(
          interval,
          // TODO: we assume the schedule is an interval schedule due to a problem
          // in the Alerting api, which should be addressed by the following
          // issue: https://github.com/elastic/kibana/issues/49703
          // Once this issue is closed, the type should be correctly returned by alerting
          (rule.schedule as IntervalSchedule).interval
        ),
      },
      actions,
      params: nextParams,
    },
  });
};
