/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, type ContextType, type ReactNode } from 'react';
import { EuiThemeProvider, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { AppTheme } from '@kbn/custom-app-common';
import {
  getThemeModifications,
  hasThemeModifications,
  isThemeBound,
  resolveTheme,
} from '../theme/page_theme';
import { AppRuntimeContext } from '../runtime/app_runtime_context';
import { useSubjectValue } from '../utils/use_subject_value';

/** The accent of the page the component is in, for what is drawn by something other than EUI. */
const PageAccentContext = createContext<AppTheme['accent']>(undefined);

export const usePageAccent = (): AppTheme['accent'] => useContext(PageAccentContext);

/**
 * The room an app has inside its panel: breathing space all round, and a scroll of its own if
 * the content is taller than the panel, so nothing spills over the edge.
 *
 * A panel lays its content out with flexbox, where a child that does not ask for the width takes
 * only as much as its widest content. So the frame claims all of it, and what is stacked inside
 * is as wide as the panel, not as wide as its widest component.
 */
export const AppFrame = ({ children, theme }: { children: ReactNode; theme?: AppTheme }) =>
  isThemeBound(theme) ? (
    <FollowingFrame theme={theme}>{children}</FollowingFrame>
  ) : (
    <ThemedFrame theme={theme}>{children}</ThemedFrame>
  );

/** A frame whose accent is a value of the app, which is what a control of the app changes. */
const FollowingFrame = ({ children, theme }: { children: ReactNode; theme?: AppTheme }) => {
  const runtime = useContext(AppRuntimeContext);
  // Without an app around it there are no values, and the accent is the one the theme names.
  return runtime ? (
    <RuntimeFrame theme={theme} runtime={runtime}>
      {children}
    </RuntimeFrame>
  ) : (
    <ThemedFrame theme={resolveTheme(theme, {})} isFollowing>
      {children}
    </ThemedFrame>
  );
};

const RuntimeFrame = ({
  children,
  theme,
  runtime,
}: {
  children: ReactNode;
  theme?: AppTheme;
  runtime: NonNullable<ContextType<typeof AppRuntimeContext>>;
}) => {
  const values = useSubjectValue(runtime.state$);
  return (
    <ThemedFrame theme={resolveTheme(theme, values)} isFollowing>
      {children}
    </ThemedFrame>
  );
};

const ThemedFrame = ({
  children,
  theme,
  isFollowing = false,
}: {
  children: ReactNode;
  theme?: AppTheme;
  /** The theme reads values of the app, so it keeps its place in the tree while it has nothing yet. */
  isFollowing?: boolean;
}) => {
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
  return isFollowing || hasThemeModifications(theme) ? (
    <PageAccentContext.Provider value={theme?.accent}>
      <EuiThemeProvider modify={getThemeModifications(theme)} wrapperProps={{ cloneElement: true }}>
        {frame}
      </EuiThemeProvider>
    </PageAccentContext.Provider>
  ) : (
    frame
  );
};
