/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiTimeline,
  EuiTimelineItem,
  EuiText,
  EuiSpacer,
  EuiToolTip,
  type EuiTimelineItemProps,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';

import { PERMISSION_STATUS_ROW_EXPAND_TEST_SUBJECTS } from '../../../common/services/cloud_connectors/test_subjects';
import type { PackagePolicyPermissionSummary } from '../../../common/types/models/cloud_connector';

/**
 * Verification Timeline (Story 7, MVP slice within Story 3+4 UI).
 *
 * Renders a vertical event stream for one integration. Each event has a timestamp,
 * type-specific icon + label, and an optional per-event permission breakdown.
 * Events are ordered oldest first (verification started → verification failed → run completed).
 * When identity-level verification has failed, `run_completed` is omitted (no successful run).
 *
 * Today's data source: optionally a single `run_completed` event derived from the integration's
 * `last_verified_at` + per-status counts from `permissions[]` (omitted when verification failed).
 * The Story 7 backend endpoint (proposed: `GET /api/fleet/cloud_connectors/{id}/integrations/{packagePolicyId}/timeline`)
 * will return historical events; this component renders all of them with the same shape.
 */

interface RunCompletedEvent {
  type: 'run_completed';
  timestamp: string;
  counts: {
    verified: number;
    required: number;
    denied: number;
    error: number;
    skipped: number;
  };
}

interface VerificationStartedEvent {
  type: 'verification_started';
  timestamp: string;
}

interface VerificationFailedEvent {
  type: 'verification_failed';
  timestamp: string;
  reason?: string;
}

type TimelineEvent = RunCompletedEvent | VerificationStartedEvent | VerificationFailedEvent;

/** Narrative order when timestamps tie (oldest-first list, top = earliest). */
const TIMELINE_EVENT_ORDER: Record<TimelineEvent['type'], number> = {
  verification_started: 0,
  verification_failed: 1,
  run_completed: 2,
};

interface VerificationTimelineProps {
  summary: PackagePolicyPermissionSummary;
  /**
   * Identity-level Layer 1 lifecycle timestamps (from the cloud-connector SO).
   * The same `started`/`failed` apply across every integration on the connector;
   * each row's timeline includes them alongside the per-integration `run_completed`
   * (unless `verification_failed_at` is set, in which case `run_completed` is hidden).
   */
  verificationStartedAt?: string;
  verificationFailedAt?: string;
}

/**
 * Compose a chronological (oldest-first) event stream from the data we have today:
 *   - verification_started — from the connector's `verification_started_at`
 *   - verification_failed  — from the connector's `verification_failed_at`
 *   - run_completed       — from the integration's `last_verified_at` + per-status counts
 *     (skipped when `verification_failed_at` is present)
 *
 * Today the SO only retains the *latest* start/failed timestamps, so at most one of each
 * appears. When the Story 7 history endpoint lands, it returns a paginated stream of all
 * three types and this function gets replaced by the endpoint's response.
 */
function buildEvents(
  summary: PackagePolicyPermissionSummary,
  verificationStartedAt: string | undefined,
  verificationFailedAt: string | undefined
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  if (verificationStartedAt) {
    events.push({ type: 'verification_started', timestamp: verificationStartedAt });
  }

  if (verificationFailedAt) {
    events.push({ type: 'verification_failed', timestamp: verificationFailedAt });
  }

  if (summary.last_verified_at && !verificationFailedAt) {
    const counts = { verified: 0, required: 0, denied: 0, error: 0, skipped: 0 };
    for (const p of summary.permissions ?? []) {
      if (p.status in counts) counts[p.status] += 1;
    }
    events.push({ type: 'run_completed', timestamp: summary.last_verified_at, counts });
  }

  // Oldest first — ISO 8601 string compare; on ties, keep narrative order: started → failed → completed.
  return events.sort((a, b) => {
    const byTime = a.timestamp.localeCompare(b.timestamp);
    if (byTime !== 0) {
      return byTime;
    }
    return TIMELINE_EVENT_ORDER[a.type] - TIMELINE_EVENT_ORDER[b.type];
  });
}

/**
 * Build the props for a single `EuiTimelineItem` from one event.
 *
 * EuiTimelineItem auto-draws the connecting vertical line between adjacent items
 * (EUI handles the line as a decorative pseudo-element with ARIA-hidden semantics),
 * so each event only needs to describe its own icon + content. Visual continuity is
 * the parent `EuiTimeline`'s responsibility.
 */
function buildRunCompleted(event: RunCompletedEvent): EuiTimelineItemProps {
  const { counts, timestamp } = event;
  const iconColor =
    counts.error > 0 || counts.denied > 0 ? 'danger' : counts.required > 0 ? 'warning' : 'success';

  return {
    icon: 'dot',
    iconAriaLabel: i18n.translate(
      'xpack.fleet.cloudConnector.verificationTimeline.runCompletedIconAria',
      { defaultMessage: 'Run completed' }
    ),
    verticalAlign: 'top',
    children: (
      <div data-test-subj={PERMISSION_STATUS_ROW_EXPAND_TEST_SUBJECTS.TIMELINE_EVENT}>
        <EuiToolTip content={new Date(timestamp).toLocaleString()}>
          <EuiText size="s" color={iconColor === 'success' ? 'default' : iconColor}>
            <strong>
              <FormattedMessage
                id="xpack.fleet.cloudConnector.verificationTimeline.runCompleted"
                defaultMessage="Run completed {when}"
                values={{ when: <FormattedRelative value={timestamp} /> }}
              />
            </strong>
          </EuiText>
        </EuiToolTip>
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.fleet.cloudConnector.verificationTimeline.runCounts"
            defaultMessage="{verified} verified · {required} required · {denied} denied · {error} error"
            values={counts}
          />
        </EuiText>
      </div>
    ),
  };
}

