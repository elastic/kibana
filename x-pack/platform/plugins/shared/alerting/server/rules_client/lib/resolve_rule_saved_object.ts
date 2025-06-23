/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsResolveResponse } from '@kbn/core/server';
import { withActiveSpan } from '@kbn/tracing';
import { ATTR_SPAN_TYPE } from '@kbn/opentelemetry-attributes';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import type { RulesClientContext } from '../types';
import { resolveRuleSo } from '../../data/rule';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import type { RawRule } from '../../types';

interface ResolveRuleSavedObjectParams {
  ruleId: string;
}

export async function resolveRuleSavedObject(
  context: RulesClientContext,
  params: ResolveRuleSavedObjectParams
): Promise<SavedObjectsResolveResponse<RawRule>> {
  const { ruleId } = params;

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.RESOLVE,
      outcome: 'unknown',
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: ruleId },
    })
  );

  return await withActiveSpan(
    'unsecuredSavedObjectsClient.resolve',
    { attributes: { [ATTR_SPAN_TYPE]: 'rules' } },
    () =>
      resolveRuleSo({
        id: ruleId,
        savedObjectsClient: context.unsecuredSavedObjectsClient,
      })
  );
}
