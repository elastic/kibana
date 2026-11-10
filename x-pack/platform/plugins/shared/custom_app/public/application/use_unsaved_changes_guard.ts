/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import type { AppMountParameters } from '@kbn/core/public';

const title = i18n.translate('xpack.customApp.standalone.unsavedTitle', {
  defaultMessage: 'Unsaved changes',
});
const message = i18n.translate('xpack.customApp.standalone.unsavedMessage', {
  defaultMessage: 'You have unsaved changes. Leave without saving them?',
});

/**
 * Asks before changes that were not saved are lost, as a dashboard does: on leaving the page for
 * another in the app, and on leaving the app, or closing the tab, for another.
 */
export const useUnsavedChangesGuard = (
  hasUnsavedChanges: boolean,
  onAppLeave: AppMountParameters['onAppLeave']
) => {
  const history = useHistory();

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    return history.block(message);
  }, [history, hasUnsavedChanges]);

  useEffect(() => {
    onAppLeave((actions) =>
      hasUnsavedChanges ? actions.confirm(message, title) : actions.default()
    );
    return () => onAppLeave((actions) => actions.default());
  }, [onAppLeave, hasUnsavedChanges]);
};
