/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { AlertAttachmentPayload } from '../../../common/types/domain';
import {
  addAlertsStepCommonDefinition,
  type AddAlertsStepInput,
} from '../../../common/workflows/steps/add_alerts';
import { AttachmentType } from '../../../common';
import type { CasesClient } from '../../client';
import { createCasesStepHandler, safeParseCaseForWorkflowOutput, withCaseOwner } from './utils';

const NO_RULE_ID_GROUP = '__no_rule_id__';

const getRuleIdGroupKey = (alert: AddAlertsStepInput['alerts'][number]): string => {
  const id = alert.rule?.id;
  if (id != null && id !== '') {
    return id;
  }
  return NO_RULE_ID_GROUP;
};

const groupAlertsByRule = (
  alerts: AddAlertsStepInput['alerts']
): Map<string, AddAlertsStepInput['alerts']> => {
  const groups = new Map<string, AddAlertsStepInput['alerts']>();
  for (const alert of alerts) {
    const key = getRuleIdGroupKey(alert);
    const existing = groups.get(key);
    if (existing) {
      existing.push(alert);
    } else {
      groups.set(key, [alert]);
    }
  }
  return groups;
};

export const addAlertsStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...addAlertsStepCommonDefinition,
    handler: createCasesStepHandler(getCasesClient, async (client, input: AddAlertsStepInput) => {
      return withCaseOwner(client, input.case_id, async (owner) => {
        const attachments: AlertAttachmentPayload[] = [
          ...groupAlertsByRule(input.alerts).values(),
        ].map((group) => {
          const [first] = group;
          return {
            type: AttachmentType.alert,
            alertId: group.map((alert) => alert.alertId),
            index: group.map((alert) => alert.index),
            owner,
            rule: {
              id: first.rule?.id ?? null,
              name: first.rule?.name ?? null,
            },
          };
        });

        const updatedCase = await client.attachments.bulkCreate({
          caseId: input.case_id,
          attachments,
        });

        return safeParseCaseForWorkflowOutput(
          addAlertsStepCommonDefinition.outputSchema.shape.case,
          updatedCase
        );
      });
    }),
  });
