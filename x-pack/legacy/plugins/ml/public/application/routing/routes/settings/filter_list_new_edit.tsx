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
import { i18n } from '@kbn/i18n';

import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';

import { useTimefilter } from '../../../contexts/kibana';
import { checkFullLicense } from '../../../license/check_license';
import { checkGetJobsPrivilege, checkPermission } from '../../../privilege/check_privilege';
import { checkMlNodesAvailable } from '../../../ml_nodes_check/check_ml_nodes';
import { EditFilterList } from '../../../settings/filter_lists';
import { SETTINGS, ML_BREADCRUMB } from '../../breadcrumbs';

enum MODE {
  NEW,
  EDIT,
}

interface NewFilterPageProps extends PageProps {
  mode: MODE;
}

const newBreadcrumbs = [
  ML_BREADCRUMB,
  SETTINGS,
  {
    text: i18n.translate('xpack.ml.settings.breadcrumbs.filterLists.createLabel', {
      defaultMessage: 'Create',
    }),
    href: '#/settings/filter_lists/new',
  },
];

const editBreadcrumbs = [
  ML_BREADCRUMB,
  SETTINGS,
  {
    text: i18n.translate('xpack.ml.settings.breadcrumbs.filterLists.editLabel', {
      defaultMessage: 'Edit',
    }),
    href: '#/settings/filter_lists/edit',
  },
];

export const newFilterListRoute: MlRoute = {
  path: '/settings/filter_lists/new_filter_list',
  render: (props, deps) => <PageWrapper {...props} mode={MODE.NEW} deps={deps} />,
  breadcrumbs: newBreadcrumbs,
};

export const editFilterListRoute: MlRoute = {
  path: '/settings/filter_lists/edit_filter_list/:filterId',
  render: (props, deps) => <PageWrapper {...props} mode={MODE.EDIT} deps={deps} />,
  breadcrumbs: editBreadcrumbs,
};

const PageWrapper: FC<NewFilterPageProps> = ({ location, mode, deps }) => {
  let filterId: string | undefined;
  if (mode === MODE.EDIT) {
    const pathMatch: string[] | null = location.pathname.match(/.+\/(.+)$/);
    filterId = pathMatch && pathMatch.length > 1 ? pathMatch[1] : undefined;
  }

  const { context } = useResolver(undefined, undefined, deps.config, {
    checkFullLicense,
    checkGetJobsPrivilege,
    checkMlNodesAvailable,
  });

  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false });

  const canCreateFilter = checkPermission('canCreateFilter');
  const canDeleteFilter = checkPermission('canDeleteFilter');

  return (
    <PageLoader context={context}>
      <EditFilterList
        {...{
          filterId,
          canCreateFilter,
          canDeleteFilter,
        }}
      />
    </PageLoader>
  );
};
