/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsBulkCreateObject } from '@kbn/core/server';
import type { AdHocRun, AdHocRunSO } from '../../../data/ad_hoc_run/types';
import { createBackfillError } from '../../../backfill_client/lib';
import type { ScheduleBackfillResult } from '../methods/schedule/types';
import { transformRawActionsToDomainActions } from '../../rule/transforms';

interface TransformAdHocRunToBackfillResultOpts {
  adHocRunSO: SavedObject<AdHocRunSO>;
  isSystemAction: (connectorId: string) => boolean;
  originalSO?: SavedObjectsBulkCreateObject<AdHocRunSO>;
  omitGeneratedActionValues?: boolean;
}

export const transformAdHocRunToBackfillResult = ({
  adHocRunSO,
  isSystemAction,
  originalSO,
  omitGeneratedActionValues = true,
}: TransformAdHocRunToBackfillResultOpts): ScheduleBackfillResult => {
  const { id, attributes, references, error } = adHocRunSO;
  const ruleId = references?.[0]?.id ?? originalSO?.references?.[0]?.id ?? 'unknown';
  const ruleName = attributes?.rule?.name ?? originalSO?.attributes?.rule.name;
  if (error) {
    // get rule info from original SO if available since SO create errors don't return this
    return createBackfillError(error.message, ruleId, ruleName);
  }

  if (!id) {
    return createBackfillError(
      'Malformed saved object in bulkCreate response - Missing "id".',
      ruleId,
      ruleName
    );
  }

  if (!attributes) {
    return createBackfillError(
      'Malformed saved object in bulkCreate response - Missing "attributes".',
      ruleId,
      ruleName
    );
  }

  if (!references || !references.length) {
    return createBackfillError(
      'Malformed saved object in bulkCreate response - Missing "references".',
      ruleId,
      ruleName
    );
  }

  return {
    id,
    // exclude API key information
    createdAt: attributes.createdAt,
    duration: attributes.duration,
    enabled: attributes.enabled,
    ...(attributes.end ? { end: attributes.end } : {}),
    rule: {
      ...attributes.rule,
      id: references[0].id,
      actions: transformRawActionsToDomainActions({
        ruleId: id,
        actions: attributes.rule.actions,
        references,
        isSystemAction,
        omitGeneratedValues: omitGeneratedActionValues,
      }),
    },
    spaceId: attributes.spaceId,
    start: attributes.start,
    status: attributes.status,
    schedule: attributes.schedule,
  };
};

// includes API key information
export const transformAdHocRunToAdHocRunData = ({
  adHocRunSO,
  isSystemAction,
  originalSO,
  omitGeneratedActionValues = true,
}: TransformAdHocRunToBackfillResultOpts): AdHocRun => {
  const result = transformAdHocRunToBackfillResult({
    adHocRunSO,
    isSystemAction,
    originalSO,
    omitGeneratedActionValues,
  });

  return {
    ...result,
    apiKeyId: adHocRunSO.attributes.apiKeyId,
    apiKeyToUse: adHocRunSO.attributes.apiKeyToUse,
  } as AdHocRun;
};
