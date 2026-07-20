/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiCard,
  EuiCode,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { RELAY_APP_CONNECTION_STATUS } from '@kbn/significant-events-plugin/common';
import type { SlackChannelBinding } from '@kbn/significant-events-plugin/common';
import { useRelayAppConnection } from './use_relay_app_connection';
import { useRelayAppBindings } from './use_relay_app_bindings';

interface AppsSectionProps {
  canEdit: boolean;
}

/**
 * "Apps" section under Significant Events settings. Surfaces the Elastic
 * Slack App connect/disconnect flow for a single workspace.
 * Only rendered by the caller (`tab.tsx`) when the
 * `streams.significantEventsAppsEnabled` feature flag is on; additionally
 * renders nothing here when the Slack App is not available on this deployment
 * (`xpack.significant_events.relayService` unset, or Agent Builder absent).
 */
export function AppsSection({ canEdit }: AppsSectionProps) {
  const { isLoading, available, status, error, isMutating, connect, disconnect } =
    useRelayAppConnection();

  if (isLoading || !available) {
    return null;
  }

  return (
    <>
      <EuiSpacer />
      <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none" grow={false}>
        <EuiPanel hasShadow={false} color="subdued">
          <EuiText size="s">
            <h3>
              {i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.apps.sectionTitle',
                { defaultMessage: 'Apps' }
              )}
            </h3>
          </EuiText>
        </EuiPanel>
        <EuiPanel hasShadow={false} hasBorder={false}>
          <EuiFlexGroup direction="column" gutterSize="m" alignItems="flexStart">
            {status !== RELAY_APP_CONNECTION_STATUS.notConnected ? (
              <EuiFlexItem css={{ width: '100%', maxWidth: 800 }}>
                <SlackWorkspaceCard
                  status={status}
                  error={error}
                  canEdit={canEdit}
                  isMutating={isMutating}
                  onDisconnect={disconnect}
                />
              </EuiFlexItem>
            ) : (
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  fill
                  iconType="logoSlack"
                  onClick={connect}
                  isLoading={isMutating}
                  isDisabled={!canEdit || isMutating}
                  data-test-subj="streamsSlackAppConnectButton"
                >
                  {i18n.translate(
                    'xpack.streams.significantEventsDiscovery.settings.apps.slackConnect',
                    { defaultMessage: 'Connect Slack' }
                  )}
                </EuiButton>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPanel>
      </EuiPanel>
    </>
  );
}

interface SlackWorkspaceCardProps {
  status: string;
  error?: string;
  canEdit: boolean;
  isMutating: boolean;
  onDisconnect: () => void;
}

function SlackWorkspaceCard({
  status,
  error,
  canEdit,
  isMutating,
  onDisconnect,
}: SlackWorkspaceCardProps) {
  const [channelsOpen, setChannelsOpen] = useState(false);

  let statusBadge: React.ReactNode = null;
  let titleAction: React.ReactNode = null;
  let body: React.ReactNode = null;

  if (status === RELAY_APP_CONNECTION_STATUS.oauthInProgress) {
    statusBadge = (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {i18n.translate(
              'xpack.streams.significantEventsDiscovery.settings.apps.slackAwaitingAuth',
              { defaultMessage: 'Waiting for authorization…' }
            )}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
    titleAction = (
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
    );
  } else if (status === RELAY_APP_CONNECTION_STATUS.connected) {
    statusBadge = (
      <EuiBadge color="success" iconType="check">
        {i18n.translate('xpack.streams.significantEventsDiscovery.settings.apps.slackConnected', {
          defaultMessage: 'Connected',
        })}
      </EuiBadge>
    );
    body = channelsOpen ? <SlackConnectionBindings canEdit={canEdit} /> : null;
    const channelToggleLabel = channelsOpen
      ? i18n.translate(
          'xpack.streams.significantEventsDiscovery.settings.apps.slackHideChannels',
          { defaultMessage: 'Hide channels' }
        )
      : i18n.translate(
          'xpack.streams.significantEventsDiscovery.settings.apps.slackViewChannels',
          { defaultMessage: 'View channels' }
        );
    titleAction = (
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            fill={false}
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
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip disableScreenReaderOutput content={channelToggleLabel}>
            <EuiButtonIcon
              iconType={channelsOpen ? 'arrowUp' : 'arrowDown'}
              onClick={() => setChannelsOpen((open) => !open)}
              aria-label={channelToggleLabel}
              data-test-subj="streamsSlackAppViewChannelsButton"
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  } else {
    // error / not_connected
    statusBadge = (
      <EuiBadge color="danger">
        {i18n.translate('xpack.streams.significantEventsDiscovery.settings.apps.slackError', {
          defaultMessage: 'Error',
        })}
      </EuiBadge>
    );
    if (error) {
      body = <EuiCallOut announceOnMount size="s" color="danger" title={error} />;
    }
    titleAction = (
      <EuiButtonEmpty
        size="s"
        color="danger"
        onClick={onDisconnect}
        isDisabled={!canEdit || isMutating}
        data-test-subj="streamsSlackAppRemoveErrorButton"
      >
        {i18n.translate('xpack.streams.significantEventsDiscovery.settings.apps.slackRemoveError', {
          defaultMessage: 'Remove',
        })}
      </EuiButtonEmpty>
    );
  }

  return (
    <EuiCard
      display="subdued"
      textAlign="left"
      data-test-subj="streamsSlackAppCard"
      title={
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon
              type="logoSlack"
              size="m"
              title={i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.apps.slackIconTitle',
                { defaultMessage: 'Slack' }
              )}
            />
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiText size="s">
              <strong>
                {i18n.translate(
                  'xpack.streams.significantEventsDiscovery.settings.apps.slackWorkspaceTitle',
                  { defaultMessage: 'Elastic Slack App' }
                )}
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{statusBadge}</EuiFlexItem>
          <EuiFlexItem grow={false}>{titleAction}</EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      {body}
    </EuiCard>
  );
}

interface SlackConnectionBindingsProps {
  canEdit: boolean;
}

function SlackConnectionBindings({ canEdit }: SlackConnectionBindingsProps) {
  const { bindings, isLoading, isMutating, bindChannel, unbindChannel } = useRelayAppBindings(true);
  const [pendingUnbind, setPendingUnbind] = useState<SlackChannelBinding | null>(null);
  const unbindModalTitleId = useGeneratedHtmlId();

  const channelLabel = (binding: SlackChannelBinding) => {
    if (binding.isDefault) {
      return i18n.translate(
        'xpack.streams.significantEventsDiscovery.settings.apps.slackDefaultBinding',
        { defaultMessage: 'Default (all not bound channels are routed here)' }
      );
    }
    return binding.displayName != null ? `#${binding.displayName}` : binding.channel ?? '';
  };

  const columns = [
    {
      field: 'channel' as const,
      name: i18n.translate(
        'xpack.streams.significantEventsDiscovery.settings.apps.slackTableChannel',
        { defaultMessage: 'Channel' }
      ),
      render: (_: unknown, binding: SlackChannelBinding) => (
        <EuiText size="s">{channelLabel(binding)}</EuiText>
      ),
    },
    {
      field: 'status' as const,
      name: i18n.translate(
        'xpack.streams.significantEventsDiscovery.settings.apps.slackTableStatus',
        { defaultMessage: 'Status' }
      ),
      render: (_: unknown, binding: SlackChannelBinding) => {
        if (binding.status === 'bound_to_self') {
          return (
            <EuiBadge color="success">
              {i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.apps.slackStatusBound',
                { defaultMessage: 'Connected' }
              )}
            </EuiBadge>
          );
        }
        if (binding.status === 'not_bound') {
          return (
            <EuiBadge color="hollow">
              {i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.apps.slackStatusNotBound',
                { defaultMessage: 'Not bound' }
              )}
            </EuiBadge>
          );
        }
        // bound_to_other_target
        return (
          <EuiToolTip
            content={i18n.translate(
              'xpack.streams.significantEventsDiscovery.settings.apps.slackChannelUnavailableTooltip',
              { defaultMessage: 'Bound to another deployment' }
            )}
          >
            <EuiBadge
              tabIndex={0}
              color="hollow"
              data-test-subj="streamsSlackAppChannelUnavailableBadge"
            >
              {i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.apps.slackChannelUnavailable',
                { defaultMessage: 'Unavailable' }
              )}
            </EuiBadge>
          </EuiToolTip>
        );
      },
    },
    {
      field: 'actions' as const,
      name: i18n.translate(
        'xpack.streams.significantEventsDiscovery.settings.apps.slackTableActions',
        { defaultMessage: 'Actions' }
      ),
      width: '100px',
      render: (_: unknown, binding: SlackChannelBinding) => {
        if (binding.isDefault || binding.status === 'bound_to_other_target') {
          return null;
        }
        if (binding.status === 'not_bound') {
          return (
            <EuiButtonEmpty
              size="s"
              iconType="plusInCircle"
              isDisabled={!canEdit || isMutating}
              isLoading={isMutating}
              onClick={() => binding.channel != null && bindChannel(binding.channel)}
              data-test-subj="streamsSlackAppBindChannelButton"
            >
              {i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.apps.slackBindChannel',
                { defaultMessage: 'Bind' }
              )}
            </EuiButtonEmpty>
          );
        }
        // bound_to_self
        return (
          <EuiButtonEmpty
            size="s"
            color="danger"
            isDisabled={!canEdit || isMutating}
            isLoading={isMutating}
            onClick={() => setPendingUnbind(binding)}
            data-test-subj="streamsSlackAppUnbindChannelButton"
          >
            {i18n.translate(
              'xpack.streams.significantEventsDiscovery.settings.apps.slackUnbindChannel',
              { defaultMessage: 'Unbind' }
            )}
          </EuiButtonEmpty>
        );
      },
    },
  ];

  return (
    <>
      <EuiCallOut
        size="s"
        iconType="iInCircle"
        color="primary"
        data-test-subj="streamsSlackAppChannelsCallout"
      >
        <EuiText size="s">
          <FormattedMessage
            id="xpack.streams.significantEventsDiscovery.settings.apps.slackChannelsCallout"
            defaultMessage="Only channels you have invited {botName} to appear here. In Slack, type {command} in a channel to make it connectable, then bind it to a deployment."
            values={{
              botName: <strong>{'@Elastic'}</strong>,
              command: <EuiCode>{'/invite @Elastic'}</EuiCode>,
            }}
          />
        </EuiText>
      </EuiCallOut>
      <EuiSpacer size="s" />
      <EuiBasicTable
        css={{ width: '100%' }}
        items={bindings}
        columns={columns}
        loading={isLoading}
        noItemsMessage={
          <EuiText size="xs" color="subdued">
            {i18n.translate(
              'xpack.streams.significantEventsDiscovery.settings.apps.slackNoChannels',
              { defaultMessage: 'No channels' }
            )}
          </EuiText>
        }
        tableLayout="auto"
        tableCaption={i18n.translate(
          'xpack.streams.significantEventsDiscovery.settings.apps.slackChannelsTableCaption',
          { defaultMessage: 'Slack channels bound to this deployment' }
        )}
      />
      {pendingUnbind != null && (
        <EuiConfirmModal
          title={i18n.translate(
            'xpack.streams.significantEventsDiscovery.settings.apps.slackUnbindConfirmTitle',
            {
              defaultMessage: 'Unbind {channel}?',
              values: {
                channel:
                  pendingUnbind.displayName != null
                    ? `#${pendingUnbind.displayName}`
                    : pendingUnbind.channel ?? '',
              },
            }
          )}
          onCancel={() => setPendingUnbind(null)}
          onConfirm={() => {
            if (pendingUnbind.channel != null) {
              unbindChannel(pendingUnbind.channel).finally(() => setPendingUnbind(null));
            } else {
              setPendingUnbind(null);
            }
          }}
          cancelButtonText={i18n.translate(
            'xpack.streams.significantEventsDiscovery.settings.apps.slackUnbindConfirmCancel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.streams.significantEventsDiscovery.settings.apps.slackUnbindConfirmConfirm',
            { defaultMessage: 'Unbind' }
          )}
          buttonColor="danger"
          aria-labelledby={unbindModalTitleId}
          titleProps={{ id: unbindModalTitleId }}
          data-test-subj="streamsSlackAppUnbindConfirmModal"
        >
          <EuiText size="s">
            {i18n.translate(
              'xpack.streams.significantEventsDiscovery.settings.apps.slackUnbindConfirmBody',
              {
                defaultMessage:
                  'This will stop routing Slack messages for this channel to this deployment.',
              }
            )}
          </EuiText>
        </EuiConfirmModal>
      )}
    </>
  );
}
