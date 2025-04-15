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
import { ML_PAGES } from '../../../../locator';
import type { MlRoute, PageProps } from '../../router';
import { createPath, PageLoader } from '../../router';
import { useRouteResolver } from '../../use_resolver';
import { usePermissionCheck } from '../../../capabilities/check_capabilities';
import { getMlNodeCount } from '../../../ml_nodes_check/check_ml_nodes';
import { type NavigateToApp, getADSettingsBreadcrumbs } from '../../breadcrumbs';

const CalendarsList = dynamic(async () => ({
  default: (await import('../../../settings/calendars')).CalendarsList,
}));

export const calendarListRouteFactory = (navigateToApp: NavigateToApp): MlRoute => ({
  path: createPath(ML_PAGES.CALENDARS_MANAGE),
  title: i18n.translate('xpack.ml.settings.calendarList.docTitle', {
    defaultMessage: 'Calendars',
  }),
  render: (props, deps) => <PageWrapper {...props} deps={deps} isDst={false} />,
  breadcrumbs: [
    ...getADSettingsBreadcrumbs(navigateToApp),
    {
      text: i18n.translate('xpack.ml.anomalyDetection.calendarManagementLabel', {
        defaultMessage: 'Calendar management',
      }),
    },
  ],
});

export const calendarDstListRouteFactory = (navigateToApp: NavigateToApp): MlRoute => ({
  path: createPath(ML_PAGES.CALENDARS_DST_MANAGE),
  title: i18n.translate('xpack.ml.settings.calendarList.docTitle', {
    defaultMessage: 'Calendars',
  }),
  render: (props, deps) => <PageWrapper {...props} deps={deps} isDst={true} />,
  breadcrumbs: [
    ...getADSettingsBreadcrumbs(navigateToApp),
    {
      text: i18n.translate('xpack.ml.anomalyDetection.dstCalendarManagementLabel', {
        defaultMessage: 'DST Calendar management',
      }),
    },
  ],
});

const PageWrapper: FC<PageProps & { isDst: boolean }> = ({ isDst }) => {
  const { context } = useRouteResolver('full', ['canGetCalendars'], { getMlNodeCount });

  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false });

  const [canCreateCalendar, canDeleteCalendar] = usePermissionCheck([
    'canCreateCalendar',
    'canDeleteCalendar',
  ]);

  return (
    <PageLoader context={context}>
      <CalendarsList {...{ canCreateCalendar, canDeleteCalendar, isDst }} />
    </PageLoader>
  );
};
