/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiLiveAnnouncer, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { PendingConnection } from './canvas_connection_highlight';

const getTipMessage = (
  connection: PendingConnection | null,
  shownNodeIds: ReadonlySet<string> | undefined
): string | undefined => {
  if (!connection) {
    return undefined;
  }
  const { targetIds } = connection;
  const hasShownTarget = [...targetIds].some((id) => shownNodeIds?.has(id) ?? true);
  if (hasShownTarget) {
    return i18n.translate('xpack.streams.canvas.connectionTip.someTargetsDescription', {
      defaultMessage:
        "Connect to another node that is not faded. Faded nodes share no signal with this one, already receive its data, or can't take this kind of connection.",
    });
  }
  if (targetIds.size > 0) {
    return i18n.translate('xpack.streams.canvas.connectionTip.targetsHiddenBySearchDescription', {
      defaultMessage:
        'No node in your search results can take this connection. Clear the search to see the nodes that can.',
    });
  }
  return i18n.translate('xpack.streams.canvas.connectionTip.noTargetsDescription', {
    defaultMessage:
      "No node can take this connection. Faded nodes share no signal with this one, already receive its data, or can't take this kind of connection.",
  });
};

interface CanvasConnectionTipProps {
  connection: PendingConnection | null;
  /** Nodes the Map search shows, or `undefined` while no search is active. */
  shownNodeIds?: ReadonlySet<string>;
}

/** Floating top-center tip shown only while a line is dragged on the Map. */
export function CanvasConnectionTip({ connection, shownNodeIds }: CanvasConnectionTipProps) {
  const { euiTheme } = useEuiTheme();
  const message = getTipMessage(connection, shownNodeIds);

  return (
    <>
      {/* The panel is hidden from screen readers, so the live region is the only announcement. */}
      <EuiLiveAnnouncer>{message ?? ''}</EuiLiveAnnouncer>
      {message && (
        <EuiPanel
          color="primary"
          paddingSize="s"
          aria-hidden={true}
          data-test-subj="streamsCanvasConnectionTip"
          css={css`
            position: absolute;
            top: ${euiTheme.size.l};
            left: 50%;
            transform: translateX(-50%);
            z-index: ${euiTheme.levels.menu};
            inline-size: max-content;
            max-inline-size: calc(100% - 2 * ${euiTheme.size.l});
            border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePrimary};
            text-align: center;
            pointer-events: none;
          `}
        >
          <EuiText size="s">{message}</EuiText>
        </EuiPanel>
      )}
    </>
  );
}
