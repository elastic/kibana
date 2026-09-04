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
  BadgeGroup,
  Callout,
  DescriptionList,
  DescriptionListItem,
  Table,
  Text,
  View,
  toViewSpec,
} from '@kbn/adaptive-ui/jsx';
import { buildNightshiftEventHref, titleCase } from './shared';

/**
 * Canonical `platform.sig_event` attachment payload (Nightshift / Significant
 * Events). Distinct from {@link SignificantEventInput}, which is the streams-shaped
 * registered-view fixture.
 */
export interface SignificantEventAttachmentInput {
  title: string;
  summary: string;
  status: string;
  severity: string;
  confidence: number;
  event_id: string;
  event_uuid?: string;
  symptom_hypothesis?: string;
  stream_names?: string[];
  signals?: Array<{
    type?: string;
    stream_name?: string;
    description?: string;
    verdict?: string;
    metadata?: { rule_name?: string };
  }>;
  causal_features?: Array<{ name: string; stream_name?: string }>;
}

const STATUS_TONE: Record<string, Tone> = {
  open: 'danger',
  closed: 'success',
  dismissed: 'neutral',
};

const SEVERITY_TONE: Record<string, Tone> = {
  '20-low': 'success',
  '40-medium': 'warning',
  '60-high': 'risk',
  '80-critical': 'danger',
};

const severityLabel = (severity: string): string => {
  const [, label] = severity.split('-');
  return label ? titleCase(label) : severity;
};

const confidencePercent = (confidence: number): string =>
  `${Math.round(confidence <= 1 ? confidence * 100 : confidence)}%`;

/** Alternate rendering for a live `platform.sig_event` attachment. */
export const toSignificantEventAttachmentViewSpec = (
  event: SignificantEventAttachmentInput
): ViewSpec => {
  const severity = severityLabel(event.severity);
  const severityTone = SEVERITY_TONE[event.severity] ?? 'neutral';
  const statusTone = STATUS_TONE[event.status] ?? 'neutral';
  const signals = event.signals ?? [];
  const causalFeatures = event.causal_features ?? [];
  const streamNames = event.stream_names ?? [];
  const nightshiftHref = buildNightshiftEventHref({
    eventId: event.event_id,
    eventUuid: event.event_uuid,
  });

  return toViewSpec(
    <View
      title={event.title}
      subtitle={`${severity} · ${confidencePercent(event.confidence)}`}
      theme="auto"
      meta={{ source: 'attachment', ariaLabel: event.title }}
    >
      <BadgeGroup>
        <Badge label={titleCase(event.status)} tone={statusTone} variant="fill" />
        <Badge label={severity} tone={severityTone} variant="hollow" />
      </BadgeGroup>
      <Text body={event.summary} />
      {event.symptom_hypothesis && (
        <Callout title="Symptom hypothesis" tone="primary">
          {event.symptom_hypothesis}
        </Callout>
      )}
      {signals.length > 0 && (
        <Table
          label="Signals"
          columns={[
            { id: 'rule', label: 'Rule' },
            { id: 'stream', label: 'Stream' },
            { id: 'verdict', label: 'Verdict' },
            { id: 'detail', label: 'Detail' },
          ]}
          rows={signals.map((signal) => ({
            rule: signal.metadata?.rule_name ?? signal.type ?? '—',
            stream: signal.stream_name ?? '—',
            verdict: {
              type: 'badge',
              label: signal.verdict ?? 'observed',
              tone: signal.verdict === 'confirms' ? 'warning' : 'neutral',
            },
            detail: signal.description ?? '',
          }))}
        />
      )}
      {causalFeatures.length > 0 && (
        <DescriptionList label="Causal features" layout="inline">
          {causalFeatures.map((feature) => (
            <DescriptionListItem
              key={feature.name}
              title={feature.name}
              description={feature.stream_name ?? '—'}
              tone="warning"
            />
          ))}
        </DescriptionList>
      )}
      {streamNames.length > 0 && (
        <BadgeGroup label="Streams">
          {streamNames.map((stream) => (
            <Badge key={stream} label={stream} variant="hollow" />
          ))}
        </BadgeGroup>
      )}
      {nightshiftHref && (
        <Actions>
          <Action label="View in Nightshift" href={nightshiftHref} tone="primary" />
        </Actions>
      )}
    </View>
  );
};
