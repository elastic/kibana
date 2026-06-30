/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTimeline,
  EuiTimelineItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedTime } from '@kbn/i18n-react';

export interface ConversationTimelineEntry {
  at?: string;
  actor?: string;
  source?: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

const labels = {
  emptyTitle: i18n.translate('xpack.agentBuilder.conversationDetail.timeline.emptyTitle', {
    defaultMessage: 'No timeline',
  }),
  emptyBody: i18n.translate('xpack.agentBuilder.conversationDetail.timeline.emptyBody', {
    defaultMessage: 'No timeline entries have been recorded for this conversation.',
  }),
  timelineAriaLabel: i18n.translate('xpack.agentBuilder.conversationDetail.timeline.ariaLabel', {
    defaultMessage: 'Conversation timeline',
  }),
  fallbackActor: i18n.translate('xpack.agentBuilder.conversationDetail.timeline.actorFallback', {
    defaultMessage: 'Conversation',
  }),
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const getString = (value: unknown): string | undefined => {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const stringifyValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const getSummaryFromRecord = (record: Record<string, unknown>): string => {
  return (
    getString(record.summary) ??
    getString(record.message) ??
    getString(record.description) ??
    getString(record.event) ??
    stringifyValue(record)
  );
};

const normalizeTimelineEntry = (value: unknown): ConversationTimelineEntry | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (isRecord(value)) {
    return {
      at: getString(value.at) ?? getString(value.timestamp) ?? getString(value.time),
      actor: getString(value.actor),
      source: getString(value.source),
      summary: getSummaryFromRecord(value),
      metadata: value,
    };
  }

  return {
    summary: stringifyValue(value),
  };
};

export const getConversationTimelineEntries = (value: unknown): ConversationTimelineEntry[] => {
  const values = Array.isArray(value) ? value : [value];

  return values
    .map(normalizeTimelineEntry)
    .filter((entry): entry is ConversationTimelineEntry => entry !== undefined)
    .sort((a, b) => {
      const aTime = a.at ? Date.parse(a.at) : Number.MAX_SAFE_INTEGER;
      const bTime = b.at ? Date.parse(b.at) : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
};

const ConversationTimelineTimestamp = ({ value }: { value?: string }) => {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return <>{value}</>;
  }

  return (
    <>
      <FormattedDate value={timestamp} year="numeric" month="short" day="2-digit" />{' '}
      <FormattedTime value={timestamp} hour="numeric" minute="numeric" second="numeric" />
    </>
  );
};

export const ConversationDetailTimelineTab = ({ timeline }: { timeline: unknown }) => {
  const entries = getConversationTimelineEntries(timeline);

  if (entries.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="timeline"
        titleSize="xs"
        title={<h2>{labels.emptyTitle}</h2>}
        body={labels.emptyBody}
        data-test-subj="conversationDetailTimelineEmpty"
      />
    );
  }

  return (
    <EuiTimeline
      aria-label={labels.timelineAriaLabel}
      gutterSize="m"
      data-test-subj="conversationDetailTimeline"
    >
      {entries.map((entry, index) => (
        <EuiTimelineItem
          key={`${entry.at ?? 'undated'}-${index}`}
          icon="dot"
          iconAriaLabel={entry.actor ?? labels.fallbackActor}
          verticalAlign="top"
        >
          <EuiPanel paddingSize="s" color="plain" hasBorder>
            <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
              {entry.actor && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{entry.actor}</EuiBadge>
                </EuiFlexItem>
              )}
              {entry.source && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="default">{entry.source}</EuiBadge>
                </EuiFlexItem>
              )}
              {entry.at && (
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    <ConversationTimelineTimestamp value={entry.at} />
                  </EuiText>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
            <EuiText size="s">
              <p>{entry.summary}</p>
            </EuiText>
          </EuiPanel>
        </EuiTimelineItem>
      ))}
    </EuiTimeline>
  );
};
