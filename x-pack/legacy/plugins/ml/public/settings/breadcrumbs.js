/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ML_BREADCRUMB, ANOMALY_DETECTION_BREADCRUMB, SETTINGS } from '../breadcrumbs';
import { i18n } from '@kbn/i18n';

export function getSettingsBreadcrumbs() {
  // Whilst top level nav menu with tabs remains,
  // use root ML breadcrumb.
  return [ML_BREADCRUMB, ANOMALY_DETECTION_BREADCRUMB, SETTINGS];
}

export function getCalendarManagementBreadcrumbs() {
  return [
    ...getSettingsBreadcrumbs(),
    {
      text: i18n.translate('xpack.ml.settings.breadcrumbs.calendarManagementLabel', {
        defaultMessage: 'Calendar management',
      }),
      href: '#/settings/calendars_list',
    },
  ];
}

export function getCreateCalendarBreadcrumbs() {
  return [
    ...getCalendarManagementBreadcrumbs(),
    {
      text: i18n.translate('xpack.ml.settings.breadcrumbs.calendarManagement.createLabel', {
        defaultMessage: 'Create',
      }),
      href: '#/settings/calendars_list/new_calendar',
    },
  ];
}

export function getEditCalendarBreadcrumbs() {
  return [
    ...getCalendarManagementBreadcrumbs(),
    {
      text: i18n.translate('xpack.ml.settings.breadcrumbs.calendarManagement.editLabel', {
        defaultMessage: 'Edit',
      }),
      href: '#/settings/calendars_list/edit_calendar',
    },
  ];
}

export function getFilterListsBreadcrumbs() {
  return [
    ...getSettingsBreadcrumbs(),
    {
      text: i18n.translate('xpack.ml.settings.breadcrumbs.filterListsLabel', {
        defaultMessage: 'Filter lists',
      }),
      href: '#/settings/filter_lists',
    },
  ];
}

export function getCreateFilterListBreadcrumbs() {
  return [
    ...getFilterListsBreadcrumbs(),
    {
      text: i18n.translate('xpack.ml.settings.breadcrumbs.filterLists.createLabel', {
        defaultMessage: 'Create',
      }),
      href: '#/settings/filter_lists/new',
    },
  ];
}

export function getEditFilterListBreadcrumbs() {
  return [
    ...getFilterListsBreadcrumbs(),
    {
      text: i18n.translate('xpack.ml.settings.breadcrumbs.filterLists.editLabel', {
        defaultMessage: 'Edit',
      }),
      href: '#/settings/filter_lists/edit',
    },
  ];
}
