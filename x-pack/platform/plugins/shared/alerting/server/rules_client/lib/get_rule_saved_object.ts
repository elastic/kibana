/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/server';
import { withSpan } from '@kbn/apm-utils';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { RulesClientContext } from '../types';
import { getRuleSo } from '../../data/rule';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { RawRule } from '../../types';

interface GetRuleSavedObjectParams {
  ruleId: string;
}

export async function getRuleSavedObject(
  context: RulesClientContext,
  params: GetRuleSavedObjectParams
): Promise<SavedObject<RawRule>> {
  const { ruleId } = params;

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.GET,
      outcome: 'unknown',
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: ruleId },
    })
  );

  return await withSpan({ name: 'unsecuredSavedObjectsClient.get', type: 'rules' }, () =>
    getRuleSo({
      id: ruleId,
      savedObjectsClient: context.unsecuredSavedObjectsClient,
    })
  );
}
