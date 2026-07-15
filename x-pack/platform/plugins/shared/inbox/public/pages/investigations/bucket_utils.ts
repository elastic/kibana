/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Investigation } from '../../../common/investigations';

export type InvestigationBucketId = 'contain' | 'escalate' | 'investigate' | 'tune';

export interface InvestigationBucket {
  id: InvestigationBucketId;
  label: string;
  accentColor: 'danger' | 'warning' | 'primary' | 'accent';
}

export const INVESTIGATION_BUCKETS: InvestigationBucket[] = [
  { id: 'contain', label: 'CONTAIN', accentColor: 'danger' },
  { id: 'escalate', label: 'ESCALATE', accentColor: 'warning' },
  { id: 'investigate', label: 'INVESTIGATE', accentColor: 'primary' },
  { id: 'tune', label: 'TUNE', accentColor: 'accent' },
];

const normalizeSeverity = (severity: string | undefined): string =>
  (severity ?? 'inconclusive').toLowerCase().trim();

export const getInvestigationBucketId = (severity: string | undefined): InvestigationBucketId => {
  const normalized = normalizeSeverity(severity);
  if (normalized === 'critical' || normalized === 'high') {
    return 'contain';
  }
  if (normalized === 'medium') {
    return 'escalate';
  }
  if (normalized === 'low') {
    return 'investigate';
  }
  return 'tune';
};

export const groupInvestigationsByBucket = (
  investigations: Investigation[]
): Record<InvestigationBucketId, Investigation[]> => {
  const grouped: Record<InvestigationBucketId, Investigation[]> = {
    contain: [],
    escalate: [],
    investigate: [],
    tune: [],
  };

  for (const investigation of investigations) {
    const bucketId = getInvestigationBucketId(investigation.severity);
    grouped[bucketId].push(investigation);
  }

  for (const bucket of INVESTIGATION_BUCKETS) {
    grouped[bucket.id].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }

  return grouped;
};

export const formatRelativeTime = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0) {
    return 'just now';
  }
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const summarizeText = (text: string | undefined, maxLength = 120): string => {
  if (!text) {
    return '';
  }
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
};

const WATCH_DISPLAY_NAMES: Record<string, { label: string; color: string }> = {
  'system-inbox-watch-floor': { label: 'Watch Floor', color: '#16b3a6' },
  'system-inbox-watch-officer': { label: 'Watch Officer', color: '#6092c0' },
  'system-inbox-watch-dark': { label: 'Watch Dark', color: '#6c5ce7' },
  'system-inbox-watch-deep': { label: 'Watch Deep', color: '#e74c3c' },
};

export const getWatchProvenance = (sourceWatchId: string): { label: string; color: string } => {
  const known = WATCH_DISPLAY_NAMES[sourceWatchId];
  if (known) {
    return known;
  }
  return { label: sourceWatchId, color: '#6092c0' };
};
