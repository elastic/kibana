/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldSearch,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelect,
  EuiSelectable,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import type { ViewSpec } from '@kbn/adaptive-ui';
import {
  loadSlackChannels,
  postViewToSlack,
  type SlackChannel,
  type SlackConnector,
} from './slack_client';

const TITLE = i18n.translate('xpack.adaptiveUi.share.slack.modalTitle', {
  defaultMessage: 'Send to Slack',
});

const CANCEL = i18n.translate('xpack.adaptiveUi.share.slack.cancel', {
  defaultMessage: 'Cancel',
});

const SEND = i18n.translate('xpack.adaptiveUi.share.slack.send', { defaultMessage: 'Send' });

const CONNECTOR_LABEL = i18n.translate('xpack.adaptiveUi.share.slack.connectorLabel', {
  defaultMessage: 'Connector',
});

const CHANNEL_LABEL = i18n.translate('xpack.adaptiveUi.share.slack.channelLabel', {
  defaultMessage: 'Channel',
});

const FILTER_PLACEHOLDER = i18n.translate('xpack.adaptiveUi.share.slack.filterPlaceholder', {
  defaultMessage: 'Filter channels',
});

const TRUNCATED = i18n.translate('xpack.adaptiveUi.share.slack.truncated', {
  defaultMessage:
    'Showing the first channels the connector returned. Filter by name to narrow the list.',
});

const CHANNEL_HELP = i18n.translate('xpack.adaptiveUi.share.slack.channelHelp', {
  defaultMessage:
    'Public channels only. Posting to one the connector has not joined needs the chat:write.public scope on the Slack app.',
});

const SEND_FAILURE = i18n.translate('xpack.adaptiveUi.share.slack.sendFailure', {
  defaultMessage: 'Could not send this view to Slack',
});

const CHART_SCOPE_NOTE = i18n.translate('xpack.adaptiveUi.share.slack.chartScopeNote', {
  defaultMessage:
    'Charts post as images, which needs the connector’s files:write scope. Without it they fall back to their text form.',
});

const sentToast = (channelName: string) =>
  i18n.translate('xpack.adaptiveUi.share.slack.sent', {
    defaultMessage: 'View sent to {channel}',
    values: { channel: channelName },
  });

export interface SlackShareModalProps {
  spec: ViewSpec;
  connectors: SlackConnector[];
  core: CoreStart;
  onClose: () => void;
}

export const SlackShareModal: React.FC<SlackShareModalProps> = ({
  spec,
  connectors,
  core,
  onClose,
}) => {
  const [connectorId, setConnectorId] = useState(connectors[0].id);
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [filter, setFilter] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<SlackChannel | undefined>();
  const [isSending, setIsSending] = useState(false);

  const { http, notifications } = core;

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setLoadError(undefined);
    setSelectedChannel(undefined);

    loadSlackChannels(http, connectorId).then(
      (result) => {
        if (!cancelled) {
          setChannels(result.channels);
          setTruncated(result.truncated);
          setIsLoading(false);
        }
      },
      (error: Error) => {
        if (!cancelled) {
          setLoadError(error.message);
          setIsLoading(false);
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [http, connectorId]);

  // `listChannels` also reports `is_member`, deliberately unused: the connector's
  // OAuth flow requests user scopes, so the flag can describe the authed user
  // rather than the identity that posts, and `chat:write.public` lets an app post
  // to a public channel it never joined. Neither ordering nor gating on it holds.
  const options = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return channels
      .filter(({ name }) => !needle || name.toLowerCase().includes(needle))
      .map(({ id, name }) => ({
        label: `#${name}`,
        key: id,
        checked: selectedChannel?.id === id ? ('on' as const) : undefined,
      }));
  }, [channels, filter, selectedChannel]);

  const send = useCallback(async () => {
    if (!selectedChannel) {
      return;
    }
    setIsSending(true);
    try {
      await postViewToSlack(http, { connectorId, channel: selectedChannel.id, spec });
      notifications.toasts.addSuccess(sentToast(`#${selectedChannel.name}`));
      onClose();
    } catch (error) {
      notifications.toasts.addError(error as Error, { title: SEND_FAILURE });
    } finally {
      setIsSending(false);
    }
  }, [selectedChannel, http, connectorId, spec, notifications, onClose]);

  return (
    <EuiModal onClose={onClose} aria-label={TITLE} data-test-subj="adaptiveUiSlackModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>{TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {connectors.length > 1 && (
          <EuiFormRow label={CONNECTOR_LABEL} fullWidth>
            <EuiSelect
              fullWidth
              data-test-subj="adaptiveUiSlackConnectorSelect"
              options={connectors.map(({ id, name }) => ({ value: id, text: name }))}
              value={connectorId}
              onChange={(event) => setConnectorId(event.target.value)}
            />
          </EuiFormRow>
        )}
        <EuiFormRow label={CHANNEL_LABEL} helpText={CHANNEL_HELP} fullWidth>
          <>
            <EuiFieldSearch
              fullWidth
              placeholder={FILTER_PLACEHOLDER}
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              data-test-subj="adaptiveUiSlackChannelFilter"
            />
            <EuiSpacer size="s" />
            {isLoading ? (
              <EuiLoadingSpinner size="m" data-test-subj="adaptiveUiSlackChannelsLoading" />
            ) : loadError ? (
              <EuiCallOut announceOnMount color="danger" size="s" title={loadError} />
            ) : (
              <EuiSelectable
                singleSelection="always"
                options={options}
                onChange={(next) => {
                  const picked = next.find(({ checked }) => checked === 'on');
                  setSelectedChannel(channels.find(({ id }) => id === picked?.key));
                }}
                listProps={{ bordered: true }}
                height={240}
                aria-label={CHANNEL_LABEL}
                data-test-subj="adaptiveUiSlackChannelList"
              >
                {(list) => list}
              </EuiSelectable>
            )}
          </>
        </EuiFormRow>
        {truncated && (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut announceOnMount color="warning" size="s" title={TRUNCATED} />
          </>
        )}
        <EuiSpacer size="s" />
        <EuiCallOut color="primary" size="s" title={CHART_SCOPE_NOTE} />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>{CANCEL}</EuiButtonEmpty>
        <EuiButton
          fill
          isLoading={isSending}
          isDisabled={!selectedChannel || isSending}
          onClick={() => {
            void send();
          }}
          data-test-subj="adaptiveUiSlackSend"
        >
          {SEND}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
