/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useCallback, useEffect, useState } from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import { useNavigation } from '../../../hooks/use_navigation';

export type KiPageTabId = 'details' | 'document';

type KiPendingNavigation = { kind: 'tab'; tab: KiPageTabId } | { kind: 'back' } | null;

interface UseKiPageNavigationArgs {
  backPath: string;
  selectedTab: KiPageTabId;
  onSelectTab: (tab: KiPageTabId) => void;
  shouldBlockNavigation: boolean;
  onDiscardConfirmed: () => void;
}

export const useKiPageNavigation = ({
  backPath,
  selectedTab,
  onSelectTab,
  shouldBlockNavigation,
  onDiscardConfirmed,
}: UseKiPageNavigationArgs) => {
  const { navigateToContextEngine } = useNavigation();
  const {
    services: { onAppLeave },
  } = useKibana();

  const [isDiscardEditsConfirmOpen, setIsDiscardEditsConfirmOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<KiPendingNavigation>(null);

  // Blocks the browser tab from closing/refreshing
  useEffect(() => {
    if (!shouldBlockNavigation) {
      return undefined;
    }

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [shouldBlockNavigation]);

  // Blocks navigating to another Kibana app
  useEffect(() => {
    const leaveHandler: Parameters<AppMountParameters['onAppLeave']>[0] = (actions) =>
      shouldBlockNavigation
        ? actions.confirm(
            i18n.translate('xpack.contextEngine.viewKi.discardEditsModal.body', {
              defaultMessage: 'Your edits to this Knowledge Indicator will be lost.',
            }),
            i18n.translate('xpack.contextEngine.viewKi.discardEditsModal.title', {
              defaultMessage: 'Discard unsaved changes?',
            })
          )
        : actions.default();

    onAppLeave(leaveHandler);
    return () => onAppLeave((actions) => actions.default());
  }, [onAppLeave, shouldBlockNavigation]);

  // Performs a tab switch or back navigation, bypassing the confirm modal.
  const performNavigation = useCallback(
    (navigation: Exclude<KiPendingNavigation, null>) => {
      if (navigation.kind === 'tab') {
        onSelectTab(navigation.tab);
        return;
      }
      navigateToContextEngine(backPath);
    },
    [backPath, navigateToContextEngine, onSelectTab]
  );

  // Navigates immediately, or opens the discard-edits confirm modal first if navigation is blocked.
  const requestNavigation = useCallback(
    (navigation: Exclude<KiPendingNavigation, null>) => {
      if (shouldBlockNavigation) {
        setPendingNavigation(navigation);
        setIsDiscardEditsConfirmOpen(true);
        return;
      }
      performNavigation(navigation);
    },
    [performNavigation, shouldBlockNavigation]
  );

  // Closes the confirm modal without navigating, e.g. "keep editing".
  const closeDiscardEditsConfirm = useCallback(() => {
    setIsDiscardEditsConfirmOpen(false);
    setPendingNavigation(null);
  }, []);

  // Called when the user confirms discarding edits: discards, then completes the navigation.
  const completePendingNavigation = useCallback(() => {
    if (!pendingNavigation) {
      return;
    }

    onDiscardConfirmed();
    performNavigation(pendingNavigation);

    setPendingNavigation(null);
    setIsDiscardEditsConfirmOpen(false);
  }, [onDiscardConfirmed, pendingNavigation, performNavigation]);

  // Public handlers wired to the page's tabs and back button.
  const handleSelectTab = useCallback(
    (tab: KiPageTabId) => {
      if (tab === selectedTab) {
        return;
      }
      requestNavigation({ kind: 'tab', tab });
    },
    [requestNavigation, selectedTab]
  );

  const handleBackClick = useCallback(
    (event: { preventDefault: () => void }) => {
      event.preventDefault();
      requestNavigation({ kind: 'back' });
    },
    [requestNavigation]
  );

  return {
    handleSelectTab,
    handleBackClick,
    isDiscardEditsConfirmOpen,
    closeDiscardEditsConfirm,
    completePendingNavigation,
  };
};
