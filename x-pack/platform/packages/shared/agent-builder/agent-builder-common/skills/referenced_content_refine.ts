/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  canComputeReferencedContentUniquenessKey,
  isRootRelativePath,
  normalizeRelativePathSegments,
} from './referenced_content_shared';

/**
 * Stable codes for referenced-content cross-field rules shared by API and UI validation.
 * Consumers map codes to localized or API-safe messages.
 */
export const REFERENCED_CONTENT_REFINE_ISSUE_CODE = {
  PATH_PROTOCOL: 'referenced_content_path_protocol',
  PATH_TRAVERSAL: 'referenced_content_path_traversal',
  RESERVED_SKILL_NAME: 'referenced_content_reserved_skill_name',
  DUPLICATE_PATH: 'referenced_content_duplicate_path',
} as const;

export type ReferencedContentRefineIssueCode =
  (typeof REFERENCED_CONTENT_REFINE_ISSUE_CODE)[keyof typeof REFERENCED_CONTENT_REFINE_ISSUE_CODE];

export interface ReferencedContentRefineIssue {
  code: ReferencedContentRefineIssueCode;
  itemIndex: number;
  field: 'relativePath' | 'name';
}

/**
 * Pure validation for referenced_content items beyond per-field Zod checks.
 * Used by {@link skillCreateRequestSchema} / {@link skillUpdateRequestSchema} and the Agent Builder skill form.
 */
export function collectReferencedContentRefineIssues(
  items: ReadonlyArray<{ name: string; relativePath: string }>
): ReferencedContentRefineIssue[] {
  const issues: ReferencedContentRefineIssue[] = [];

  items.forEach((item, index) => {
    const trimmedPath = item.relativePath.trim();

    if (!trimmedPath.startsWith('./')) {
      issues.push({
        code: REFERENCED_CONTENT_REFINE_ISSUE_CODE.PATH_PROTOCOL,
        itemIndex: index,
        field: 'relativePath',
      });
    }

    if (trimmedPath.includes('../')) {
      issues.push({
        code: REFERENCED_CONTENT_REFINE_ISSUE_CODE.PATH_TRAVERSAL,
        itemIndex: index,
        field: 'relativePath',
      });
    }

    if (item.name.trim().toLowerCase() === 'skill' && isRootRelativePath(item.relativePath)) {
      issues.push({
        code: REFERENCED_CONTENT_REFINE_ISSUE_CODE.RESERVED_SKILL_NAME,
        itemIndex: index,
        field: 'name',
      });
    }
  });

  const keyToIndices = new Map<string, number[]>();
  items.forEach((item, index) => {
    if (!canComputeReferencedContentUniquenessKey(item.relativePath)) {
      return;
    }
    const key = `${normalizeRelativePathSegments(item.relativePath)}/${item.name.trim()}`;
    const indices = keyToIndices.get(key) ?? [];
    indices.push(index);
    keyToIndices.set(key, indices);
  });

  for (const indices of keyToIndices.values()) {
    if (indices.length < 2) {
      continue;
    }
    for (const index of indices) {
      issues.push({
        code: REFERENCED_CONTENT_REFINE_ISSUE_CODE.DUPLICATE_PATH,
        itemIndex: index,
        field: 'name',
      });
    }
  }

  return issues;
}
