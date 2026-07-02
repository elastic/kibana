/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  type IconType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/react-hooks';
import { useKibana } from '../../../../../hooks/use_kibana';

interface App {
  id: string;
  name: string;
  icon: IconType;
  connected: boolean;
  // Marks the apps whose "Connect" button is wired to a real flow. Others render
  // a placeholder button until their flow is implemented.
  connector?: 'slack';
}

// App names are proper nouns and are intentionally not translated.
const APPS: App[] = [
  { id: 'slack', name: 'Slack', icon: 'logoSlack', connected: false, connector: 'slack' },
  { id: 'github', name: 'GitHub', icon: 'logoGithub', connected: false },
];

export const AppsPanel = () => {
  const {
    core: { notifications },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const { signal } = useAbortController();
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const handleConnectSlack = useCallback(async () => {
    setConnectingId('slack');
    try {
      const { authorizeUrl } = await streamsRepositoryClient.fetch(
        'POST /internal/streams/apps/slack/connect',
        { signal }
      );
      window.open(authorizeUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      notifications.toasts.addError(error instanceof Error ? error : new Error(String(error)), {
        title: i18n.translate(
          'xpack.streams.significantEventsDiscovery.settings.apps.connectErrorTitle',
          { defaultMessage: 'Failed to start the Slack connection' }
        ),
      });
    } finally {
      setConnectingId(null);
    }
  }, [notifications.toasts, signal, streamsRepositoryClient]);

  return (
    <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none" grow={false}>
      <EuiPanel hasShadow={false} color="subdued">
        <EuiText size="s">
          <h3>
            {i18n.translate('xpack.streams.significantEventsDiscovery.settings.apps.title', {
              defaultMessage: 'Apps',
            })}
          </h3>
        </EuiText>
      </EuiPanel>
      <EuiPanel hasShadow={false} hasBorder={false}>
        <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
          {APPS.map((app) => (
            <EuiFlexItem key={app.id} grow={false}>
              <EuiPanel hasBorder={true} hasShadow={false} paddingSize="m">
                <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiIcon type={app.icon} size="l" />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="s">
                          <strong>{app.name}</strong>
                          {!app.connector && (
                            <EuiText size="s" color="subdued">
                              {i18n.translate(
                                'xpack.streams.significantEventsDiscovery.settings.apps.disabledStatus',
                                { defaultMessage: 'Not available' }
                              )}
                            </EuiText>
                          )}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {app.connected ? (
                      <EuiText size="s" color="success">
                        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                          <EuiFlexItem grow={false}>
                            <EuiIcon type="check" />
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            {i18n.translate(
                              'xpack.streams.significantEventsDiscovery.settings.apps.connectedStatus',
                              { defaultMessage: 'Connected' }
                            )}
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiText>
                    ) : (
                      <EuiButton
                        size="s"
                        data-test-subj={`streams-settings-apps-connect-${app.id}`}
                        isLoading={connectingId === app.id}
                        onClick={app.connector === 'slack' ? handleConnectSlack : undefined}
                        disabled={!app.connector}
                      >
                        {i18n.translate(
                          'xpack.streams.significantEventsDiscovery.settings.apps.connectButton',
                          { defaultMessage: 'Connect' }
                        )}
                      </EuiButton>
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiPanel>
    </EuiPanel>
  );
};
