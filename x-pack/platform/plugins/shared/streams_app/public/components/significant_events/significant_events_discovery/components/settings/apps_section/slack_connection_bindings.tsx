/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiCallOut,
  EuiCode,
  EuiConfirmModal,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SlackChannelBinding } from '@kbn/significant-events-plugin/common';
import { useRelayAppBindings, useBindChannel, useUnbindChannel } from './use_relay_app_bindings';

const channelLabel = (binding: SlackChannelBinding) =>
  binding.displayName != null ? `#${binding.displayName}` : binding.channel ?? '';

interface SlackConnectionBindingsProps {
  canEdit: boolean;
}

export function SlackConnectionBindings({ canEdit }: SlackConnectionBindingsProps) {
  const { bindings, isLoading } = useRelayAppBindings(true);
  const [searchValue, setSearchValue] = useState('');

  const filteredBindings = useMemo(() => {
    const term = searchValue.trim().toLowerCase();
    if (!term) return bindings;
    return bindings.filter((b) => channelLabel(b).toLowerCase().includes(term));
  }, [bindings, searchValue]);

  const columns = useMemo(
    () => [
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
              <EuiBadge color="primary">
                {i18n.translate(
                  'xpack.streams.significantEventsDiscovery.settings.apps.slackStatusNotBound',
                  { defaultMessage: 'Invited - not Connected' }
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
                color="default"
                data-test-subj="streamsSlackAppChannelUnavailableBadge"
              >
                {i18n.translate(
                  'xpack.streams.significantEventsDiscovery.settings.apps.slackChannelUnavailable',
                  { defaultMessage: 'Connected to another Kibana' }
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
        render: (_: unknown, binding: SlackChannelBinding) => (
          <BindingActionCell binding={binding} canEdit={canEdit} />
        ),
      },
    ],
    [canEdit]
  );

  return (
    <>
      <EuiCallOut
        size="s"
        iconType="info"
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
      <EuiSpacer size="l" />
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem>
          <EuiFieldSearch
            incremental
            isClearable
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={i18n.translate(
              'xpack.streams.significantEventsDiscovery.settings.apps.slackChannelSearchPlaceholder',
              { defaultMessage: 'Search channels' }
            )}
            aria-label={i18n.translate(
              'xpack.streams.significantEventsDiscovery.settings.apps.slackChannelSearchAriaLabel',
              { defaultMessage: 'Search Slack channels' }
            )}
            data-test-subj="streamsSlackAppChannelSearch"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued" data-test-subj="streamsSlackAppChannelCounts">
            {i18n.translate(
              'xpack.streams.significantEventsDiscovery.settings.apps.slackChannelCounts',
              {
                defaultMessage: '{total} channels · {connectable} connectable',
                values: {
                  total: bindings.length,
                  connectable: bindings.filter((b) => b.status === 'not_bound').length,
                },
              }
            )}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiBasicTable
        css={{ width: '100%' }}
        items={filteredBindings}
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
    </>
  );
}

interface BindingActionCellProps {
  binding: SlackChannelBinding;
  canEdit: boolean;
}

function BindingActionCell({ binding, canEdit }: BindingActionCellProps) {
  const { bind, isLoading: isBinding } = useBindChannel();
  const { unbind, isLoading: isUnbinding } = useUnbindChannel();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const modalTitleId = useGeneratedHtmlId();

  if (binding.status === 'bound_to_other_target') {
    return null;
  }

  if (binding.status === 'not_bound') {
    return (
      <EuiButton
        size="s"
        isDisabled={!canEdit || isBinding}
        isLoading={isBinding}
        onClick={() => binding.channel != null && bind(binding.channel)}
        data-test-subj="streamsSlackAppBindChannelButton"
      >
        {i18n.translate('xpack.streams.significantEventsDiscovery.settings.apps.slackBindChannel', {
          defaultMessage: 'Connect',
        })}
      </EuiButton>
    );
  }

  // bound_to_self
  const channelName = channelLabel(binding);

  return (
    <>
      <EuiButton
        size="s"
        color="danger"
        isDisabled={!canEdit || isUnbinding}
        isLoading={isUnbinding}
        onClick={() => setConfirmOpen(true)}
        data-test-subj="streamsSlackAppUnbindChannelButton"
      >
        {i18n.translate(
          'xpack.streams.significantEventsDiscovery.settings.apps.slackUnbindChannel',
          { defaultMessage: 'Disconnect' }
        )}
      </EuiButton>
      {confirmOpen && (
        <EuiConfirmModal
          title={i18n.translate(
            'xpack.streams.significantEventsDiscovery.settings.apps.slackUnbindConfirmTitle',
            { defaultMessage: 'Disconnect {channel}?', values: { channel: channelName } }
          )}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            if (binding.channel != null) {
              unbind(binding.channel).finally(() => setConfirmOpen(false));
            } else {
              setConfirmOpen(false);
            }
          }}
          cancelButtonText={i18n.translate(
            'xpack.streams.significantEventsDiscovery.settings.apps.slackUnbindConfirmCancel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.streams.significantEventsDiscovery.settings.apps.slackUnbindConfirmConfirm',
            { defaultMessage: 'Disconnect' }
          )}
          buttonColor="danger"
          aria-labelledby={modalTitleId}
          titleProps={{ id: modalTitleId }}
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
