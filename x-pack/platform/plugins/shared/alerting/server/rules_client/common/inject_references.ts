/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { omit } from 'lodash';
import type { SavedObjectReference, SavedObjectAttributes } from '@kbn/core/server';
import type { UntypedNormalizedRuleType } from '../../rule_type_registry';
import type { RawRule, RuleTypeParams } from '../../types';
import type { RuleDomain } from '../../application/rule/types';
import {
  preconfiguredConnectorActionRefPrefix,
  extractedSavedObjectParamReferenceNamePrefix,
  systemConnectorActionRefPrefix,
} from './constants';

export function injectReferencesIntoActions(
  alertId: string,
  actions: RawRule['actions'],
  references: SavedObjectReference[]
) {
  return actions.map((action) => {
    if (action.actionRef.startsWith(preconfiguredConnectorActionRefPrefix)) {
      return {
        ...omit(action, 'actionRef'),
        id: action.actionRef.replace(preconfiguredConnectorActionRefPrefix, ''),
      };
    }

    if (action.actionRef.startsWith(systemConnectorActionRefPrefix)) {
      return {
        ...omit(action, 'actionRef'),
        id: action.actionRef.replace(systemConnectorActionRefPrefix, ''),
      };
    }

    const reference = references.find((ref) => ref.name === action.actionRef);
    if (!reference) {
      throw new Error(`Action reference "${action.actionRef}" not found in alert id: ${alertId}`);
    }
    return {
      ...omit(action, 'actionRef'),
      id: reference.id,
    };
  });
}

export function injectReferencesIntoParams<
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams
>(
  ruleId: string,
  ruleType: UntypedNormalizedRuleType,
  ruleParams: SavedObjectAttributes | undefined,
  references: SavedObjectReference[]
): Params {
  try {
    const paramReferences = references
      .filter((reference: SavedObjectReference) =>
        reference.name.startsWith(extractedSavedObjectParamReferenceNamePrefix)
      )
      .map((reference: SavedObjectReference) => ({
        ...reference,
        name: reference.name.replace(extractedSavedObjectParamReferenceNamePrefix, ''),
      }));
    return ruleParams && ruleType?.useSavedObjectReferences?.injectReferences
      ? (ruleType.useSavedObjectReferences.injectReferences(
          ruleParams as ExtractedParams,
          paramReferences
        ) as Params)
      : (ruleParams as Params);
  } catch (err) {
    throw Boom.badRequest(
      `Error injecting reference into rule params for rule id ${ruleId} - ${err.message}`
    );
  }
}

export function injectReferencesIntoArtifacts(
  ruleId: string,
  artifacts?: RawRule['artifacts'],
  references?: SavedObjectReference[]
): Required<RuleDomain['artifacts']> {
  if (!artifacts) {
    return { dashboards: [], investigation_guide: { blob: '' } };
  }
  return {
    ...artifacts,
    investigation_guide: {
      blob: artifacts.investigation_guide?.blob ?? '',
    },
    dashboards:
      artifacts.dashboards?.map((dashboard) => {
        const reference = references?.find(
          (ref) => ref.name === dashboard.refId && ref.type === 'dashboard'
        );
        if (!reference) {
          throw new Error(
            `Artifacts reference "${dashboard.refId}" not found in rule id: ${ruleId}`
          );
        }
        return {
          ...omit(dashboard, 'refId'),
          id: reference.id,
        };
      }) ?? [],
  };
}
