/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Breadcrumb } from 'ui/chrome';
import { getCaseDetailsUrl, getCaseUrl, getCreateCaseUrl } from '../../components/link_to';
import { RouteSpyState } from '../../utils/route/types';
import * as i18n from './translations';

export const getBreadcrumbs = (params: RouteSpyState): Breadcrumb[] => {
  let breadcrumb = [
    {
      text: i18n.PAGE_TITLE,
      href: getCaseUrl(),
    },
  ];
  if (params.detailName === 'create') {
    breadcrumb = [
      ...breadcrumb,
      {
        text: i18n.CREATE_BC_TITLE,
        href: getCreateCaseUrl(),
      },
    ];
  } else if (params.detailName != null) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: params.detailName,
        href: getCaseDetailsUrl(params.detailName),
      },
    ];
  }
  return breadcrumb;
};
