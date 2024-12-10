/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsResolveResponse } from '@kbn/core/server';
import { withSpan } from '@kbn/apm-utils';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { RulesClientContext } from '../types';
import { resolveRuleSo } from '../../data/rule';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { RawRule } from '../../types';

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

  return await withSpan({ name: 'unsecuredSavedObjectsClient.resolve', type: 'rules' }, () =>
    resolveRuleSo({
      id: ruleId,
      savedObjectsClient: context.unsecuredSavedObjectsClient,
    })
  );
}
