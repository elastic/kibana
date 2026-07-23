/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiCallOut, EuiText } from '@elastic/eui';
import type { OAuthClient } from '@kbn/agent-builder-common';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { storageKeys } from '../../storage_keys';

const MAX_DISPLAY_NAMES = 5;

const bannerStyles = ({ euiTheme }: UseEuiTheme) => css`
  margin-block-end: ${euiTheme.size.base};
`;

const displayNamesStyles = css`
  /* EuiCallOut adds padding-inline-end to the first child. This overrides by forcing higher specificity. */
  &&&& {
    padding-inline-end: 0;
  }
`;

export interface McpClientsNotConnectedBannerProps {
  clients: OAuthClient[];
}

export const McpClientsNotConnectedBanner = ({ clients }: McpClientsNotConnectedBannerProps) => {
  const [dismissedClientIds = [], setDismissedClientIds] = useLocalStorage<string[]>(
    storageKeys.mcpClientBannerDismissedIds,
    []
  );

  const neverConnectedClients = useMemo(
    () =>
      clients.filter(
        (client) =>
          !client.revoked &&
          (client.connections?.active?.length ?? 0) === 0 &&
          (client.connections?.expired?.length ?? 0) === 0 &&
          (client.connections?.revoked?.length ?? 0) === 0
      ),
    [clients]
  );

  const hasUnseenNeverConnectedClient = useMemo(() => {
    const dismissedSet = new Set(dismissedClientIds);
    return neverConnectedClients.some((client) => !dismissedSet.has(client.id));
  }, [neverConnectedClients, dismissedClientIds]);

  const handleDismiss = useCallback(() => {
    setDismissedClientIds(neverConnectedClients.map((client) => client.id));
  }, [setDismissedClientIds, neverConnectedClients]);

  const displayNames = useMemo(
    () =>
      neverConnectedClients
        .filter((client) => client.client_name)
        .slice(0, MAX_DISPLAY_NAMES)
        .map((client) => client.client_name),
    [neverConnectedClients]
  );

  if (neverConnectedClients.length === 0 || !hasUnseenNeverConnectedClient) {
    return null;
  }

  const remainingCount = neverConnectedClients.length - MAX_DISPLAY_NAMES;

  return (
    <EuiCallOut
      size="m"
      color="primary"
      onDismiss={handleDismiss}
      data-test-subj="mcpClientsNotConnectedBanner"
      css={bannerStyles}
    >
      <FormattedMessage
        id="xpack.agentBuilder.mcpClients.notConnectedBanner.message"
        defaultMessage="{count, plural, one {The MCP client {names} is} other {The MCP clients {names}{remaining} are}} not yet connected."
        values={{
          count: neverConnectedClients.length,
          names: (
            <>
              {displayNames.map((name, index) => (
                <EuiText size="s" key={name} component="span" css={displayNamesStyles}>
                  <strong>{name}</strong>
                  {index < displayNames.length - 1 && ', '}
                </EuiText>
              ))}
            </>
          ),
          remaining:
            remainingCount > 0 ? (
              <FormattedMessage
                id="xpack.agentBuilder.mcpClients.notConnectedBanner.andMore"
                defaultMessage=" and {count} more,"
                values={{ count: remainingCount }}
              />
            ) : (
              ''
            ),
        }}
      />
    </EuiCallOut>
  );
};
