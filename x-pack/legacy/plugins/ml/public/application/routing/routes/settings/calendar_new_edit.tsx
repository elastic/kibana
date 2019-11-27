/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
// @ts-ignore
import queryString from 'query-string';

import { MlRoute, PageLoader } from '../../router';
import { useResolver } from '../../router';

import { checkFullLicense } from '../../../license/check_license';
import { checkGetJobsPrivilege, checkPermission } from '../../../privilege/check_privilege';
import { checkMlNodesAvailable } from '../../../ml_nodes_check/check_ml_nodes';
import { NewCalendar } from '../../../settings';

enum MODE {
  NEW,
  EDIT,
}

export const newCalendarRoute: MlRoute = {
  path: '/settings/calendars_list/new_calendar',
  render: (props: any, config: any) => <PageWrapper config={config} {...props} mode={MODE.NEW} />,
};

export const editCalendarRoute: MlRoute = {
  path: '/settings/calendars_list/edit_calendar/:calendarId',
  render: (props: any, config: any) => <PageWrapper config={config} {...props} mode={MODE.EDIT} />,
};

const PageWrapper: FC<{ location: any; config: any; mode: MODE }> = ({
  location,
  config,
  mode,
}) => {
  let calendarId: string | undefined;
  if (mode === MODE.EDIT) {
    const pathMatch: string[] | null = location.pathname.match(/.+\/(.+)$/);
    calendarId = pathMatch && pathMatch.length > 1 ? pathMatch[1] : undefined;
  }

  const { context } = useResolver(undefined, config, {
    checkFullLicense,
    checkGetJobsPrivilege,
    checkMlNodesAvailable,
  });

  const canCreateCalendar = checkPermission('canCreateCalendar');
  const canDeleteCalendar = checkPermission('canDeleteCalendar');

  return (
    <PageLoader context={context}>
      <NewCalendar
        calendarId={calendarId}
        canCreateCalendar={canCreateCalendar}
        canDeleteCalendar={canDeleteCalendar}
      />
    </PageLoader>
  );
};
