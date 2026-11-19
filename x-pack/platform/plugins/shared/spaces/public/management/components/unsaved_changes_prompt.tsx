/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import { useEffect, useRef } from 'react';

import type { ApplicationStart, HttpStart, OverlayStart, ScopedHistory } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';

interface Props {
  hasUnsavedChanges: boolean;
  http: HttpStart;
  overlays: OverlayStart;
  navigateToUrl: ApplicationStart['navigateToUrl'];
  history: ScopedHistory;
}

/**
 * Prompts the user before they navigate away from a space form with unsaved changes. Rendered as a
 * component rather than consumed as a hook so that class components can use it too.
 */
export const SpacesUnsavedChangesPrompt: FC<Props> = ({
  hasUnsavedChanges,
  http,
  overlays,
  navigateToUrl,
  history,
}) => {
  useUnsavedChangesPrompt({
    hasUnsavedChanges,
    http,
    openConfirm: overlays.openConfirm,
    navigateToUrl,
    history,
    titleText: i18n.translate('xpack.spaces.management.spaceDetails.unsavedChangesPromptTitle', {
      defaultMessage: 'Leave without saving?',
    }),
    messageText: i18n.translate(
      'xpack.spaces.management.spaceDetails.unsavedChangesPromptMessage',
      {
        defaultMessage: "Unsaved changes won't be applied to the space and will be lost.",
      }
    ),
    cancelButtonText: i18n.translate('xpack.spaces.management.spaceDetails.keepEditingButton', {
      defaultMessage: 'Keep editing',
    }),
    confirmButtonText: i18n.translate('xpack.spaces.management.spaceDetails.leavePageButton', {
      defaultMessage: 'Leave',
    }),
  });

  return null;
};

interface NavigateOnLeaveProps {
  isLeaving: boolean;
  history: ScopedHistory;
  /** Called once the navigation has been requested, e.g. to reload the window afterwards. */
  onNavigated?: () => void;
}

/**
 * Returns the user to the spaces list once the form they were on has decided to let them leave.
 *
 * The navigation deliberately happens in an effect rather than in the click handler that triggers
 * it. [[SpacesUnsavedChangesPrompt]] blocks navigation from an effect of its own, and React runs
 * every pending effect cleanup before any effect body, so by the time this fires the block for the
 * now-discarded changes has already been released. Navigating directly from the handler instead
 * would race that teardown and ask the user to confirm a choice they have already made.
 */
export const NavigateOnLeave: FC<NavigateOnLeaveProps> = ({ isLeaving, history, onNavigated }) => {
  // held in a ref so that navigation is driven by the user leaving, rather than by the caller
  // handing us a new callback instance
  const onNavigatedRef = useRef(onNavigated);

  useEffect(() => {
    onNavigatedRef.current = onNavigated;
  }, [onNavigated]);

  useEffect(() => {
    if (!isLeaving) {
      return;
    }

    history.push('/');
    onNavigatedRef.current?.();
  }, [isLeaving, history]);

  return null;
};
