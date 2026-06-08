/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';

type SlackConnectionStatus = 'connected' | 'disconnected' | 'not_connected';

interface SlackStatusResponse {
  status: SlackConnectionStatus;
  connected_at?: string;
}

export const SlackOnboardingPage: React.FC = () => {
  const { services } = useKibana<CoreStart>();
  const [slackStatus, setSlackStatus] = useState<SlackStatusResponse | null>(null);
  const [slackStatusLoading, setSlackStatusLoading] = useState(true);

  // Slack user linking state
  const [slackUserId, setSlackUserId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('link_slack') ?? '';
  });
  const [linkStatus, setLinkStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    services.http
      .get<SlackStatusResponse>('/internal/elastic_console/slack/status')
      .then(setSlackStatus)
      .catch(() => setSlackStatus(null))
      .finally(() => setSlackStatusLoading(false));
  }, [services.http]);

  const handleLinkSlack = useCallback(async () => {
    if (!slackUserId.trim()) return;
    setLinkStatus('idle');
    setLinkError(null);
    try {
      await services.http.post('/internal/elastic_console/slack/link_user', {
        body: JSON.stringify({ slack_user_id: slackUserId.trim() }),
      });
      setLinkStatus('success');
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Failed to link account');
      setLinkStatus('error');
    }
  }, [services.http, slackUserId]);

  const slackStatusBadge = slackStatusLoading ? (
    <EuiLoadingSpinner size="s" />
  ) : slackStatus?.status === 'connected' ? (
    <EuiBadge color="success">Slack: Connected</EuiBadge>
  ) : slackStatus?.status === 'disconnected' ? (
    <EuiBadge color="danger">Slack: Disconnected</EuiBadge>
  ) : null;

  const handleConnectSlack = useCallback(async () => {
    const { url } = await services.http.get<{ url: string }>(
      '/internal/elastic_console/slack/connect'
    );
    window.location.href = url;
  }, [services.http]);

  const handleDisconnectSlack = useCallback(async () => {
    try {
      await services.http.delete('/internal/elastic_console/slack/disconnect');
      setSlackStatus({ status: 'not_connected' });
    } catch (err) {
      // Best-effort — status will reflect reality on next load
    }
  }, [services.http]);

  return (
    <>
      {/* Slack connection status badge */}
      {slackStatusBadge && (
        <>
          {slackStatusBadge}
          <EuiSpacer size="m" />
        </>
      )}

      {/* ── Connect Slack ── */}
      <EuiTitle size="s">
        <h2>Connect Slack</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <p>Authorise the Slack bot so your team can interact with the AI assistant from Slack.</p>
      </EuiText>
      <EuiSpacer />

      {slackStatusLoading ? (
        <EuiLoadingSpinner size="m" />
      ) : slackStatus?.status === 'connected' ? (
        <>
          <EuiCallOut title="Slack is connected" color="success" iconType="check">
            {slackStatus.connected_at && (
              <p>Connected since {new Date(slackStatus.connected_at).toLocaleString()}.</p>
            )}
          </EuiCallOut>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="logoSlack" size="s" onClick={handleConnectSlack}>
                Reconnect
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="unlink"
                size="s"
                color="danger"
                onClick={handleDisconnectSlack}
              >
                Disconnect
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : slackStatus?.status === 'disconnected' ? (
        <>
          <EuiCallOut
            title="Slack connection lost — API key revoked or expired"
            color="danger"
            iconType="warning"
          >
            <p>
              Slack events can no longer be forwarded to Kibana. Reconnect to generate a new API
              key.
              {slackStatus.connected_at && (
                <> Last connected: {new Date(slackStatus.connected_at).toLocaleString()}.</>
              )}
            </p>
          </EuiCallOut>
          <EuiSpacer />
          <EuiButton iconType="logoSlack" color="danger" onClick={handleConnectSlack}>
            Reconnect Slack
          </EuiButton>
        </>
      ) : (
        <EuiButton iconType="logoSlack" fill onClick={handleConnectSlack}>
          Connect Slack
        </EuiButton>
      )}

      <EuiHorizontalRule />

      {/* ── Link Slack Account ── */}
      <EuiTitle size="s">
        <h2>Link Slack Account</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <p>
          Link your Slack user ID to this Kibana account so conversations started in Slack appear in
          Agent Builder. Your Slack user ID is shown in the bot&apos;s first message when you chat
          with it.
        </p>
      </EuiText>
      <EuiSpacer />

      {linkStatus === 'success' && (
        <>
          <EuiCallOut title="Slack account linked" color="success" iconType="check">
            <p>
              Slack user <strong>{slackUserId}</strong> is now linked to your Kibana account. Future
              conversations from Slack will appear in Agent Builder.
            </p>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
      {linkStatus === 'error' && (
        <>
          <EuiCallOut title="Link failed" color="danger" iconType="error">
            <p>{linkError}</p>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}

      <EuiFlexGroup alignItems="flexEnd" gutterSize="m">
        <EuiFlexItem>
          <EuiFormRow label="Slack User ID" fullWidth>
            <EuiFieldText
              placeholder="e.g. U0123456789"
              value={slackUserId}
              onChange={(e) => setSlackUserId(e.target.value)}
              fullWidth
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace>
            <EuiButton
              onClick={handleLinkSlack}
              isDisabled={!slackUserId.trim() || linkStatus === 'success'}
            >
              Link account
            </EuiButton>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
