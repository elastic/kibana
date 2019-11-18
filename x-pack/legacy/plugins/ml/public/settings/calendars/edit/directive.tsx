/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'ngreact';
import React from 'react';
import ReactDOM from 'react-dom';

// @ts-ignore
import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import uiRoutes from 'ui/routes';
import { I18nContext } from 'ui/i18n';
import { checkFullLicense } from '../../../license/check_license';
import { checkGetJobsPrivilege, checkPermission } from '../../../privilege/check_privilege';
import { checkMlNodesAvailable } from '../../../ml_nodes_check';
import { getCreateCalendarBreadcrumbs, getEditCalendarBreadcrumbs } from '../../breadcrumbs';

import { NewCalendar } from './new_calendar';

const template = `
  <div class="euiSpacer euiSpacer--s" />
  <ml-new-calendar />
`;

uiRoutes
  .when('/settings/calendars_list/new_calendar', {
    template,
    k7Breadcrumbs: getCreateCalendarBreadcrumbs,
    resolve: {
      CheckLicense: checkFullLicense,
      privileges: checkGetJobsPrivilege,
      checkMlNodesAvailable,
    },
  })
  .when('/settings/calendars_list/edit_calendar/:calendarId', {
    template,
    k7Breadcrumbs: getEditCalendarBreadcrumbs,
    resolve: {
      CheckLicense: checkFullLicense,
      privileges: checkGetJobsPrivilege,
      checkMlNodesAvailable,
    },
  });

module.directive('mlNewCalendar', function($route: any) {
  return {
    restrict: 'E',
    replace: false,
    scope: {},
    link(scope: ng.IScope, element: ng.IAugmentedJQuery) {
      const props = {
        calendarId: $route.current.params.calendarId,
        canCreateCalendar: checkPermission('canCreateCalendar'),
        canDeleteCalendar: checkPermission('canDeleteCalendar'),
      };

      ReactDOM.render(
        <I18nContext>
          <NewCalendar {...props} />
        </I18nContext>,
        element[0]
      );
    },
  };
});
