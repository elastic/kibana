/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PartialAlert } from '../../../../../alerting/server/types';
import { readRules } from './read_rules';
import { IRuleSavedAttributesSavedObjectAttributes, UpdateRuleParams } from './types';
import { addTags } from './add_tags';
import { ruleStatusSavedObjectType } from './saved_object_mappings';
import { calculateVersion } from './utils';

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

  const update = await alertsClient.update({
    id: rule.id,
    data: {
      tags: addTags(tags, rule.params.ruleId, immutable),
      name,
      schedule: { interval },
      actions: rule.actions,
      params: {
        description,
        ruleId: rule.params.ruleId,
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
      },
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
  }

  return { ...update, enabled };
};
