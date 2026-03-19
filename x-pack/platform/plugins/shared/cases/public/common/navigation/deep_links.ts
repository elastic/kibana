/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AppDeepLink } from '@kbn/core/public';
import {
  DEFAULT_BASE_PATH,
  getCreateCasePath,
  getCasesConfigurePath,
  getCasesTemplatesPath,
} from './paths';

export const CasesDeepLinkId = {
  cases: 'cases',
  casesCreate: 'cases_create',
  casesConfigure: 'cases_configure',
  casesTemplates: 'cases_templates',
} as const;

export type ICasesDeepLinkId = (typeof CasesDeepLinkId)[keyof typeof CasesDeepLinkId];

export const getCasesDeepLinks = <T extends AppDeepLink = AppDeepLink>({
  basePath = DEFAULT_BASE_PATH,
  extend = {},
  templatesEnabled = false,
}: {
  basePath?: string;
  extend?: Partial<Record<ICasesDeepLinkId, Partial<T>>>;
  templatesEnabled?: boolean;
}) => {
  const deepLinks: Array<T & { id: ICasesDeepLinkId }> = [
    {
      title: i18n.translate('xpack.cases.navigation.create', {
        defaultMessage: 'Create',
      }),
      ...(extend[CasesDeepLinkId.casesCreate] ?? {}),
      id: CasesDeepLinkId.casesCreate,
      path: getCreateCasePath(basePath),
    } as T & { id: ICasesDeepLinkId },
    {
      title: i18n.translate('xpack.cases.navigation.settings', {
        defaultMessage: 'Settings',
      }),
      ...(extend[CasesDeepLinkId.casesConfigure] ?? {}),
      id: CasesDeepLinkId.casesConfigure,
      path: getCasesConfigurePath(basePath),
    } as T & { id: ICasesDeepLinkId },
  ];

  if (templatesEnabled) {
    deepLinks.push({
      title: i18n.translate('xpack.cases.navigation.templates', {
        defaultMessage: 'Templates',
      }),
      ...(extend[CasesDeepLinkId.casesTemplates] ?? {}),
      id: CasesDeepLinkId.casesTemplates,
      path: getCasesTemplatesPath(basePath),
    } as T & { id: ICasesDeepLinkId });
  }

  return {
    title: i18n.translate('xpack.cases.navigation.cases', {
      defaultMessage: 'Cases',
    }),
    ...(extend[CasesDeepLinkId.cases] ?? {}),
    id: CasesDeepLinkId.cases,
    path: basePath,
    deepLinks,
  };
};
