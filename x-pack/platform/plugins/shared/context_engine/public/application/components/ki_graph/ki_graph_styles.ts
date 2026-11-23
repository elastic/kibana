/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemo } from 'react';

const KI_GRAPH_NARROW_BREAKPOINT = '1100px';
const narrowMedia = `@media (max-width: ${KI_GRAPH_NARROW_BREAKPOINT})`;

const KI_GRAPH_CANVAS_HEIGHT = 'calc(100vh - 300px)';
const KI_GRAPH_CANVAS_MIN_HEIGHT = '420px';

export const useKiGraphStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(
    () => ({
      panel: css({
        borderRadius: euiTheme.border.radius.panel,
      }),
      split: css({
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 380px)',
        gap: euiTheme.size.base,
        alignItems: 'start',
        marginTop: euiTheme.size.m,
        [narrowMedia]: {
          gridTemplateColumns: 'minmax(0, 1fr)',
        },
      }),
      canvasColumn: css({
        minWidth: 0,
      }),
      canvasShell: css({
        position: 'relative',
        width: '100%',
        height: KI_GRAPH_CANVAS_HEIGHT,
        minHeight: KI_GRAPH_CANVAS_MIN_HEIGHT,
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
      viewerColumn: css({
        position: 'sticky',
        top: `calc(var(--euiFixedHeadersOffset, 0px) + ${euiTheme.size.base})`,
        minWidth: 0,
        [narrowMedia]: {
          position: 'static',
          order: -1,
        },
      }),
      skeleton: css({
        width: '100%',
        height: KI_GRAPH_CANVAS_HEIGHT,
        minHeight: KI_GRAPH_CANVAS_MIN_HEIGHT,
      }),
      truncatedCallout: css({
        marginBottom: euiTheme.size.m,
      }),
    }),
    [euiTheme]
  );
};
