/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withActiveSpan } from '@kbn/tracing';
import { ATTR_SPAN_TYPE } from '@kbn/opentelemetry-attributes';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import type { RulesClientContext } from '../types';
import { alertingAuthorizationFilterOpts } from '../common/constants';
import type { BulkAction } from '../types';
import { AlertingAuthorizationEntity } from '../../authorization/types';

export const getAuthorizationFilter = async (
  context: RulesClientContext,
  { action }: { action: BulkAction }
) => {
  try {
    const authorizationTuple = await withActiveSpan(
      'authorization.getFindAuthorizationFilter',
      { attributes: { [ATTR_SPAN_TYPE]: 'rules' } },
      () =>
        context.authorization.getFindAuthorizationFilter({
          authorizationEntity: AlertingAuthorizationEntity.Rule,
          filterOpts: alertingAuthorizationFilterOpts,
        })
    );
    return authorizationTuple.filter;
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction[action],
        error,
      })
    );
    throw error;
  }
};
