/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RELAY_APP_CONNECTION_STATUS } from '@kbn/significant-events-plugin/common';
import { useRelayAppConnection } from './use_relay_app_connection';

interface AppsSectionProps {
  canEdit: boolean;
}

/**
 * "Apps" section under Significant Events settings. Currently surfaces the Elastic
 * Slack App connect/disconnect flow; the section is structured to hold additional
 * external apps (GitHub, Teams) in the future. Only rendered by the caller (`tab.tsx`)
 * when the `streams.significantEventsAppsEnabled` feature flag is on; additionally
 * renders nothing here when the Slack App is not available on this deployment
 * (`xpack.significant_events.relayService` unset, or Agent Builder absent).
 */
export function AppsSection({ canEdit }: AppsSectionProps) {
  const { isLoading, available, status, error, isMutating, connect, disconnect } =
    useRelayAppConnection();

  if (isLoading || !available) {
    return null;
  }

  const isConnected = status === RELAY_APP_CONNECTION_STATUS.connected;
  const isInProgress = status === RELAY_APP_CONNECTION_STATUS.oauthInProgress;

  return (
    <>
      <EuiSpacer />
      <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none" grow={false}>
        <EuiPanel hasShadow={false} color="subdued">
          <EuiText size="s">
            <h3>
              {i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.apps.sectionTitle',
                {
                  defaultMessage: 'Apps',
                }
              )}
            </h3>
          </EuiText>
        </EuiPanel>
        <EuiPanel hasShadow={false} hasBorder={false}>
          <EuiFlexGroup gutterSize="l" wrap>
            <EuiFlexItem grow={false} css={{ minWidth: 320 }}>
              <EuiCard
                display="subdued"
                textAlign="left"
                icon={<EuiIcon type="logoSlack" size="xl" />}
                data-test-subj="streamsSlackAppCard"
                title={i18n.translate(
                  'xpack.streams.significantEventsDiscovery.settings.apps.slackCardTitle',
                  { defaultMessage: 'Elastic Slack App' }
                )}
                description={i18n.translate(
                  'xpack.streams.significantEventsDiscovery.settings.apps.slackCardDescription',
                  {
                    defaultMessage:
                      'Send Significant Event notifications to Slack and invoke Elastic agents from a channel.',
                  }
                )}
                footer={
                  <SlackCardFooter
                    canEdit={canEdit}
                    isConnected={isConnected}
                    isInProgress={isInProgress}
                    isMutating={isMutating}
                    error={error}
                    onConnect={connect}
                    onDisconnect={disconnect}
                  />
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiPanel>
    </>
  );
}

interface SlackCardFooterProps {
  canEdit: boolean;
  isConnected: boolean;
  isInProgress: boolean;
  isMutating: boolean;
  error?: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

function SlackCardFooter({
  canEdit,
  isConnected,
  isInProgress,
  isMutating,
  error,
  onConnect,
  onDisconnect,
}: SlackCardFooterProps) {
  if (isInProgress) {
    return (
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="s" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {i18n.translate(
                  'xpack.streams.significantEventsDiscovery.settings.apps.slackAwaitingAuth',
                  { defaultMessage: 'Waiting for Slack authorization…' }
                )}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            color="danger"
            onClick={onDisconnect}
            isDisabled={!canEdit || isMutating}
            data-test-subj="streamsSlackAppCancelButton"
          >
            {i18n.translate('xpack.streams.significantEventsDiscovery.settings.apps.slackCancel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (isConnected) {
    return (
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
        <EuiFlexItem grow={false}>
          <EuiBadge color="success" iconType="check">
            {i18n.translate(
              'xpack.streams.significantEventsDiscovery.settings.apps.slackConnected',
              {
                defaultMessage: 'Connected',
              }
            )}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            color="danger"
            onClick={onDisconnect}
            isLoading={isMutating}
            isDisabled={!canEdit || isMutating}
            data-test-subj="streamsSlackAppDisconnectButton"
          >
            {i18n.translate(
              'xpack.streams.significantEventsDiscovery.settings.apps.slackDisconnect',
              { defaultMessage: 'Disconnect' }
            )}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
      {error && (
        <EuiFlexItem grow={false}>
          <EuiCallOut size="s" color="danger" title={error} />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          fill
          onClick={onConnect}
          isLoading={isMutating}
          isDisabled={!canEdit || isMutating}
          data-test-subj="streamsSlackAppConnectButton"
        >
          {i18n.translate('xpack.streams.significantEventsDiscovery.settings.apps.slackConnect', {
            defaultMessage: 'Connect Slack',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
