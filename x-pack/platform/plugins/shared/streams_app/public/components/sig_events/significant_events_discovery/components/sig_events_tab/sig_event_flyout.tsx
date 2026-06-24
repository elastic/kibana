/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SigEvent } from '@kbn/streams-schema';
import { useFetchEventLifecycle } from '../../../../../hooks/sig_events/use_fetch_sig_events';
import { useKibana } from '../../../../../hooks/use_kibana';
import { LifecycleTimeline } from './lifecycle_timeline';
import { getSigEventStatusColor } from '../shared/status_display';
import { SIG_EVENT_STATUS_LABELS } from '../shared/translations';
import { formatTimestamp } from '../../../../../util/formatters';
import { FlyoutMetadataCard } from '../../../../flyout_components/flyout_metadata_card';
import { FlyoutToolbarHeader } from '../../../../flyout_components/flyout_toolbar_header';
import { SigEventDetails } from '../../../sig_event_details/sig_event_details';

const LIFECYCLE_TITLE = i18n.translate('xpack.streams.sigEventsTab.flyout.lifecycleTitle', {
  defaultMessage: 'Lifecycle',
});
const LIFECYCLE_ERROR = i18n.translate('xpack.streams.sigEventsTab.flyout.lifecycleError', {
  defaultMessage: 'Failed to load lifecycle data',
});
const CLOSE_BUTTON_ARIA_LABEL = i18n.translate('xpack.streams.sigEventsTab.flyout.closeAriaLabel', {
  defaultMessage: 'Close',
});
const STATUS_LABEL = i18n.translate('xpack.streams.sigEventsTab.flyout.statusLabel', {
  defaultMessage: 'Status',
});
const CRITICALITY_LABEL = i18n.translate('xpack.streams.sigEventsTab.flyout.criticalityLabel', {
  defaultMessage: 'Criticality',
});

interface SigEventFlyoutProps {
  event: SigEvent;
  onClose: () => void;
}

export const SigEventFlyout = ({ event, onClose }: SigEventFlyoutProps) => {
  const {
    services: { focusedSignificantEventService },
  } = useKibana();
  const {
    data: lifecycleData,
    isLoading: isLifecycleLoading,
    isError: isLifecycleError,
  } = useFetchEventLifecycle(event.event_id);

  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'sigEventFlyout' });

  useEffect(() => {
    focusedSignificantEventService.setFocusedEvent(event);

    return () => {
      focusedSignificantEventService.clearFocusedEvent(event.discovery_slug);
    };
  }, [event, focusedSignificantEventService]);

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
        <EuiFlexItem grow={false}>
          <EuiToolTip content={CLOSE_BUTTON_ARIA_LABEL} disableScreenReaderOutput>
            <EuiButtonIcon
              data-test-subj="streamsSigEventFlyoutCloseButton"
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
          {formatTimestamp(event['@timestamp'])}
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="s" responsive={false} wrap>
          <EuiFlexItem>
            <FlyoutMetadataCard title={STATUS_LABEL}>
              <EuiBadge color={getSigEventStatusColor(event.status)}>
                {SIG_EVENT_STATUS_LABELS[event.status]}
              </EuiBadge>
            </FlyoutMetadataCard>
          </EuiFlexItem>
          {event.criticality != null && (
            <EuiFlexItem>
              <FlyoutMetadataCard title={CRITICALITY_LABEL}>
                <EuiFlexGroup
                  gutterSize="xs"
                  alignItems="center"
                  responsive={false}
                  data-test-subj="streamsSigEventCriticalityBullseye"
                >
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="bullseye" size="s" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">{event.criticality}</EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </FlyoutMetadataCard>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="m">
          <SigEventDetails event={event} />

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
    </EuiFlyout>
  );
};
