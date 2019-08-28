/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import chrome from 'ui/chrome';
import { MANAGEMENT_BREADCRUMB } from 'ui/management';
import { i18n } from '@kbn/i18n';
import { BASE_PATH } from '../../common/constants';

interface Breadcrumb {
  text: string;
  href?: string;
}

const homeBreadcrumb: Breadcrumb = {
  text: i18n.translate('xpack.idxMgmt.breadcrumb.homeLabel', {
    defaultMessage: 'Index Management',
  }),
  href: `#${BASE_PATH}`,
};

const templatesBreadcrumb: Breadcrumb = {
  text: i18n.translate('xpack.idxMgmt.breadcrumb.templatesLabel', {
    defaultMessage: 'Templates',
  }),
  href: `#${BASE_PATH}templates`,
};

const breadcrumbsMap: {
  [key: string]: Breadcrumb;
} = {
  templateCreate: {
    text: i18n.translate('xpack.idxMgmt.breadcrumb.createTemplateLabel', {
      defaultMessage: 'Create template',
    }),
  },
  templateEdit: {
    text: i18n.translate('xpack.idxMgmt.breadcrumb.editTemplateLabel', {
      defaultMessage: 'Edit template',
    }),
  },
  templateClone: {
    text: i18n.translate('xpack.idxMgmt.breadcrumb.cloneTemplateLabel', {
      defaultMessage: 'Clone template',
    }),
  },
};

export const setBreadcrumbs = (type?: 'templateCreate' | 'templateEdit' | 'templateClone') => {
  const breadcrumbs = type
    ? [MANAGEMENT_BREADCRUMB, homeBreadcrumb, templatesBreadcrumb, breadcrumbsMap[type]]
    : [MANAGEMENT_BREADCRUMB, homeBreadcrumb];
  chrome.breadcrumbs.set(breadcrumbs);
};