function buildVerificationStarted(event: VerificationStartedEvent): EuiTimelineItemProps {
  return {
    icon: 'clock',
    iconAriaLabel: i18n.translate(
      'xpack.fleet.cloudConnector.verificationTimeline.verificationStartedIconAria',
      { defaultMessage: 'Verification started' }
    ),
    verticalAlign: 'top',
    children: (
      <div data-test-subj={PERMISSION_STATUS_ROW_EXPAND_TEST_SUBJECTS.TIMELINE_EVENT}>
        <EuiToolTip content={new Date(event.timestamp).toLocaleString()}>
          <EuiText size="s">
            <strong>
              <FormattedMessage
                id="xpack.fleet.cloudConnector.verificationTimeline.verificationStarted"
                defaultMessage="Verification started {when}"
                values={{ when: <FormattedRelative value={event.timestamp} /> }}
              />
            </strong>
          </EuiText>
        </EuiToolTip>
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.fleet.cloudConnector.verificationTimeline.verificationStartedSubtext"
            defaultMessage="Verifier deployment kicked off for this identity."
          />
        </EuiText>
      </div>
    ),
  };
}

function buildVerificationFailed(event: VerificationFailedEvent): EuiTimelineItemProps {
  return {
    icon: 'alert',
    iconAriaLabel: i18n.translate(
      'xpack.fleet.cloudConnector.verificationTimeline.verificationFailedIconAria',
      { defaultMessage: 'Verification failed' }
    ),
    verticalAlign: 'top',
    children: (
      <div data-test-subj={PERMISSION_STATUS_ROW_EXPAND_TEST_SUBJECTS.TIMELINE_EVENT}>
        <EuiToolTip content={new Date(event.timestamp).toLocaleString()}>
          <EuiText size="s" color="danger">
            <strong>
              <FormattedMessage
                id="xpack.fleet.cloudConnector.verificationTimeline.verificationFailed"
                defaultMessage="Verification failed {when}"
                values={{ when: <FormattedRelative value={event.timestamp} /> }}
              />
            </strong>
          </EuiText>
        </EuiToolTip>
        <EuiText size="xs" color="subdued">
          {event.reason ?? (
            <FormattedMessage
              id="xpack.fleet.cloudConnector.verificationTimeline.verificationFailedSubtext"
              defaultMessage="The verifier deployment could not complete. Contact support if this persists."
            />
          )}
        </EuiText>
      </div>
    ),
  };
}

export const VerificationTimeline: React.FC<VerificationTimelineProps> = ({
  summary,
  verificationStartedAt,
  verificationFailedAt,
}) => {
  const { euiTheme } = useEuiTheme();
  const events = useMemo(
    () => buildEvents(summary, verificationStartedAt, verificationFailedAt),
    [summary, verificationStartedAt, verificationFailedAt]
  );

  if (events.length === 0) {
    return (
      <EuiText
        size="s"
        color="subdued"
        data-test-subj={PERMISSION_STATUS_ROW_EXPAND_TEST_SUBJECTS.TIMELINE_EMPTY}
      >
        {i18n.translate('xpack.fleet.cloudConnector.verificationTimeline.empty', {
          defaultMessage:
            "This integration hasn't been verified yet. Verification typically runs within the hour after setup.",
        })}
      </EuiText>
    );
  }

  return (
    <div data-test-subj={PERMISSION_STATUS_ROW_EXPAND_TEST_SUBJECTS.TIMELINE}>
      <EuiTimeline
        aria-label={i18n.translate('xpack.fleet.cloudConnector.verificationTimeline.timelineAria', {
          defaultMessage: 'Verification timeline',
        })}
      >
        {events.map((event, idx) => {
          const key = `${event.type}-${event.timestamp}-${idx}`;
          const itemProps =
            event.type === 'run_completed'
              ? buildRunCompleted(event)
              : event.type === 'verification_started'
              ? buildVerificationStarted(event)
              : buildVerificationFailed(event);

          return <EuiTimelineItem key={key} {...itemProps} />;
        })}
      </EuiTimeline>

      <EuiSpacer size="m" />

      <EuiText
        size="xs"
        color="subdued"
        css={{ fontStyle: 'italic', paddingLeft: euiTheme.size.l }}
      >
        {i18n.translate('xpack.fleet.cloudConnector.verificationTimeline.historyComingSoon', {
          defaultMessage: 'Historical verification runs will appear here in a future release.',
        })}
      </EuiText>
    </div>
  );
};
