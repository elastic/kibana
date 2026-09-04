/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Tone, ViewSpec } from '@kbn/adaptive-ui';
import {
  Action,
  Actions,
  Badge,
  Callout,
  DescriptionList,
  List,
  Stat,
  StatGroup,
  Table,
  Text,
  View,
  toViewSpec,
} from '@kbn/adaptive-ui/jsx';
import { buildNightshiftEventHref, titleCase } from './shared';

// Fields mirror the canonical `SigEvent` Zod schema in `@kbn/streams-schema`:
// `criticality` is a 0–100 score, `confidence` a percentage, `status` the
// stateful lifecycle enum.

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

// Thresholds mirror Kibana's `SeverityBadge` (`<40 low, <60 medium, <80 high,
// else critical`) so the bucket matches what Streams shows.
const severityFor = (criticality: number): { label: string; tone: Tone } => {
  if (criticality < 40) {
    return { label: 'Low', tone: 'success' };
  }
  if (criticality < 60) {
    return { label: 'Medium', tone: 'warning' };
  }
  if (criticality < 80) {
    return { label: 'High', tone: 'risk' };
  }
  return { label: 'Critical', tone: 'danger' };
};

const STATUS_TONE: Record<SigEventStatus, Tone> = {
  promoted: 'warning',
  acknowledged: 'primary',
  demoted: 'neutral',
  resolved: 'success',
};

const EVIDENCE_RESULT_TONE: Record<string, Tone> = {
  anomaly: 'warning',
  saturated: 'danger',
};

/**
 * Alternate rendering for the `platform.sig_event` attachment. Evidence renders
 * as a summarized signal/stream/result table; the raw ES|QL log rows the live
 * attachment can drill into are omitted because they need a runtime query, not
 * the static `data` payload (they belong to the seam's `renderInlineContent`
 * fallback, not this adapter).
 */
export const buildSignificantEventSpec = (event: SignificantEventInput): ViewSpec => {
  const severity = severityFor(event.criticality);
  const nightshiftHref = buildNightshiftEventHref({
    eventId: event.event_id,
    eventUuid: event.event_uuid,
  });

  return toViewSpec(
    <View title={event.title} theme="auto" meta={{ source: 'registry', ariaLabel: event.title }}>
      <Text title="Assessment" body={event.summary} />
      <StatGroup>
        <Stat label="Criticality" value={String(event.criticality)} />
        <Stat label="Confidence" value={`${event.confidence}%`} />
        <Stat label="Severity" value={severity.label} tone={severity.tone} />
        <Stat label="Status" value={titleCase(event.status)} tone={STATUS_TONE[event.status]} />
      </StatGroup>
      <Callout title="Root cause" tone="neutral">
        {event.root_cause}
      </Callout>
      {event.recommendations.length > 0 && (
        <List
          label="Recommended remediations"
          ordered
          items={event.recommendations.map((content) => ({ content }))}
        />
      )}
      {event.evidences.length > 0 && (
        <Table
          label="Evidence"
          columns={[
            { id: 'signal', label: 'Signal' },
            { id: 'stream', label: 'Stream' },
            { id: 'result', label: 'Result' },
            { id: 'detail', label: 'Detail' },
          ]}
          rows={event.evidences.map((evidence) => ({
            signal: evidence.rule_name,
            stream: evidence.stream_name ?? '—',
            result: {
              type: 'badge',
              label: evidence.result ?? 'observed',
              tone: EVIDENCE_RESULT_TONE[evidence.result ?? ''] ?? 'neutral',
            },
            detail: evidence.description ?? '',
          }))}
        />
      )}
      {event.cause_kis.length > 0 && (
        <DescriptionList
          label="Contributing factors"
          layout="inline"
          items={event.cause_kis.map((ki) => ({
            title: ki.name,
            description: ki.stream_name ?? '—',
            tone: 'warning',
          }))}
        />
      )}
      {event.stream_names.length > 0 && (
        <Badge
          label="Streams"
          items={event.stream_names.map((stream) => ({ label: stream, variant: 'hollow' }))}
        />
      )}
      {event.rule_names.length > 0 && (
        <Badge
          label="Detection rules"
          items={event.rule_names.map((rule) => ({ label: rule, variant: 'hollow' }))}
        />
      )}
      <Actions>
        {nightshiftHref && (
          <Action label="View in Nightshift" href={nightshiftHref} tone="primary" />
        )}
        <Action
          label="Open in Streams"
          href={`/app/streams/significant_events/${event.event_id}`}
          tone="neutral"
        />
      </Actions>
    </View>
  ) as ViewSpec;
};

export const significantEventSpec = buildSignificantEventSpec(significantEventFixture);

export const toSigEventViewSpec = buildSignificantEventSpec;
export const sampleSigEvent = significantEventFixture;
