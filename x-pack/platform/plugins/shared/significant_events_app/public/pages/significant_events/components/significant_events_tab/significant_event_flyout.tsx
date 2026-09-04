/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useInterval from 'react-use/lib/useInterval';
import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHealth,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiText,
  EuiPopover,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
  copyToClipboard,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import type { SignificantEventResponse } from '@kbn/significant-events-schema';
import { formatTimestamp } from '../../../../util/formatters';
import { useFetchSignificantEventLifecycle } from '../../../../hooks/use_fetch_significant_event_lifecycle';
import { useKibana } from '../../../../hooks/use_kibana';
import { useTriggerInvestigation } from '../../../../hooks/use_trigger_investigation';
import { useUpdateSignificantEvent } from '../../../../hooks/use_update_significant_event';
import { useBlocksNewActivity } from '../../../../hooks/use_significant_events_maintenance';
import { FlyoutMetadataCard } from '../../../../components/flyout_components/flyout_metadata_card';
import { FlyoutToolbarHeader } from '../../../../components/flyout_components/flyout_toolbar_header';
import { getConfidenceColor } from '../../../../components/knowledge_indicators/utils/get_confidence_color';
import { LifecycleTimeline } from './lifecycle_timeline';
import { getSignificantEventStatusColor } from '../shared/status_display';
import { SIGNIFICANT_EVENT_STATUS_LABELS } from '../shared/translations';
import { SeverityBadge } from '../severity_badge/severity_badge';
import { SignificantEventDetails } from '../../../../components/significant_event_details/significant_event_details';
import { EventInvestigations } from './event_investigations';
import { hasRunningInvestigation } from '../shared/investigation_status';
import { RUNNING_POLL_INTERVAL_MS } from '../../../../constants';

const LIFECYCLE_TITLE = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.flyout.lifecycleTitle',
  {
    defaultMessage: 'Lifecycle',
  }
);
const LIFECYCLE_ERROR = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.flyout.lifecycleError',
  {
    defaultMessage: 'Failed to load lifecycle data',
  }
);
const CLOSE_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.flyout.close',
  {
    defaultMessage: 'Close',
  }
);
const CLOSE_EVENT_LABEL = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.flyout.closeEvent',
  {
    defaultMessage: 'Close significant event',
  }
);
const ACTIONS_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.flyout.actionsMenuButtonAriaLabel',
  {
    defaultMessage: 'Actions',
  }
);

const COPY_LINK_ARIA_LABEL = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.flyout.copyLink',
  {
    defaultMessage: 'Copy link to this event',
  }
);

const COPY_LINK_SUCCESS = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.flyout.copyLinkSuccess',
  {
    defaultMessage: 'Copied link to event',
  }
);

const RUN_LABEL = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.runInvestigationButton.label',
  {
    defaultMessage: 'Run investigation',
  }
);
const RESTART_LABEL = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.runInvestigationButton.restartLabel',
  {
    defaultMessage: 'Restart investigation',
  }
);
const RESTART_INVESTIGATION_TOOLTIP = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.flyout.restartInvestigationTooltip',
  {
    defaultMessage: 'This will cancel the running investigation and start a new one.',
  }
);
const SEVERITY_LABEL = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.flyout.severityLabel',
  {
    defaultMessage: 'Severity',
  }
);
const CONFIDENCE_LABEL = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.flyout.confidenceLabel',
  {
    defaultMessage: 'Confidence',
  }
);
const STATUS_LABEL = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.flyout.statusLabel',
  {
    defaultMessage: 'Status',
  }
);

const EMPTY_VALUE = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.flyout.emptyValue',
  { defaultMessage: '—' }
);

interface SignificantEventFlyoutProps {
  event: SignificantEventResponse;
  onClose: () => void;
}

