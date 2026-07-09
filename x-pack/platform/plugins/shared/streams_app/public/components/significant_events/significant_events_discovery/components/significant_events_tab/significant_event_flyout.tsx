/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useInterval from 'react-use/lib/useInterval';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { useFetchSignificantEventLifecycle } from '../../../../../hooks/significant_events/use_fetch_significant_event_lifecycle';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useTriggerInvestigation } from '../../../../../hooks/significant_events/use_trigger_investigation';
import { LifecycleTimeline } from './lifecycle_timeline';
import { getSignificantEventStatusColor } from '../shared/status_display';
import { SIGNIFICANT_EVENT_STATUS_LABELS } from '../shared/translations';
import { formatTimestamp } from '../../../../../util/formatters';
import { SigEventDetails } from '../../../significant_event_details/sig_event_details';
import { EventInvestigations } from './event_investigations';
import { ProvenanceSection } from './provenance';
import { hasRunningInvestigation } from '../shared/investigation_status';
import { RUNNING_POLL_INTERVAL_MS } from '../../../constants';

const SUMMARY_TITLE = i18n.translate('xpack.streams.sigEventsTab.flyout.summaryTitle', {
  defaultMessage: 'Summary',
});
const LIFECYCLE_TITLE = i18n.translate('xpack.streams.sigEventsTab.flyout.lifecycleTitle', {
  defaultMessage: 'Lifecycle',
});
const LIFECYCLE_ERROR = i18n.translate('xpack.streams.sigEventsTab.flyout.lifecycleError', {
  defaultMessage: 'Failed to load lifecycle data',
});
const CLOSE_LABEL = i18n.translate('xpack.streams.sigEventsTab.flyout.close', {
  defaultMessage: 'Close',
});

const RUN_LABEL = i18n.translate('xpack.streams.sigEventsTab.runInvestigationButton.label', {
  defaultMessage: 'Run investigation',
});
const RESTART_LABEL = i18n.translate(
  'xpack.streams.sigEventsTab.runInvestigationButton.restartLabel',
  {
    defaultMessage: 'Restart investigation',
  }
);
const RESTART_INVESTIGATION_TOOLTIP = i18n.translate(
  'xpack.streams.sigEventsTab.flyout.restartInvestigationTooltip',
  {
    defaultMessage: 'This will cancel the running investigation and start a new one.',
  }
);
const CRITICALITY_LABEL = i18n.translate('xpack.streams.sigEventsTab.flyout.criticalityLabel', {
  defaultMessage: 'Criticality',
});
const CONFIDENCE_LABEL = i18n.translate('xpack.streams.sigEventsTab.flyout.confidenceLabel', {
  defaultMessage: 'Confidence',
});

interface SignificantEventFlyoutProps {
  event: SignificantEvent;
  onClose: () => void;
}

