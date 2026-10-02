/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '../../../common/types/domain';
import type { ExternalIncidentComment, ParseIncident } from '../types';
import { asString } from '../utils';

// Jira status category keys are fixed across workflows; individual status names are not.
const STATUS_BY_CATEGORY: Record<string, CaseStatuses> = {
  new: CaseStatuses.open,
  indeterminate: CaseStatuses['in-progress'],
  done: CaseStatuses.closed,
};

const parseLabels = (labels: unknown): string[] | undefined =>
  Array.isArray(labels)
    ? labels.filter((label): label is string => typeof label === 'string')
    : undefined;

// REST API v2 returns `fields.comment` as `{ comments: [...] }` with plain-text bodies.
const parseComments = (comment: unknown): ExternalIncidentComment[] | undefined => {
  const comments = (comment as { comments?: unknown } | undefined)?.comments;
  if (!Array.isArray(comments)) {
    return undefined;
  }

  return comments.flatMap((entry): ExternalIncidentComment[] => {
    const raw = entry as {
      id?: unknown;
      body?: unknown;
      author?: { displayName?: unknown; emailAddress?: unknown };
      created?: unknown;
      updated?: unknown;
    };
    const externalId = asString(raw.id);
    const body = asString(raw.body);
    if (externalId == null || body == null) {
      return [];
    }
    const name = asString(raw.author?.displayName);
    const email = asString(raw.author?.emailAddress);
    return [
      {
        externalId,
        body,
        ...(name != null ? { author: { name, ...(email != null ? { email } : {}) } } : {}),
        ...(raw.created != null ? { createdAt: asString(raw.created) } : {}),
        ...(raw.updated != null ? { updatedAt: asString(raw.updated) } : {}),
      },
    ];
  });
};

export const parseIncident: ParseIncident = (incident) => {
  const status = incident.status as { statusCategory?: { key?: unknown } } | undefined;

  return {
    title: asString(incident.summary),
    description: asString(incident.description),
    status: STATUS_BY_CATEGORY[asString(status?.statusCategory?.key) ?? ''],
    tags: parseLabels(incident.labels),
    comments: parseComments(incident.comment),
    updatedAt: asString(incident.updated),
  };
};
