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
  EuiCallOut,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPopover,
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
import { useUpdateSignificantEvent } from '../../../../../hooks/significant_events/use_update_significant_event';
import { FlyoutToolbarHeader } from '../../../../flyout_components/flyout_toolbar_header';
import { LifecycleTimeline } from './lifecycle_timeline';
import { getSignificantEventStatusColor } from '../shared/status_display';
import { SIGNIFICANT_EVENT_STATUS_LABELS } from '../shared/translations';
import { formatTimestamp } from '../../../../../util/formatters';
import { SigEventDetails } from '../../../significant_event_details/sig_event_details';
import { EventInvestigations } from './event_investigations';
import { hasRunningInvestigation } from '../shared/investigation_status';
import { RUNNING_POLL_INTERVAL_MS } from '../../../constants';

const LIFECYCLE_TITLE = i18n.translate('xpack.streams.sigEventsTab.flyout.lifecycleTitle', {
  defaultMessage: 'Lifecycle',
});
const LIFECYCLE_ERROR = i18n.translate('xpack.streams.sigEventsTab.flyout.lifecycleError', {
  defaultMessage: 'Failed to load lifecycle data',
});
const CLOSE_BUTTON_ARIA_LABEL = i18n.translate('xpack.streams.sigEventsTab.flyout.close', {
  defaultMessage: 'Close',
});
const CLOSE_EVENT_LABEL = i18n.translate('xpack.streams.sigEventsTab.flyout.closeEvent', {
  defaultMessage: 'Close significant event',
});
const ACTIONS_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.streams.sigEventsTab.flyout.actionsMenuButtonAriaLabel',
  {
    defaultMessage: 'Actions',
  }
);

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
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  // Use the latest event version from the lifecycle response — lifecycle fetches all
  // versions via findByDiscoverySlug (no time filter), so it captures newly-written
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
      focusedSignificantEventService.clearFocusedEvent(latestEvent.discovery_slug);
    };
  }, [latestEvent, focusedSignificantEventService]);

  return (
    <EuiFlyout onClose={onClose} size="m" aria-labelledby={flyoutTitleId} hideCloseButton>
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
                        updateEventStatus({ eventId: latestEvent.event_id, status: 'closed' });
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
            {event.confidence != null &&
              ` · ${CONFIDENCE_LABEL}: ${Math.round(event.confidence * 100)}%`}
          </EuiText>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="m">
          <SigEventDetails event={event} />

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
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
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
