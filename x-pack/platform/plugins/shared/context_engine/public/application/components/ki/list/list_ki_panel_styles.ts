/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemo } from 'react';

/** Under this width the list and the viewer stack in one column. */
const KNOWLEDGE_DOCUMENTS_NARROW_BREAKPOINT = '1100px';
const narrowMedia = `@media (max-width: ${KNOWLEDGE_DOCUMENTS_NARROW_BREAKPOINT})`;

/** Space the list keeps for the page header, tabs and filters above it. */
const LIST_MAX_HEIGHT = 'calc(100vh - 300px)';

export const useListKiPanelStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(
    () => ({
      panel: css({
        borderRadius: euiTheme.border.radius.panel,
      }),
      split: css({
        display: 'grid',
        gridTemplateColumns: 'minmax(300px, 380px) minmax(0, 1fr)',
        gap: euiTheme.size.base,
        alignItems: 'start',
        marginTop: euiTheme.size.base,
        [narrowMedia]: {
          gridTemplateColumns: 'minmax(0, 1fr)',
        },
      }),
      list: css({
        // Rows measure their offset from the list (scroll the selected row into view).
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: euiTheme.colors.backgroundBasePlain,
        border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
        borderRadius: euiTheme.border.radius.panel,
        overflowY: 'auto',
        maxHeight: LIST_MAX_HEIGHT,
        [narrowMedia]: {
          maxHeight: 'none',
        },
      }),
      viewerColumn: css({
        position: 'sticky',
        top: `calc(var(--euiFixedHeadersOffset, 0px) + ${euiTheme.size.base})`,
        minWidth: 0,
        [narrowMedia]: {
          position: 'static',
        },
      }),
    }),
    [euiTheme]
  );
};
