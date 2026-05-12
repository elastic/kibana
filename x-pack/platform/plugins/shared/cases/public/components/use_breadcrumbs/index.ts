/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import { useCallback, useEffect } from 'react';
import { KibanaServices, useKibana, useNavigation } from '../../common/lib/kibana';
import type { ICasesDeepLinkId } from '../../common/navigation';
import { CasesDeepLinkId } from '../../common/navigation';
import { useApplication } from '../../common/lib/kibana/use_application';

const getCasesBreadcrumbTitle = (deepLinkId: ICasesDeepLinkId): string => {
  const titles: Record<ICasesDeepLinkId, string> = {
    [CasesDeepLinkId.cases]: i18n.translate('xpack.cases.breadcrumbs.all_cases', {
      defaultMessage: 'Cases',
    }),
    [CasesDeepLinkId.casesCreate]: i18n.translate('xpack.cases.breadcrumbs.create_case', {
      defaultMessage: 'Create',
    }),
    [CasesDeepLinkId.casesConfigure]: i18n.translate('xpack.cases.breadcrumbs.settings', {
      defaultMessage: 'Settings',
    }),
    [CasesDeepLinkId.casesTemplates]: i18n.translate('xpack.cases.breadcrumbs.templates', {
      defaultMessage: 'Templates',
    }),
  };
  return titles[deepLinkId];
};

function getTitleFromBreadcrumbs(breadcrumbs: ChromeBreadcrumb[]): string[] {
  return breadcrumbs.map(({ text }) => text?.toString() ?? '').reverse();
}

const useGetBreadcrumbsWithNavigation = () => {
  const { navigateToUrl } = useKibana().services.application;

  return useCallback(
    (breadcrumbs: ChromeBreadcrumb[]): ChromeBreadcrumb[] => {
      return breadcrumbs.map((breadcrumb) => {
        const { href, onClick } = breadcrumb;
        if (!href || onClick) {
          return breadcrumb;
        }
        return {
          ...breadcrumb,
          onClick: (event) => {
            if (event) {
              event.preventDefault();
            }
            navigateToUrl(href);
          },
        };
      });
    },
    [navigateToUrl]
  );
};

const useApplyBreadcrumbs = () => {
  const { docTitle, setBreadcrumbs } = useKibana().services.chrome;
  const getBreadcrumbsWithNavigation = useGetBreadcrumbsWithNavigation();

  return useCallback(
    (
      leadingRawBreadcrumbs: ChromeBreadcrumb[],
      trailingRawBreadcrumbs: ChromeBreadcrumb[] = []
    ) => {
      const leadingBreadcrumbs = getBreadcrumbsWithNavigation(leadingRawBreadcrumbs);
      const trailingBreadcrumbs = getBreadcrumbsWithNavigation(trailingRawBreadcrumbs);
      const allBreadcrumbs = [...leadingBreadcrumbs, ...trailingBreadcrumbs];

      docTitle.change(getTitleFromBreadcrumbs(allBreadcrumbs));
      setBreadcrumbs(allBreadcrumbs, { project: { value: trailingBreadcrumbs } });
    },
    [docTitle, setBreadcrumbs, getBreadcrumbsWithNavigation]
  );
};

export const useCasesBreadcrumbs = (pageDeepLink: ICasesDeepLinkId) => {
  const { appId, appTitle } = useApplication();
  const { getAppUrl } = useNavigation(appId);
  const applyBreadcrumbs = useApplyBreadcrumbs();

  useEffect(() => {
    applyBreadcrumbs([
      { text: appTitle, href: getAppUrl() },
      {
        text: getCasesBreadcrumbTitle(CasesDeepLinkId.cases),
        ...(pageDeepLink !== CasesDeepLinkId.cases
          ? {
              href: getAppUrl({ deepLinkId: CasesDeepLinkId.cases }),
            }
          : {}),
      },
      ...(pageDeepLink !== CasesDeepLinkId.cases
        ? [
            {
              text: getCasesBreadcrumbTitle(pageDeepLink),
            },
          ]
        : []),
    ]);
    KibanaServices.get().serverless?.setBreadcrumbs([]);
  }, [pageDeepLink, appTitle, getAppUrl, applyBreadcrumbs]);
};

export const useCasesTitleBreadcrumbs = (caseTitle: string) => {
  const { appId, appTitle } = useApplication();
  const { getAppUrl } = useNavigation(appId);
  const applyBreadcrumbs = useApplyBreadcrumbs();

  useEffect(() => {
    const titleBreadcrumb: ChromeBreadcrumb = {
      text: caseTitle,
    };
    const casesBreadcrumbs: ChromeBreadcrumb[] = [
      { text: appTitle, href: getAppUrl() },
      {
        text: getCasesBreadcrumbTitle(CasesDeepLinkId.cases),
        href: getAppUrl({ deepLinkId: CasesDeepLinkId.cases }),
      },
    ];
    applyBreadcrumbs(casesBreadcrumbs, [titleBreadcrumb]);
    KibanaServices.get().serverless?.setBreadcrumbs([titleBreadcrumb]);
  }, [caseTitle, appTitle, getAppUrl, applyBreadcrumbs]);
};

export const useCasesTemplatesBreadcrumbs = (templateTitle?: string) => {
  const { appId, appTitle } = useApplication();
  const { getAppUrl } = useNavigation(appId);
  const applyBreadcrumbs = useApplyBreadcrumbs();

  useEffect(() => {
    const breadcrumbs: ChromeBreadcrumb[] = [
      { text: appTitle, href: getAppUrl() },
      {
        text: getCasesBreadcrumbTitle(CasesDeepLinkId.cases),
        href: getAppUrl({ deepLinkId: CasesDeepLinkId.cases }),
      },
      {
        text: getCasesBreadcrumbTitle(CasesDeepLinkId.casesConfigure),
        href: getAppUrl({ deepLinkId: CasesDeepLinkId.casesConfigure }),
      },
      {
        text: getCasesBreadcrumbTitle(CasesDeepLinkId.casesTemplates),
        ...(templateTitle
          ? { href: getAppUrl({ deepLinkId: CasesDeepLinkId.casesTemplates }) }
          : {}),
      },
    ];

    if (templateTitle) {
      breadcrumbs.push({ text: templateTitle });
    }

    applyBreadcrumbs(breadcrumbs);
    KibanaServices.get().serverless?.setBreadcrumbs(templateTitle ? [{ text: templateTitle }] : []);
  }, [templateTitle, appTitle, getAppUrl, applyBreadcrumbs]);
};
