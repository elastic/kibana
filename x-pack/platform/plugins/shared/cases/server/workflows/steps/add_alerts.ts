/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  addAlertsStepCommonDefinition,
  type AddAlertsStepInput,
} from '../../../common/workflows/steps/add_alerts';
import { AttachmentType } from '../../../common';
import type { CasesClient } from '../../client';
import { ADD_ALERTS_FAILED_MESSAGE } from './translations';
import { createCaseIdOnError, createCasesStepHandler, withCaseOwner } from './utils';

/**
 * Workflows output parsing uses generated OpenAPI schemas where alert comment `rule` is optional,
 * but `rule.id` and `rule.name` are non-null strings when present. Internally, alert comments can
 * still be represented as `rule: { id: null, name: null }` (legacy attachment shape), which fails
 * that output parsing. We normalize the legacy shape by dropping `rule` when both fields are null.
 *
 * TODO: remove this once schemas are aligned end-to-end (either stop emitting null rule fields
 * in case responses, or update generated response types to allow nullable rule fields).
 */
const normalizeAlertRuleInCaseOutput = (outputCase: unknown) => {
  if (
    outputCase == null ||
    typeof outputCase !== 'object' ||
    !('comments' in outputCase) ||
    !Array.isArray(outputCase.comments)
  ) {
    return outputCase;
  }

  return {
    ...outputCase,
    comments: outputCase.comments.map((comment) => {
      if (
        comment == null ||
        typeof comment !== 'object' ||
        comment.type !== AttachmentType.alert ||
        !('rule' in comment)
      ) {
        return comment;
      }

      const rule = comment.rule;
      if (
        rule != null &&
        typeof rule === 'object' &&
        'id' in rule &&
        'name' in rule &&
        rule.id == null &&
        rule.name == null
      ) {
        const { rule: _rule, ...commentWithoutRule } = comment;
        return commentWithoutRule;
      }

      return comment;
    }),
  };
};

export const addAlertsStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...addAlertsStepCommonDefinition,
    handler: createCasesStepHandler(
      getCasesClient,
      async (client, input: AddAlertsStepInput) => {
        return withCaseOwner(client, input.case_id, async (owner) => {
          const updatedCase = await client.attachments.bulkCreate({
            caseId: input.case_id,
            attachments: input.alerts.map((alert) => ({
              type: AttachmentType.alert,
              alertId: alert.alertId,
              index: alert.index,
              owner,
              rule: {
                id: alert.rule?.id ?? null,
                name: alert.rule?.name ?? null,
              },
            })),
          });

          const normalizedOutputCase = normalizeAlertRuleInCaseOutput(updatedCase);
          return addAlertsStepCommonDefinition.outputSchema.shape.case.parse(normalizedOutputCase);
        });
      },
      {
        onError: createCaseIdOnError<AddAlertsStepInput>(ADD_ALERTS_FAILED_MESSAGE),
      }
    ),
  });
