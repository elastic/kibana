/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CASES = i18n.translate('xpack.triggersActionsUI.cases.label', {
  defaultMessage: 'Cases',
});

export const MAINTENANCE_WINDOWS = i18n.translate(
  'xpack.triggersActionsUI.maintenanceWindows.label',
  {
    defaultMessage: 'Maintenance Windows',
  }
);

export const TECH_PREVIEW_LABEL = i18n.translate(
  'xpack.triggersActionsUI.technicalPreviewBadgeLabel',
  {
    defaultMessage: 'Technical preview',
  }
);

export const TECH_PREVIEW_DESCRIPTION = i18n.translate(
  'xpack.triggersActionsUI.technicalPreviewBadgeDescription',
  {
    defaultMessage:
      'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
  }
);

const SHOW_REQUEST_MODAL_EDIT = i18n.translate(
  'xpack.triggersActionsUI.sections.showRequestModal.subheadingTitleEdit',
  {
    defaultMessage: 'edit',
  }
);

const SHOW_REQUEST_MODAL_CREATE = i18n.translate(
  'xpack.triggersActionsUI.sections.showRequestModal.subheadingTitleCreate',
  {
    defaultMessage: 'create',
  }
);

export const SHOW_REQUEST_MODAL_SUBTITLE = (edit: boolean) =>
  i18n.translate('xpack.triggersActionsUI.sections.showRequestModal.subheadingTitle', {
    defaultMessage: 'This Kibana request will {requestType} this rule.',
    values: { requestType: edit ? SHOW_REQUEST_MODAL_EDIT : SHOW_REQUEST_MODAL_CREATE },
  });

const SHOW_REQUEST_MODAL_TITLE_EDIT = i18n.translate(
  'xpack.triggersActionsUI.sections.showRequestModal.headerTitleEdit',
  {
    defaultMessage: 'Edit',
  }
);

const SHOW_REQUEST_MODAL_TITLE_CREATE = i18n.translate(
  'xpack.triggersActionsUI.sections.showRequestModal.headerTitleCreate',
  {
    defaultMessage: 'Create',
  }
);

export const SHOW_REQUEST_MODAL_TITLE = (edit: boolean) =>
  i18n.translate('xpack.triggersActionsUI.sections.showRequestModal.headerTitle', {
    defaultMessage: '{requestType} alerting rule request',
    values: {
      requestType: edit ? SHOW_REQUEST_MODAL_TITLE_EDIT : SHOW_REQUEST_MODAL_TITLE_CREATE,
    },
  });

export const SHOW_REQUEST_MODAL_ERROR = i18n.translate(
  'xpack.triggersActionsUI.sections.showRequestModal.somethingWentWrongDescription',
  {
    defaultMessage: 'Sorry about that, something went wrong.',
  }
);
