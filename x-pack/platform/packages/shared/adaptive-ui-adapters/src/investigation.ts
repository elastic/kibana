/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actions, badge, codeBlock, itemList, panel, table, view } from '@kbn/adaptive-ui/builders';
import type { PrimitiveNode, Tone, ViewSpec } from '@kbn/adaptive-ui';
import { buildNightshiftEventHref, titleCase } from './shared';

/**
 * Structured investigation payload as merged to main (`recommendations` /
 * `blind_spots` / prose `conclusion`) rather than this worktree's markdown-shaped
 * `InvestigationState`. Mirrors `@kbn/significant-events-schema` plus the event
 * and investigation ids needed for CTAs.
 */
export type InvestigationHypothesisStatus = 'investigating' | 'dismissed' | 'confirmed';

export interface InvestigationEvidenceCode {
  source: 'github_connector' | 'code_search';
  repo: string;
  path: string;
  host?: string;
  ref?: string;
}

export interface InvestigationEvidence {
  description: string;
  esql_query?: string;
  time_range?: { from: string; to: string };
  code?: InvestigationEvidenceCode;
}

export interface InvestigationHypothesis {
  candidate: string;
  confidence: number;
  status: InvestigationHypothesisStatus;
  reason?: string;
  evidence?: InvestigationEvidence[];
}

export interface InvestigationRecommendation {
  title: string;
  description?: string;
  code?: string;
}

export interface InvestigationBlindSpot {
  title: string;
  description: string;
}

export interface InvestigationInput {
  summary: string;
  conclusion?: string;
  recommendations?: InvestigationRecommendation[];
  blind_spots?: InvestigationBlindSpot[];
  hypotheses?: InvestigationHypothesis[];
  status?: string;
  event_id?: string;
  event_uuid?: string;
  investigation_id?: string;
}

const HOSTNAME_PATTERN = /^[a-z0-9.-]+(:\d{1,5})?$/i;

const hasDotSegment = (value: string): boolean =>
  value.split('/').some((segment) => segment === '.' || segment === '..');

const encodePath = (path: string): string => path.split('/').map(encodeURIComponent).join('/');

/** GitHub blob URL when `host`+`ref` exist; `undefined` otherwise (same rules as `buildCodeReferenceUrl`). */
const codeReferenceHref = ({
  source,
  host,
  repo,
  path,
  ref,
}: InvestigationEvidenceCode): string | undefined => {
  if (source !== 'github_connector' || !host || !ref) {
    return undefined;
  }
  if (!HOSTNAME_PATTERN.test(host) || hasDotSegment(repo) || hasDotSegment(path)) {
    return undefined;
  }
  return `https://${host}/${encodePath(repo)}/blob/${encodeURIComponent(ref)}/${encodePath(path)}`;
};

const fileName = (path: string): string => path.split('/').pop() || path;

const firstLine = (value: string): string => value.split('\n')[0] ?? value;

const HYPOTHESIS_TONE: Record<InvestigationHypothesisStatus, Tone> = {
  investigating: 'primary',
  confirmed: 'danger',
  dismissed: 'neutral',
};

const STATUS_TONE: Record<string, Tone> = {
  pending: 'neutral',
  running: 'primary',
  completed: 'success',
  failed: 'danger',
  cancelled: 'warning',
};

const primaryHypothesis = (
  hypotheses: InvestigationHypothesis[]
): InvestigationHypothesis | undefined =>
  hypotheses.find((hypothesis) => hypothesis.status === 'confirmed') ??
  hypotheses.find((hypothesis) => hypothesis.status === 'investigating') ??
  hypotheses[0];

const flattenEvidence = (hypotheses: InvestigationHypothesis[]): InvestigationEvidence[] =>
  hypotheses.flatMap((hypothesis) => hypothesis.evidence ?? []);

const confidencePercent = (confidence: number): string => `${Math.round(confidence * 100)}%`;

/**
 * Alternate rendering for a Nightshift investigation: conclusion, ranked
 * remediations (optional raw `code` as `codeBlock`), blind spots, and evidence.
 */
