/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemo } from 'react';

/** Viewport minus fixed chrome (nav, subpage header, tabs), framed app gap and section padding. */
const KI_GRAPH_PANEL_HEIGHT = 'calc(100vh - var(--euiFixedHeadersOffset, 0px) - 14.25rem)';
const KI_GRAPH_CANVAS_MIN_HEIGHT = 'min(480px, 55vh)';

export const useKiGraphStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(
    () => ({
      panel: css({
        borderRadius: euiTheme.border.radius.panel,
      }),
      panelFill: css({
        display: 'flex',
        flexDirection: 'column',
        height: KI_GRAPH_PANEL_HEIGHT,
        minHeight: KI_GRAPH_CANVAS_MIN_HEIGHT,
      }),
      canvasShell: css({
        position: 'relative',
        flex: 1,
        minHeight: 0,
        width: '100%',
        background: euiTheme.colors.backgroundBaseSubdued,
        border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
        borderRadius: euiTheme.border.radius.panel,
        overflow: 'hidden',
        '& .react-flow__minimap-svg': {
          margin: 4,
          width: 'calc(100% - 8px)',
          height: 'calc(100% - 8px)',
        },
      }),
      canvasInner: css({
        width: '100%',
        height: '100%',
      }),
      skeleton: css({
        width: '100%',
        flex: 1,
        minHeight: 0,
      }),
      truncatedCallout: css({
        flexShrink: 0,
        padding: euiTheme.size.m,
        paddingBottom: 0,
      }),
    }),
    [euiTheme]
  );
};
