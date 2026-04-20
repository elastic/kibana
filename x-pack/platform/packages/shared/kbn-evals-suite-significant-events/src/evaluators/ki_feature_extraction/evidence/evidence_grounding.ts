/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFlattenedObject } from '@kbn/std';
import type { KIFeatureExtractionEvaluator } from '../types';
import { getFeaturesFromOutput } from '../types';
import { isEvidenceGrounded } from './is_evidence_grounded';

/**
 * Checks that every evidence string in every KI is grounded in the input
 * documents — either as a `field.path=value` snippet matching a document field,
 * or as a direct quote appearing in any string value.
 *
 * Only scores features that actually provide evidence (coverage is measured
 * separately by `evidence_coverage`).
 *
 * When KI features include `evidence_doc_ids`, additionally validates that:
 * 1. All referenced `_id`s exist in the input documents.
 * 2. Evidence strings are grounded in the specific referenced docs, not just
 *    any input document.
 */
export const evidenceGroundingEvaluator = {
  name: 'evidence_grounding',
  kind: 'CODE' as const,
  evaluate: async ({ input, output }) => {
    const features = getFeaturesFromOutput(output);

    const docsById = new Map<string, Record<string, unknown>>();
    const documents = input.sample_documents.map((doc) => {
      const id = typeof doc._id === 'string' ? doc._id : undefined;

      const resolved = {
        ...(doc.fields ?? {}),
        ...getFlattenedObject(doc._source ?? {}),
      };
      if (id) {
        docsById.set(id, resolved);
      }
      return resolved;
    });

    let totalEvidence = 0;
    let groundedEvidence = 0;
    const ungroundedItems: string[] = [];

    let totalDocIds = 0;
    let validDocIds = 0;
    let totalRefEvidence = 0;
    let groundedRefEvidence = 0;
    const docIdIssues: string[] = [];

    for (const feature of features) {
      const evidenceList = feature.evidence ?? [];
      if (evidenceList.length === 0) {
        continue;
      }

      for (const evidence of evidenceList) {
        totalEvidence++;
        if (isEvidenceGrounded(evidence, documents)) {
          groundedEvidence++;
        } else {
          ungroundedItems.push(`KI feature "${feature.id}": "${evidence}"`);
        }
      }

      const docIds = feature.evidence_doc_ids ?? [];
      if (docIds.length > 0) {
        const refDocs: Array<Record<string, unknown>> = [];
        for (const docId of docIds) {
          totalDocIds++;
          const doc = docsById.get(docId);
          if (doc) {
            validDocIds++;
            refDocs.push(doc);
          } else {
            docIdIssues.push(`KI feature "${feature.id}": unknown doc ID "${docId}"`);
          }
        }

        if (refDocs.length > 0) {
          for (const evidence of evidenceList) {
            totalRefEvidence++;
            if (isEvidenceGrounded(evidence, refDocs)) {
              groundedRefEvidence++;
            } else {
              docIdIssues.push(
                `KI feature "${feature.id}": evidence not in referenced docs: "${evidence}"`
              );
            }
          }
        }
      }
    }

    if (totalEvidence === 0) {
      return { score: null, explanation: 'No evidence strings to check' };
    }

    const groundingScore = groundedEvidence / totalEvidence;
    const docIdScore =
      totalDocIds > 0
        ? (validDocIds / totalDocIds +
            (totalRefEvidence > 0 ? groundedRefEvidence / totalRefEvidence : 1)) /
          2
        : 1;
    const score = totalDocIds > 0 ? (groundingScore + docIdScore) / 2 : groundingScore;

    const allIssues = [...ungroundedItems, ...docIdIssues];
    return {
      score,
      explanation:
        allIssues.length > 0
          ? `${allIssues.slice(0, 5).join('; ')}`
          : `All ${totalEvidence} evidence strings are grounded` +
            (totalDocIds > 0 ? ` and all ${totalDocIds} doc IDs are valid` : ''),
      details: {
        totalEvidence,
        groundedEvidence,
        ungroundedItems,
        totalDocIds,
        validDocIds,
        totalRefEvidence,
        groundedRefEvidence,
        docIdIssues,
      },
    };
  },
} satisfies KIFeatureExtractionEvaluator;
