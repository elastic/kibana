/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { ScopedHistory } from '@kbn/core/public';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { useKibana } from './use_kibana';

/**
 * `block` callbacks get the parent-level pathname, `history.location` the scoped one. createHref
 * brings both to the same form. It runs per transition because every push moves the location.
 */
const isCurrentPage = (history: ScopedHistory, pathname: string): boolean =>
  history.createHref({ pathname }, { prependBasePath: false }) ===
  history.createHref({ pathname: history.location.pathname });

const allowSamePageNavigation = (history: ScopedHistory): ScopedHistory =>
  Object.create(history, {
    block: {
      value: (prompt?: Parameters<ScopedHistory['block']>[0]) =>
        typeof prompt === 'function'
          ? history.block((location, action) =>
              isCurrentPage(history, location.pathname) ? undefined : prompt(location, action)
            )
          : history.block(prompt),
    },
  });

/** Prompts before leaving the page with unsaved changes, letting navigation that keeps the current pathname through. */
export const usePageLeavePrompt = ({ hasUnsavedChanges }: { hasUnsavedChanges: boolean }): void => {
  const {
    appParams: { history },
    core: { http, application, overlays },
  } = useKibana();
  const pageHistory = useMemo(() => allowSamePageNavigation(history), [history]);

  // The shared hook re-registers its block whenever this object changes, and a block replaced
  // while the modal is open makes Leave page prompt again.
  const promptProps = useMemo(
    () => ({
      hasUnsavedChanges,
      history: pageHistory,
      http,
      navigateToUrl: application.navigateToUrl,
      openConfirm: overlays.openConfirm,
    }),
    [hasUnsavedChanges, pageHistory, http, application.navigateToUrl, overlays.openConfirm]
  );
  useUnsavedChangesPrompt(promptProps);
};
