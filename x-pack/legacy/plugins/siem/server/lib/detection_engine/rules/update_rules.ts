/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaults, pickBy, isEmpty } from 'lodash/fp';
import { PartialAlert } from '../../../../../alerting/server/types';
import { readRules } from './read_rules';
import { UpdateRuleParams, IRuleSavedAttributesSavedObjectAttributes } from './types';
import { addTags } from './add_tags';
import { ruleStatusSavedObjectType } from './saved_object_mappings';

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
  immutable: boolean,
  currentVersion: number,
  updateProperties: Partial<Omit<UpdateRuleParams, 'enabled' | 'ruleId'>>
): number => {
  // early return if we are pre-packaged/immutable rule to be safe. We are never responsible
  // for changing the version number of an immutable. Immutables are only responsible for changing
  // their own version number. This would be really bad if an immutable version number is bumped by us
  // due to a bug, hence the extra check and early bail if that is detected.
  if (immutable === true) {
    if (updateProperties.version != null) {
      // we are an immutable rule but we are asking to update the version number so go ahead
      // and update it to what is asked.
      return updateProperties.version;
    } else {
      // we are immutable and not asking to update the version number so return the existing version
      return currentVersion;
    }
  }

  // white list all properties but the enabled/disabled flag. We don't want to auto-increment
  // the version number if only the enabled/disabled flag is being set. Likewise if we get other
  // properties we are not expecting such as updatedAt we do not to cause a version number bump
  // on that either.
  const removedNullValues = pickBy<UpdateRuleParams>(
    (value: unknown) => value != null,
    updateProperties
  );
  if (isEmpty(removedNullValues)) {
    return currentVersion;
  } else {
    return currentVersion + 1;
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
  savedObjectsClient,
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
  threat,
  to,
  type,
  references,
  version,
}: UpdateRuleParams): Promise<PartialAlert | null> => {
  const rule = await readRules({ alertsClient, ruleId, id });
  if (rule == null) {
    return null;
  }

  const calculatedVersion = calculateVersion(rule.params.immutable, rule.params.version, {
    description,
    falsePositives,
    query,
    language,
    outputIndex,
    savedId,
    timelineId,
    timelineTitle,
    meta,
    filters,
    from,
    index,
    interval,
    maxSignals,
    riskScore,
    name,
    severity,
    tags,
    threat,
    to,
    type,
    references,
    version,
  });

  const nextParams = defaults(
    {
      ...rule.params,
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
      threat,
      to,
      type,
      references,
      version: calculatedVersion,
    }
  );

  const update = await alertsClient.update({
    id: rule.id,
    data: {
      tags: addTags(tags ?? rule.tags, rule.params.ruleId, immutable ?? rule.params.immutable),
      name: calculateName({ updatedName: name, originalName: rule.name }),
      schedule: {
        interval: calculateInterval(interval, rule.schedule.interval),
      },
      actions: rule.actions,
      params: nextParams,
    },
  });
  if (rule.enabled && enabled === false) {
    await alertsClient.disable({ id: rule.id });
  } else if (!rule.enabled && enabled === true) {
    await alertsClient.enable({ id: rule.id });
    const ruleCurrentStatus = savedObjectsClient
      ? await savedObjectsClient.find<IRuleSavedAttributesSavedObjectAttributes>({
          type: ruleStatusSavedObjectType,
          perPage: 1,
          sortField: 'statusDate',
          sortOrder: 'desc',
          search: rule.id,
          searchFields: ['alertId'],
        })
      : null;
    // set current status for this rule to be 'going to run'
    if (ruleCurrentStatus && ruleCurrentStatus.saved_objects.length > 0) {
      const currentStatusToDisable = ruleCurrentStatus.saved_objects[0];
      currentStatusToDisable.attributes.status = 'going to run';
      await savedObjectsClient?.update(ruleStatusSavedObjectType, currentStatusToDisable.id, {
        ...currentStatusToDisable.attributes,
      });
    }
  } else {
    // enabled is null or undefined and we do not touch the rule
  }

  if (enabled != null) {
    return { ...update, enabled };
  } else {
    return update;
  }
};
