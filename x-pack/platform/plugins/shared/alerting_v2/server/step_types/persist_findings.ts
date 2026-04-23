/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { persistFindingsCommonDefinition } from '../../common/step_types/persist_findings';
import {
  RULE_DOCTOR_FINDINGS_INDEX,
  ruleDoctorFindingDocSchema,
} from '../resources/indices/rule_doctor_findings';

export const persistFindingsStepDefinition = createServerStepDefinition({
  ...persistFindingsCommonDefinition,
  handler: async (context) => {
    const esClient = context.contextManager.getScopedEsClient();
    const { rules, execution_id: executionId, space_id: spaceId } = context.input;

    const validDocs: Array<{ id: string; doc: Record<string, unknown> }> = [];
    let dropped = 0;

    for (const entry of rules) {
      const rawMeta = (entry.meta ?? entry) as Record<string, unknown>;

      // The correction loop can produce double-nested meta: remap_to_rules
      // wraps each item as {id, rule, meta: item}, but if the LLM returned
      // the validation structure ({id, rule, meta}) instead of the flat
      // finding structure, the real finding fields end up in meta.meta.
      const innerMeta =
        rawMeta.meta != null && typeof rawMeta.meta === 'object' && !Array.isArray(rawMeta.meta)
          ? (rawMeta.meta as Record<string, unknown>)
          : null;

      const meta = innerMeta ? { ...rawMeta, ...innerMeta } : rawMeta;
      const findingId = (entry.id ?? (meta.id as string) ?? '') as string;

      const candidate = {
        '@timestamp': new Date().toISOString(),
        finding_id: findingId,
        execution_id: executionId,
        space_id: spaceId,
        status: 'open' as const,
        type: meta.type ?? '',
        action: meta.action ?? '',
        impact: meta.impact ?? '',
        confidence: meta.confidence ?? '',
        summary: meta.summary ?? '',
        explanation: meta.explanation ?? '',
        rule_ids: Array.isArray(meta.ruleIds) ? meta.ruleIds : [],
        details: (meta.details as Record<string, unknown>) ?? undefined,
        current: (meta.current as Record<string, unknown>) ?? null,
        proposed: (meta.proposed ??
          entry.rule ??
          (rawMeta.rule as Record<string, unknown>) ??
          null) as Record<string, unknown> | null,
        diffs: Array.isArray(meta.diffs) ? meta.diffs : undefined,
      };

      const result = ruleDoctorFindingDocSchema.safeParse(candidate);

      if (result.success) {
        validDocs.push({ id: findingId, doc: result.data as unknown as Record<string, unknown> });
      } else {
        dropped++;
        const issues = result.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ');
        context.logger.warn(`Dropping invalid finding "${findingId}": ${issues}`);
        context.logger.debug(
          `Dropped finding "${findingId}" field presence: ${JSON.stringify({
            type: typeof candidate.type === 'string' && candidate.type.length > 0,
            action: typeof candidate.action === 'string' && candidate.action.length > 0,
            impact: candidate.impact,
            confidence: candidate.confidence,
            hasSummary: typeof candidate.summary === 'string' && candidate.summary.length > 0,
            hasExplanation: typeof candidate.explanation === 'string' && candidate.explanation.length > 0,
            rule_ids: Array.isArray(candidate.rule_ids) ? candidate.rule_ids.length : 0,
            hasProposed: candidate.proposed != null,
            hasCurrent: candidate.current != null,
            hasDiffs: Array.isArray(candidate.diffs) ? candidate.diffs.length : 0,
          })}`
        );
      }
    }

    if (validDocs.length > 0) {
      const body = validDocs.flatMap(({ id, doc }) => [
        { index: { _index: RULE_DOCTOR_FINDINGS_INDEX, _id: id } },
        doc,
      ]);

      await esClient.bulk({ body, refresh: false });
    }

    context.logger.info(
      `Persist findings: ${validDocs.length} indexed, ${dropped} dropped out of ${rules.length} total`
    );

    return {
      output: { persisted: validDocs.length, dropped },
    };
  },
});
