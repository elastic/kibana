/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import { EuiThemeProvider, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { AppTheme } from '@kbn/custom-app-common';
import { getThemeModifications, hasThemeModifications } from '../theme/page_theme';

/**
 * The room an app has inside its panel: breathing space all round, and a scroll of its own if
 * the content is taller than the panel, so nothing spills over the edge.
 *
 * A panel lays its content out with flexbox, where a child that does not ask for the width takes
 * only as much as its widest content. So the frame claims all of it, and what is stacked inside
 * is as wide as the panel, not as wide as its widest component.
 */
export const AppFrame = ({ children, theme }: { children: ReactNode; theme?: AppTheme }) => {
  const { euiTheme } = useEuiTheme();

  const frame = (
    <div
      data-test-subj="customAppFrame"
      css={css({
        flex: '1 1 100%',
        width: '100%',
        minWidth: 0,
        height: '100%',
        overflowY: 'auto',
        padding: euiTheme.size.base,
      })}
    >
      {children}
    </div>
  );

  // The theme of the page changes what is inside the frame, and nothing outside it.
  return hasThemeModifications(theme) ? (
    <EuiThemeProvider modify={getThemeModifications(theme)} wrapperProps={{ cloneElement: true }}>
      {frame}
    </EuiThemeProvider>
  ) : (
    frame
  );
};
