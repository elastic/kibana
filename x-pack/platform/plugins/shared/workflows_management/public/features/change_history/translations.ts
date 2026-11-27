/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BACK_TO_WORKFLOW = i18n.translate('workflows.changeHistory.backToWorkflow', {
  defaultMessage: 'Back to workflow',
});

export const CURRENT_VERSION_ONLY_BADGE = i18n.translate(
  'workflows.changeHistory.currentVersionOnlyBadge',
  {
    defaultMessage: 'Current version',
  }
);

export const VERSION_BADGE = (version: number): string =>
  i18n.translate('workflows.changeHistory.versionBadge', {
    defaultMessage: 'v{version}',
    values: { version },
  });

export const UNSAVED_CHANGES_ACTION = i18n.translate(
  'workflows.changeHistory.unsavedChangesAction',
  {
    defaultMessage: 'Unsaved changes',
  }
);

export const UNSAVED_CHANGES_ACTOR = i18n.translate('workflows.changeHistory.unsavedChangesActor', {
  defaultMessage: 'You',
});

export const CHANGES_SUMMARY_STEPS = i18n.translate(
  'workflows.changeHistory.changesSummary.steps',
  {
    defaultMessage: 'Steps:',
  }
);

export const CHANGES_SUMMARY_TRIGGERS = i18n.translate(
  'workflows.changeHistory.changesSummary.triggers',
  {
    defaultMessage: 'Triggers:',
  }
);

export const CHANGES_SUMMARY_SETTINGS = i18n.translate(
  'workflows.changeHistory.changesSummary.settings',
  {
    defaultMessage: 'Settings:',
  }
);

export const CHANGES_ADDED = (count: number): string =>
  i18n.translate('workflows.changeHistory.changesSummary.added', {
    defaultMessage: '{count} added',
    values: { count },
  });

export const CHANGES_REMOVED = (count: number): string =>
  i18n.translate('workflows.changeHistory.changesSummary.removed', {
    defaultMessage: '{count} removed',
    values: { count },
  });

export const CHANGES_UPDATED = (count: number): string =>
  i18n.translate('workflows.changeHistory.changesSummary.updated', {
    defaultMessage: '{count} updated',
    values: { count },
  });
