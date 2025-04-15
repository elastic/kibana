/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useTimefilter } from '@kbn/ml-date-picker';
import { dynamic } from '@kbn/shared-ux-utility';
import type { MlRoute, PageProps } from '../../router';
import { createPath, PageLoader } from '../../router';
import { useRouteResolver } from '../../use_resolver';
import {
  type NavigateToApp,
  getADSettingsBreadcrumbs,
  getMlManagementBreadcrumb,
} from '../../breadcrumbs';
import { ML_PAGES } from '../../../../../common/constants/locator';
import { getMlNodeCount } from '../../../ml_nodes_check';

enum MODE {
  NEW,
  EDIT,
}

interface NewCalendarPageProps extends PageProps {
  mode: MODE;
  isDst: boolean;
}

const NewCalendar = dynamic(async () => ({
  default: (await import('../../../settings/calendars')).NewCalendar,
}));

export const newCalendarRouteFactory = (navigateToApp: NavigateToApp): MlRoute => ({
  path: createPath(ML_PAGES.CALENDARS_NEW),
  title: i18n.translate('xpack.ml.settings.createCalendar.docTitle', {
    defaultMessage: 'Create Calendar',
  }),
  render: (props, deps) => <PageWrapper {...props} deps={deps} mode={MODE.NEW} isDst={false} />,
  breadcrumbs: [
    ...getADSettingsBreadcrumbs(navigateToApp),
    getMlManagementBreadcrumb('CALENDAR_LISTS_MANAGEMENT_BREADCRUMB', navigateToApp),
    {
      text: i18n.translate('xpack.ml.settings.breadcrumbs.calendarManagement.createLabel', {
        defaultMessage: 'Create',
      }),
    },
  ],
});

export const editCalendarRouteFactory = (navigateToApp: NavigateToApp): MlRoute => ({
  path: createPath(ML_PAGES.CALENDARS_EDIT, '/:calendarId'),
  title: i18n.translate('xpack.ml.settings.editCalendar.docTitle', {
    defaultMessage: 'Edit Calendar',
  }),
  render: (props, deps) => <PageWrapper {...props} deps={deps} mode={MODE.EDIT} isDst={false} />,
  breadcrumbs: [
    ...getADSettingsBreadcrumbs(navigateToApp),
    getMlManagementBreadcrumb('CALENDAR_LISTS_MANAGEMENT_BREADCRUMB', navigateToApp),
    {
      text: i18n.translate('xpack.ml.settings.breadcrumbs.calendarManagement.editLabel', {
        defaultMessage: 'Edit',
      }),
    },
  ],
});

export const newCalendarDstRouteFactory = (navigateToApp: NavigateToApp): MlRoute => ({
  path: createPath(ML_PAGES.CALENDARS_DST_NEW),
  title: i18n.translate('xpack.ml.settings.createCalendarDst.docTitle', {
    defaultMessage: 'Create DST Calendar',
  }),
  render: (props, deps) => <PageWrapper {...props} deps={deps} mode={MODE.NEW} isDst={true} />,
  breadcrumbs: [
    ...getADSettingsBreadcrumbs(navigateToApp),
    getMlManagementBreadcrumb('CALENDAR_DST_LISTS_MANAGEMENT_BREADCRUMB', navigateToApp),
    {
      text: i18n.translate('xpack.ml.settings.breadcrumbs.calendarManagement.createLabel', {
        defaultMessage: 'Create',
      }),
    },
  ],
});

export const editCalendarDstRouteFactory = (navigateToApp: NavigateToApp): MlRoute => ({
  path: createPath(ML_PAGES.CALENDARS_DST_EDIT, '/:calendarId'),
  title: i18n.translate('xpack.ml.settings.editCalendarDst.docTitle', {
    defaultMessage: 'Edit DST Calendar',
  }),
  render: (props, deps) => <PageWrapper {...props} deps={deps} mode={MODE.EDIT} isDst={true} />,
  breadcrumbs: [
    ...getADSettingsBreadcrumbs(navigateToApp),
    getMlManagementBreadcrumb('CALENDAR_DST_LISTS_MANAGEMENT_BREADCRUMB', navigateToApp),
    {
      text: i18n.translate('xpack.ml.settings.breadcrumbs.calendarManagement.editLabel', {
        defaultMessage: 'Edit',
      }),
    },
  ],
});

const PageWrapper: FC<NewCalendarPageProps> = ({ location, mode, isDst }) => {
  let calendarId: string | undefined;
  if (mode === MODE.EDIT) {
    const pathMatch: string[] | null = location.pathname.match(/.+\/(.+)$/);
    calendarId = pathMatch && pathMatch.length > 1 ? pathMatch[1] : undefined;
  }

  const { context } = useRouteResolver('full', ['canGetJobs'], { getMlNodeCount });

  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false });

  return (
    <PageLoader context={context}>
      <NewCalendar calendarId={calendarId} isDst={isDst} />
    </PageLoader>
  );
};
