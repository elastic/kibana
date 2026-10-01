/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestVersion, type VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { encode as risonEncode } from '@kbn/rison';
import { ATTACHMENTS_OVERVIEW_LABELS } from '../translations';
import { getVisibleAttachments } from './url_utils';

const TYPE_RULE = 'security.rule';

const parseRuleLabel = (data: Record<string, unknown>): string | undefined => {
  const label = data.attachmentLabel as string | undefined;
  if (label) return label;
  const rawText = data.text;
  if (typeof rawText !== 'string') return undefined;
  try {
    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    return typeof parsed?.name === 'string' ? parsed.name : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Extracts rule origins from `security.rule` attachments, builds the rules management
 * page URL (with name search pre-filled for a single rule), and returns the row label + href.
 * Returns `undefined` when no valid rule origins are found.
 */
export const getRuleRow = (
  attachments: readonly VersionedAttachment[],
  getSecurityAppUrl: (path: string) => string
): { label: string; href: string } | undefined => {
  const active = getVisibleAttachments(attachments);
  const originSet = new Set<string>();
  let firstLabel: string | undefined;

  for (const attachment of active) {
    if (attachment.type !== TYPE_RULE) continue;
    const origin = attachment.origin as string | undefined;
    if (!origin || originSet.has(origin)) continue;

    originSet.add(origin);
    if (!firstLabel) {
      const data = getLatestVersion(attachment)?.data as Record<string, unknown> | undefined;
      if (data) firstLabel = parseRuleLabel(data);
    }
  }

  if (originSet.size === 0) return undefined;

  let href: string;
  if (originSet.size === 1 && firstLabel) {
    const rulesTable = risonEncode({ searchTerm: firstLabel });
    const params = new URLSearchParams();
    params.set('rulesTable', rulesTable);
    href = getSecurityAppUrl(`/rules/management?${params.toString()}`);
  } else {
    href = getSecurityAppUrl('/rules/management');
  }

  return {
    label: ATTACHMENTS_OVERVIEW_LABELS.rules(originSet.size),
    href,
  };
};
