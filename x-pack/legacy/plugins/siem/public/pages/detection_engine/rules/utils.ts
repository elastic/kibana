/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Breadcrumb } from 'ui/chrome';
import { isEmpty } from 'lodash/fp';

import {
  getDetectionEngineUrl,
  getDetectionEngineTabUrl,
  getRulesUrl,
  getRuleDetailsUrl,
  getCreateRuleUrl,
  getEditRuleUrl,
} from '../../../components/link_to/redirect_to_detection_engine';
import * as i18nDetections from '../translations';
import * as i18nRules from './translations';
import { RouteSpyState } from '../../../utils/route/types';

const getTabBreadcrumb = (pathname: string, search: string[]) => {
  const tabPath = pathname.split('/')[2];

  if (tabPath === 'alerts') {
    return {
      text: i18nDetections.ALERT,
      href: `${getDetectionEngineTabUrl(tabPath)}${!isEmpty(search[0]) ? search[0] : ''}`,
    };
  }

  if (tabPath === 'signals') {
    return {
      text: i18nDetections.SIGNAL,
      href: `${getDetectionEngineTabUrl(tabPath)}${!isEmpty(search[0]) ? search[0] : ''}`,
    };
  }

  if (tabPath === 'rules') {
    return {
      text: i18nRules.PAGE_TITLE,
      href: `${getRulesUrl()}${!isEmpty(search[0]) ? search[0] : ''}`,
    };
  }
};

const isRuleCreatePage = (pathname: string) =>
  pathname.includes('/rules') && pathname.includes('/create');

const isRuleEditPage = (pathname: string) =>
  pathname.includes('/rules') && pathname.includes('/edit');

export const getBreadcrumbs = (params: RouteSpyState, search: string[]): Breadcrumb[] => {
  let breadcrumb = [
    {
      text: i18nDetections.PAGE_TITLE,
      href: `${getDetectionEngineUrl()}${!isEmpty(search[0]) ? search[0] : ''}`,
    },
  ];

  const tabBreadcrumb = getTabBreadcrumb(params.pathName, search);

  if (tabBreadcrumb) {
    breadcrumb = [...breadcrumb, tabBreadcrumb];
  }

  if (params.detailName && params.state?.ruleName) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: params.state.ruleName,
        href: `${getRuleDetailsUrl(params.detailName)}${!isEmpty(search[1]) ? search[1] : ''}`,
      },
    ];
  }

  if (isRuleCreatePage(params.pathName)) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: i18nRules.ADD_PAGE_TITLE,
        href: `${getCreateRuleUrl()}${!isEmpty(search[1]) ? search[1] : ''}`,
      },
    ];
  }

  if (isRuleEditPage(params.pathName) && params.detailName && params.state?.ruleName) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: i18nRules.EDIT_PAGE_TITLE,
        href: `${getEditRuleUrl(params.detailName)}${!isEmpty(search[1]) ? search[1] : ''}`,
      },
    ];
  }

  return breadcrumb;
};
