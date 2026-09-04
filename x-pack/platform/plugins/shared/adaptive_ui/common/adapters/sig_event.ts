/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { callout, descriptionList, list, table, text, view } from '@kbn/adaptive-ui/builders';
import type { BodyNode, ViewSpec } from '@kbn/adaptive-ui';

type SigEventStatus = 'promoted' | 'acknowledged' | 'demoted' | 'resolved';

interface SigEventEvidence {
  rule_name: string;
  stream_name?: string;
  result?: string;
  description?: string;
}

interface SigEventCauseKi {
  name: string;
  stream_name?: string;
}

export interface SignificantEventInput {
  title: string;
  summary: string;
  root_cause: string;
  criticality: number;
  confidence: number;
  status: SigEventStatus;
  recommendations: string[];
  stream_names: string[];
  rule_names: string[];
  evidences: SigEventEvidence[];
  cause_kis: SigEventCauseKi[];
  event_id: string;
  event_uuid?: string;
}

export const significantEventFixture: SignificantEventInput = {
  event_id: 'sigev-7f3a9c',
  event_uuid: 'sigev-7f3a9c-v1',
  title: 'Dropped payments on payment-service',
  status: 'promoted',
  criticality: 92,
  confidence: 88,
  summary:
    'Payment errors spiked 4× in the last 10 minutes. About 6% of checkout attempts in eu-west-1 are now failing at the payment step.',
  root_cause:
    'payment-service v2.4.1, deployed 14:02 UTC via Argo CD, lowered the database connection pool ceiling. Under peak load the pool saturates and payment writes are dropped. The onset correlates with the deploy and the connection-pool saturation signal.',
  recommendations: [
    'Roll back payment-service to v2.4.0 via Argo CD — lower risk than scaling the pool live.',
    'If rollback is delayed, raise the connection pool max from 20 to 50 and redeploy.',
    'Watch pool utilization (target below 70%) and checkout success rate in the Payments dashboard.',
  ],
  evidences: [
    {
      rule_name: 'Payment error rate',
      stream_name: 'logs-payment-service',
      result: 'anomaly',
      description: '5xx on POST /charge rose 0.4% → 6.1% at 14:05 UTC.',
    },
    {
      rule_name: 'DB connection pool utilization',
      stream_name: 'metrics-payment-service',
      result: 'saturated',
      description: 'Active connections pinned at 20/20 since 14:04 UTC.',
    },
  ],
  cause_kis: [
    { name: 'payment-service deploy v2.4.1', stream_name: 'logs-payment-service' },
    { name: 'Connection pool saturation', stream_name: 'metrics-payment-service' },
  ],
  stream_names: ['logs-payment-service', 'metrics-payment-service'],
  rule_names: ['Payment error rate', 'DB connection pool utilization'],
};

const severityLabel = (criticality: number): string => {
  if (criticality < 40) {
    return 'Low';
  }
  if (criticality < 60) {
    return 'Medium';
  }
  if (criticality < 80) {
    return 'High';
  }
  return 'Critical';
};

export const buildSignificantEventSpec = (event: SignificantEventInput): ViewSpec => {
  const body: BodyNode[] = [
    text({ title: 'Assessment', body: event.summary }),
    callout({ title: 'Root cause', body: event.root_cause, tone: 'neutral' }),
  ];

  if (event.recommendations.length > 0) {
    body.push(
      list({
        label: 'Recommended remediations',
        ordered: true,
        items: event.recommendations.map((content) => ({ content })),
      })
    );
  }

  if (event.evidences.length > 0) {
    body.push(
      table({
        label: 'Evidence',
        columns: [
          { id: 'signal', label: 'Signal' },
          { id: 'stream', label: 'Stream' },
          { id: 'result', label: 'Result' },
          { id: 'detail', label: 'Detail' },
        ],
        rows: event.evidences.map((evidence) => ({
          signal: evidence.rule_name,
          stream: evidence.stream_name ?? '—',
          result: evidence.result ?? 'observed',
          detail: evidence.description ?? '',
        })),
      })
    );
  }

  if (event.cause_kis.length > 0) {
    body.push(
      descriptionList({
        label: 'Contributing factors',
        layout: 'inline',
        items: event.cause_kis.map((ki) => ({
          title: ki.name,
          description: ki.stream_name ?? '—',
          tone: 'warning',
        })),
      })
    );
  }

  return view({
    title: event.title,
    subtitle: severityLabel(event.criticality),
    body,
  });
};

export const significantEventSpec = buildSignificantEventSpec(significantEventFixture);