export const SignificantEventFlyout = ({ event, onClose }: SignificantEventFlyoutProps) => {
  const {
    services: { focusedSignificantEventService },
  } = useKibana();
  const {
    data: lifecycleData,
    isLoading: isLifecycleLoading,
    isError: isLifecycleError,
    refetch: refetchLifecycle,
  } = useFetchSignificantEventLifecycle(event.event_id);

  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'significantEventFlyout' });
  const summaryAccordionId = useGeneratedHtmlId({ prefix: 'sigEventSummary' });
  const lifecycleAccordionId = useGeneratedHtmlId({ prefix: 'sigEventLifecycle' });

  // Use the latest event version from the lifecycle response — lifecycle fetches all
  // versions via findByDiscoverySlug (no time filter), so it captures newly-written
  // versions that fall outside the time-filtered list query used by the parent table.
  const latestEvent = useMemo(() => lifecycleData?.events.at(-1) ?? event, [lifecycleData, event]);

  const lifecycleEntryCount = useMemo(
    () =>
      lifecycleData
        ? lifecycleData.detections.length +
          lifecycleData.discoveries.filter(({ kind }) => kind !== 'handled').length +
          lifecycleData.events.length
        : 0,
    [lifecycleData]
  );

  const isInvestigationRunning = hasRunningInvestigation(latestEvent);

  // Once an investigation has actually finished, its findings (surfaced via "How we got here"
  // and the investigation output itself) are far more useful than the triage-derived summary —
  // promote them above the fold and push the summary/root-cause/lifecycle content down.
  const hasCompletedInvestigation = useMemo(
    () =>
      latestEvent.investigations?.some((investigation) => investigation.completed_at != null) ??
      false,
    [latestEvent.investigations]
  );

  // Poll lifecycle while a pending investigation is in progress, or briefly after the
  // footer button triggers one (the async workflow step may not have written back yet).
  const [isPollingAfterTrigger, setIsPollingAfterTrigger] = useState(false);
  const triggerPollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isInvestigationRunning && isPollingAfterTrigger) {
      setIsPollingAfterTrigger(false);
      clearTimeout(triggerPollTimeoutRef.current);
    }
  }, [isInvestigationRunning, isPollingAfterTrigger]);

  useEffect(() => () => clearTimeout(triggerPollTimeoutRef.current), []);

  const onTriggerSuccess = useCallback(() => {
    setIsPollingAfterTrigger(true);
    clearTimeout(triggerPollTimeoutRef.current);
    triggerPollTimeoutRef.current = setTimeout(() => setIsPollingAfterTrigger(false), 30_000);
  }, []);

  const { triggerInvestigation, isTriggering } = useTriggerInvestigation({ onTriggerSuccess });

  useInterval(
    refetchLifecycle,
    isPollingAfterTrigger || isInvestigationRunning ? RUNNING_POLL_INTERVAL_MS : null
  );

  useEffect(() => {
    focusedSignificantEventService.setFocusedEvent(latestEvent);

    return () => {
      focusedSignificantEventService.clearFocusedEvent(latestEvent.discovery_slug);
    };
  }, [latestEvent, focusedSignificantEventService]);

  const summaryAccordion = (
    <EuiAccordion
      id={summaryAccordionId}
      data-test-subj="sigEventSummaryAccordion"
      buttonContent={
        <EuiTitle size="xs">
          <h3>{SUMMARY_TITLE}</h3>
        </EuiTitle>
      }
    >
      <EuiSpacer size="s" />
      <SigEventDetails event={event} />
    </EuiAccordion>
  );

  return (
    <EuiFlyout onClose={onClose} size="m" aria-labelledby={flyoutTitleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiBadge color={getSignificantEventStatusColor(event.status)}>
                {SIGNIFICANT_EVENT_STATUS_LABELS[event.status]}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiTitle size="m">
            <h2 id={flyoutTitleId}>{event.title}</h2>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            {formatTimestamp(event['@timestamp'])}
            {event.criticality != null && ` · ${CRITICALITY_LABEL}: ${event.criticality}`}
            {event.confidence != null && ` · ${CONFIDENCE_LABEL}: ${event.confidence}%`}
          </EuiText>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="m">
          {hasCompletedInvestigation ? (
            <>
              <ProvenanceSection
                event={latestEvent}
                lifecycle={lifecycleData}
                isLoading={isLifecycleLoading}
              />

              <EuiHorizontalRule margin="none" />

              <EventInvestigations event={latestEvent} />

              <EuiHorizontalRule margin="none" />

              {summaryAccordion}
            </>
          ) : (
            <>
              {summaryAccordion}

              <EuiHorizontalRule margin="none" />

              <ProvenanceSection
                event={latestEvent}
                lifecycle={lifecycleData}
                isLoading={isLifecycleLoading}
              />

              <EuiHorizontalRule margin="none" />

              <EventInvestigations event={latestEvent} />
            </>
          )}

          <EuiHorizontalRule margin="none" />

          <EuiAccordion
            id={lifecycleAccordionId}
            data-test-subj="sigEventLifecycleAccordion"
            buttonContent={
              <EuiFlexGroup direction="column" gutterSize="xs">
                <EuiTitle size="xs">
                  <h3>{LIFECYCLE_TITLE}</h3>
                </EuiTitle>
                <EuiText size="xs" color="subdued">
                  {i18n.translate('xpack.streams.sigEventsTab.flyout.lifecycleSummary', {
                    defaultMessage: '{count, plural, one {# entry} other {# entries}}',
                    values: { count: lifecycleEntryCount },
                  })}
                </EuiText>
              </EuiFlexGroup>
            }
          >
            <EuiSpacer size="s" />
            {isLifecycleLoading ? (
              <EuiLoadingSpinner size="m" />
            ) : isLifecycleError ? (
              <EuiCallOut
                announceOnMount
                title={LIFECYCLE_ERROR}
                color="danger"
                iconType="error"
                size="s"
              />
            ) : (
              <LifecycleTimeline data={lifecycleData} />
            )}
          </EuiAccordion>
        </EuiFlexGroup>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>{CLOSE_LABEL}</EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={isInvestigationRunning ? RESTART_INVESTIGATION_TOOLTIP : undefined}
            >
              <EuiButton
                iconType="inspect"
                onClick={() => {
                  if (!isTriggering) triggerInvestigation(latestEvent.event_id);
                }}
                isDisabled={isTriggering}
                isLoading={isTriggering}
                fill
                size="s"
                data-test-subj="sigEventRunInvestigationButton"
              >
                {isInvestigationRunning ? RESTART_LABEL : RUN_LABEL}
              </EuiButton>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
