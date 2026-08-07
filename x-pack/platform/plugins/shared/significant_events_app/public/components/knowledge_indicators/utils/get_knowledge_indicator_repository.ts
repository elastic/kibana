/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeIndicator } from '@kbn/streams-ai';

// Code evidence is stamped as `code: <repository>[@<fingerprint>][:<location>] …`.
const CODE_EVIDENCE_REPOSITORY_RE = /code:\s*([^@\s:]+(?:\/[^@\s:]+)*)/;

const repositoryFromEvidence = (evidence: string[] | undefined): string | undefined => {
  for (const line of evidence ?? []) {
    const match = CODE_EVIDENCE_REPOSITORY_RE.exec(line);
    if (match?.[1]) {
      return match[1];
    }
  }
  return undefined;
};

/**
 * Resolves the source repository of a code-derived KI. Feature KIs carry it in
 * `properties.repository`; query KIs carry it in their code evidence line.
 */
export const getKnowledgeIndicatorRepository = (ki: KnowledgeIndicator): string | undefined => {
  if (ki.kind === 'feature') {
    const repository = ki.feature.properties?.repository;
    return typeof repository === 'string' && repository.length > 0
      ? repository
      : repositoryFromEvidence(ki.feature.evidence);
  }
  return repositoryFromEvidence(ki.query.evidence);
};
