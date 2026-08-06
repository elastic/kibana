/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';

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
