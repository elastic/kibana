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

import React, { useEffect, FC } from 'react';
import { i18n } from '@kbn/i18n';

import { timefilter } from 'ui/timefilter';

import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';

import { checkFullLicense } from '../../../license/check_license';
import { checkGetJobsPrivilege, checkPermission } from '../../../privilege/check_privilege';
import { getMlNodeCount } from '../../../ml_nodes_check/check_ml_nodes';
import { CalendarsList } from '../../../settings/calendars';
import { SETTINGS, ML_BREADCRUMB } from '../../breadcrumbs';

const breadcrumbs = [
  ML_BREADCRUMB,
  SETTINGS,
  {
    text: i18n.translate('xpack.ml.settings.breadcrumbs.calendarManagementLabel', {
      defaultMessage: 'Calendar management',
    }),
    href: '#/settings/calendars_list',
  },
];

export const calendarListRoute: MlRoute = {
  path: '/settings/calendars_list',
  render: (props, config, deps) => <PageWrapper config={config} {...props} deps={deps} />,
  breadcrumbs,
};

const PageWrapper: FC<PageProps> = ({ config }) => {
  const { context } = useResolver(undefined, undefined, config, {
    checkFullLicense,
    checkGetJobsPrivilege,
    getMlNodeCount,
  });

  useEffect(() => {
    timefilter.disableTimeRangeSelector();
    timefilter.disableAutoRefreshSelector();
  }, []);

  const canCreateCalendar = checkPermission('canCreateCalendar');
  const canDeleteCalendar = checkPermission('canDeleteCalendar');

  return (
    <PageLoader context={context}>
      <CalendarsList {...{ canCreateCalendar, canDeleteCalendar }} />
    </PageLoader>
  );
};
