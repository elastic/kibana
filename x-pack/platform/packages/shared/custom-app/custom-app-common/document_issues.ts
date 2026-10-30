/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appDocumentSchema } from './document_schema';

export interface DocumentIssue {
  message: string;
  /** The node the issue is about, when it is about one. */
  nodeId?: string;
}

const isRecord = (value: unknown): value is Record<PropertyKey, unknown> =>
  typeof value === 'object' && value !== null;

/** The id of the closest node on the way down a path into the document, and the field after it. */
const locate = (
  document: unknown,
  path: ReadonlyArray<PropertyKey>
): { nodeId?: string; field?: string } => {
  let current: unknown = document;
  let nodeId: string | undefined;
  let field: string | undefined;

  for (const segment of path) {
    if (!isRecord(current)) break;
    current = current[segment];
    if (isRecord(current) && typeof current.id === 'string' && typeof current.type === 'string') {
      nodeId = current.id;
      field = undefined;
    } else if (typeof segment === 'number') {
      field = `${field ?? ''}[${segment}]`;
    } else if (typeof segment === 'string') {
      field = field === undefined ? segment : `${field}.${segment}`;
    }
  }
  return { nodeId, field };
};

/**
 * Everything wrong with a document, in a form an editor can show: the message, and the node it
 * belongs to so the author can be taken there. An empty list means the document is valid.
 */
export const getDocumentIssues = (document: unknown): DocumentIssue[] => {
  const result = appDocumentSchema.safeParse(document);
  if (result.success) return [];

  const reported = new Set<string>();
  return result.error.issues.flatMap((issue): DocumentIssue[] => {
    const params = 'params' in issue && isRecord(issue.params) ? issue.params : undefined;
    if (typeof params?.nodeId === 'string')
      return [{ message: issue.message, nodeId: params.nodeId }];

    const { nodeId, field } = locate(document, issue.path);
    if (nodeId === undefined) return [{ message: issue.message }];

    // One field often breaks several rules at once, such as empty and badly formed; the first
    // says enough.
    const key = `${nodeId}|${field}`;
    if (reported.has(key)) return [];
    reported.add(key);

    return [{ message: `Node "${nodeId}"${field ? `, ${field}` : ''}: ${issue.message}`, nodeId }];
  });
};
