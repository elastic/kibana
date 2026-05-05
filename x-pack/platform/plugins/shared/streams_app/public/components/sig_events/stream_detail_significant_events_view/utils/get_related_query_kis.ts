/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeIndicator } from '@kbn/streams-ai';
import { normalizeServiceName } from './get_ki_dependencies';

/**
 * Extracts entity/dependency/technology names from a single evidence string.
 *
 * Evidence strings follow patterns like:
 *   "Entity: Payment Service (gRPC on port 50051, confidence 95)"
 *   "Dependency: checkout → payment (confidence 82)"
 *   "Technology: Node.js (confidence 94)"
 *
 * For dependency strings the source and target are both extracted so we can
 * match a feature KI that appears on either side of the edge.
 */
function extractEvidenceNames(evidence: string): string[] {
  const names: string[] = [];
  const regex =
    /(?:Entity|Dependency|Technology|Infrastructure):\s*([^(]+?)(?=\s*\(|\s*$|,\s*(?:Entity|Dependency|Technology|Infrastructure))/gi;
  let match;
  while ((match = regex.exec(evidence)) !== null) {
    const name = match[1].trim();
    if (name.includes('→')) {
      // Split "checkout → payment" into both constituent names
      names.push(...name.split('→').map((p) => p.trim()));
    } else {
      names.push(name);
    }
  }
  return names;
}

/**
 * Returns all query-kind KIs whose `evidence` field references the given
 * feature KI.  Matching uses the same normalisation as dependency resolution
 * so that names like "Payment Service", "payment-service", and "payment" all
 * resolve to the same entity.
 */
export function getRelatedQueryKIs(
  featureKI: KnowledgeIndicator,
  allKIs: KnowledgeIndicator[]
): KnowledgeIndicator[] {
  if (featureKI.kind !== 'feature') return [];

  const idNorm = normalizeServiceName(featureKI.feature.id);
  const titleNorm = normalizeServiceName(featureKI.feature.title ?? '');
  if (!idNorm && !titleNorm) return [];

  return allKIs.filter((ki) => {
    if (ki.kind !== 'query') return false;
    const evidence = ki.query.evidence ?? [];
    return evidence.some((ev) => {
      const names = extractEvidenceNames(ev);
      return names.some((name) => {
        const nameNorm = normalizeServiceName(name);
        return (idNorm && nameNorm === idNorm) || (titleNorm && nameNorm === titleNorm);
      });
    });
  });
}