const BadgeRow = ({ items, color }: { items: string[]; color?: string }) => {
  if (items.length === 0) {
    return (
      <EuiText size="s" color="subdued">
        {EMPTY_VALUE}
      </EuiText>
    );
  }
  return (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
      {items.map((item, idx) => (
        <EuiFlexItem grow={false} key={`${item}-${idx}`}>
          <EuiBadge color={color ?? 'default'}>{item}</EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

export const SignificantEventFlyout = ({ event, onClose }: SignificantEventFlyoutProps) => {
  const {
    services: { focusedSignificantEventService },
    core: { notifications },
  } = useKibana();
  const {
    data: lifecycleData,
    isLoading: isLifecycleLoading,
    isError: isLifecycleError,
    refetch: refetchLifecycle,
  } = useFetchSignificantEventLifecycle(event.event_uuid);

  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'significantEventFlyout' });
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  // Use the latest event version from the lifecycle response — lifecycle fetches all
  // versions via findByEventId (no time filter), so it captures newly-written
  // versions that fall outside the time-filtered list query used by the parent table.
  const latestEvent = useMemo(() => lifecycleData?.events.at(-1) ?? event, [lifecycleData, event]);

  const isInvestigationRunning = hasRunningInvestigation(latestEvent);

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
  const { blocksActivity, activityBlockTooltip } = useBlocksNewActivity();
  const { updateEventStatus, isUpdating } = useUpdateSignificantEvent({
    onUpdateSuccess: onClose,
  });

  const isClosed = latestEvent.status === 'closed';

  useInterval(
    refetchLifecycle,
    isPollingAfterTrigger || isInvestigationRunning ? RUNNING_POLL_INTERVAL_MS : null
  );

  useEffect(() => {
    focusedSignificantEventService.setFocusedEvent(latestEvent);

    return () => {
      focusedSignificantEventService.clearFocusedEvent(latestEvent.event_id);
    };
  }, [latestEvent, focusedSignificantEventService]);

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      type="push"
      ownFocus={false}
      size="40%"
      hideCloseButton
    >
      <FlyoutToolbarHeader>
        {!isClosed && (
          <EuiFlexItem grow={false}>
            <EuiPopover
              aria-label={ACTIONS_BUTTON_ARIA_LABEL}
              button={
                <EuiToolTip content={ACTIONS_BUTTON_ARIA_LABEL} disableScreenReaderOutput>
                  <EuiButtonIcon
                    data-test-subj="sigEventFlyoutActionsButton"
                    iconType="boxesVertical"
                    aria-label={ACTIONS_BUTTON_ARIA_LABEL}
                    isLoading={isUpdating}
                    isDisabled={isUpdating}
                    onClick={() => setIsActionsMenuOpen((open) => !open)}
                  />
                </EuiToolTip>
              }
              isOpen={isActionsMenuOpen}
              closePopover={() => setIsActionsMenuOpen(false)}
              panelPaddingSize="none"
              anchorPosition="downRight"
            >
              <EuiContextMenuPanel
                items={[
                  <EuiContextMenuItem
                    key="close-event"
                    icon="cross"
                    color="danger"
                    disabled={isUpdating}
                    onClick={() => {
                      if (!isUpdating) {
                        setIsActionsMenuOpen(false);
                        updateEventStatus({
                          eventUuid: latestEvent.event_uuid,
                          status: 'closed',
                        });
                      }
                    }}
                    data-test-subj="sigEventCloseButton"
                  >
                    {CLOSE_EVENT_LABEL}
                  </EuiContextMenuItem>,
                ]}
              />
            </EuiPopover>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiToolTip content={COPY_LINK_ARIA_LABEL} disableScreenReaderOutput>
            <EuiButtonIcon
              data-test-subj="sigEventFlyoutCopyLinkButton"
              iconType="link"
              aria-label={COPY_LINK_ARIA_LABEL}
              onClick={() => {
                const ok = copyToClipboard(window.location.href);
                if (ok) {
                  notifications.toasts.addSuccess({ title: COPY_LINK_SUCCESS });
                }
              }}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={CLOSE_BUTTON_ARIA_LABEL} disableScreenReaderOutput>
            <EuiButtonIcon
              data-test-subj="sigEventFlyoutCloseButton"
              iconType="cross"
              aria-label={CLOSE_BUTTON_ARIA_LABEL}
              onClick={onClose}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </FlyoutToolbarHeader>

      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={flyoutTitleId}>{event.title}</h2>
        </EuiTitle>
        <EuiText size="xs" color="subdued">
          {formatTimestamp(event.created_at ?? event['@timestamp'])}
        </EuiText>
        <EuiSpacer size="m" />
        <BadgeRow items={event.stream_names ?? []} color="hollow" />
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="s" responsive={false} wrap>
          <EuiFlexItem>
            <FlyoutMetadataCard title={STATUS_LABEL}>
              <EuiBadge color={getSignificantEventStatusColor(event.status)}>
                {SIGNIFICANT_EVENT_STATUS_LABELS[event.status]}
              </EuiBadge>
            </FlyoutMetadataCard>
          </EuiFlexItem>
          <EuiFlexItem>
            <FlyoutMetadataCard title={SEVERITY_LABEL}>
              <SeverityBadge score={Number.parseInt(event.severity, 10)} />
            </FlyoutMetadataCard>
          </EuiFlexItem>
          {event.confidence != null && (
            <EuiFlexItem>
              <FlyoutMetadataCard title={CONFIDENCE_LABEL}>
                <EuiHealth
                  color={getConfidenceColor(Math.round(event.confidence * 100))}
                  textSize="xs"
                >
                  {`${Math.round(event.confidence * 100)}%`}
                </EuiHealth>
              </FlyoutMetadataCard>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="m">
          <SignificantEventDetails event={event} />

          <EuiHorizontalRule margin="none" />

          <EventInvestigations event={latestEvent} />

          <EuiHorizontalRule margin="none" />

          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiTitle size="xs">
              <h3>{LIFECYCLE_TITLE}</h3>
            </EuiTitle>
            {isLifecycleLoading ? (
              <EuiLoadingSpinner size="m" />
            ) : isLifecycleError ? (
              <KbnDangerCallout announceOnMount title={LIFECYCLE_ERROR} size="s">
                {LIFECYCLE_ERROR}
              </KbnDangerCallout>
            ) : (
              <LifecycleTimeline data={lifecycleData} />
            )}
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={
                activityBlockTooltip ??
                (isInvestigationRunning ? RESTART_INVESTIGATION_TOOLTIP : undefined)
              }
            >
              <EuiButton
                iconType="inspect"
                onClick={() => {
                  if (!isTriggering) triggerInvestigation(latestEvent.event_uuid);
                }}
                isDisabled={isTriggering || blocksActivity}
                hasAriaDisabled={blocksActivity}
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