export const toInvestigationViewSpec = (input: InvestigationInput): ViewSpec => {
  const hypotheses = input.hypotheses ?? [];
  const primary = primaryHypothesis(hypotheses);
  const title =
    (primary?.status === 'confirmed' ? primary.candidate : undefined) ??
    primary?.candidate ??
    input.summary;
  const nightshiftHref = buildNightshiftEventHref({
    eventId: input.event_id,
    eventUuid: input.event_uuid,
  });

  const body: PrimitiveNode[] = [];
  const badges: Array<{ label: string; tone: Tone; variant: 'fill' | 'hollow' }> = [];
  if (input.status) {
    badges.push({
      label: titleCase(input.status),
      tone: STATUS_TONE[input.status] ?? 'neutral',
      variant: 'fill',
    });
  }
  if (primary) {
    badges.push({
      label: titleCase(primary.status),
      tone: HYPOTHESIS_TONE[primary.status],
      variant: 'hollow',
    });
    badges.push({
      label: confidencePercent(primary.confidence),
      tone: 'primary',
      variant: 'hollow',
    });
  }
  if (badges.length > 0) {
    body.push(badge({ items: badges }));
  }

  if (input.conclusion) {
    body.push(panel({ title: 'Root cause', body: input.conclusion, variant: 'subdued' }));
  }

  const recommendations = input.recommendations ?? [];
  if (recommendations.length > 0) {
    body.push(
      itemList({
        label: 'Recommended remediations',
        items: recommendations.map((recommendation, index) => ({
          identifier: String(index + 1),
          title: recommendation.title,
          body: recommendation.description,
        })),
      })
    );
    for (const recommendation of recommendations) {
      if (recommendation.code) {
        body.push(
          codeBlock({
            language: 'text',
            code: recommendation.code,
            title: recommendation.title,
          })
        );
      }
    }
  }

  const blindSpots = input.blind_spots ?? [];
  if (blindSpots.length > 0) {
    body.push(
      itemList({
        label: 'Blind spots',
        items: blindSpots.map((spot) => ({
          title: spot.title,
          body: spot.description,
        })),
      })
    );
  }

  const evidence = flattenEvidence(hypotheses);
  if (evidence.length > 0) {
    body.push(
      table({
        label: 'Evidence',
        columns: [
          { id: 'detail', label: 'Evidence' },
          { id: 'query', label: 'ES|QL', font: 'monospace' },
          { id: 'source', label: 'Source' },
        ],
        rows: evidence.map((item) => ({
          detail: item.description,
          query: item.esql_query ? firstLine(item.esql_query) : '—',
          source: item.code ? fileName(item.code.path) : '—',
        })),
      })
    );

    for (const item of evidence) {
      if (item.esql_query) {
        body.push(
          codeBlock({
            language: 'esql',
            code: item.esql_query,
            title: item.description,
            collapsible: true,
          })
        );
      }
    }

    const sourceLinks = evidence.flatMap((item) => {
      if (!item.code) {
        return [];
      }
      const href = codeReferenceHref(item.code);
      return href ? [{ title: fileName(item.code.path), href }] : [];
    });
    if (sourceLinks.length > 0) {
      body.push(
        itemList({
          label: 'Evidence links',
          items: sourceLinks.map((link) => ({
            title: link.title,
            external: true,
            action: { label: 'Open', href: link.href },
          })),
        })
      );
    }
  }

  const actionItems: Array<{ label: string; href: string; tone?: Tone }> = [];
  if (nightshiftHref) {
    actionItems.push({ label: 'View in Nightshift', href: nightshiftHref, tone: 'primary' });
  }
  if (actionItems.length > 0) {
    body.push(actions({ items: actionItems }));
  }

  return view({
    title,
    subtitle: input.status ? `Investigation · ${titleCase(input.status)}` : 'Investigation',
    theme: 'auto',
    meta: { source: 'registry', ariaLabel: title },
    body,
  });
};

export const sampleInvestigation: InvestigationInput = {
  event_id: 'sigev-7f3a9c',
  event_uuid: 'sigev-7f3a9c-v1',
  investigation_id: 'checkout-investigation',
  status: 'completed',
  summary: 'Investigate the dropped-payment spike on payment-service after the v2.4.1 deploy.',
  conclusion:
    'payment-service v2.4.1 lowered the database connection pool ceiling. Under peak load the pool saturates and payment writes are dropped. The onset correlates with the deploy and the connection-pool saturation signal.',
  recommendations: [
    {
      title: 'Roll back payment-service to v2.4.0',
      description:
        'Lower risk than scaling the pool live. Monitor checkout success after the revert.',
      code: 'argocd app rollback payment-service',
    },
    {
      title: 'Raise the connection pool max from 20 to 50',
      description: 'Use only if rollback is delayed, then redeploy.',
    },
    {
      title: 'Watch pool utilization and checkout success',
      description: 'Target pool utilization below 70% in the Payments dashboard.',
    },
  ],
  blind_spots: [
    {
      title: 'Missing database spans',
      description: 'The slow inventory query is not represented in distributed traces.',
    },
    {
      title: 'Limited deployment metadata',
      description: 'Commit identifiers are not included in checkout logs.',
    },
  ],
  hypotheses: [
    {
      candidate: 'payment-service v2.4.1 lowered the database connection pool ceiling',
      confidence: 0.92,
      status: 'confirmed',
      reason:
        'Database query time increased immediately after the deployment while upstream dependency latency remained stable.',
      evidence: [
        {
          description: '5xx on POST /charge rose 0.4% → 6.1% at 14:05 UTC.',
          esql_query:
            'FROM logs-payment-service\n| WHERE url.path == "/charge" AND http.response.status_code >= 500\n| STATS error_rate = COUNT(*) BY DATE_TRUNC(1 minute, @timestamp)',
          time_range: {
            from: '2026-08-19T14:00:00.000Z',
            to: '2026-08-19T14:15:00.000Z',
          },
        },
        {
          description: 'Active connections pinned at 20/20 since 14:04 UTC.',
          esql_query:
            'FROM metrics-payment-service\n| STATS max_active = MAX(db.connections.active) BY DATE_TRUNC(1 minute, @timestamp)',
          time_range: {
            from: '2026-08-19T14:00:00.000Z',
            to: '2026-08-19T14:15:00.000Z',
          },
          code: {
            source: 'github_connector',
            repo: 'acme/payment-service',
            path: 'src/db/pool.ts',
            host: 'github.com',
            ref: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
          },
        },
      ],
    },
    {
      candidate: 'Payment gateway latency is slowing checkout requests',
      confidence: 0.34,
      status: 'dismissed',
      reason: 'Payment gateway response times remained within their normal range.',
    },
  ],
};

export const investigationSpec = toInvestigationViewSpec(sampleInvestigation);
