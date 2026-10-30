/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';

import {
  APP_ID,
  CASES_APP_ID,
  CASES_CONFIGURE_PATH,
  CASES_CREATE_PATH,
  CASES_CONFIGURE_TEMPLATES_PATH,
  CASES_CONFIGURE_CREATE_TEMPLATE_PATH,
  CASES_CONFIGURE_FIELD_LIBRARY_PATH,
} from '../../../common/constants';
import { useNavigation } from '../lib/kibana';
import type { ICasesDeepLinkId } from './deep_links';
import type { CaseViewPathParams, CaseViewPathSearchParams, TemplateViewPathParams } from './paths';
import { generateCaseViewPath, generateConfigureTemplateEditPath } from './paths';
import { stringifyToURL, parseURL } from '../../components/utils';
import { useApplication } from '../lib/kibana/use_application';
import { isTopLevelAppEnabled } from '../top_level_app';

/**
 * Where Cases pages live: the top-level `cases` app when it is on, otherwise the app currently
 * hosting Cases, through its `cases` deep link.
 */
const useCasesAppTarget = (
  deepLinkId: ICasesDeepLinkId | undefined = APP_ID
): { appId: string | undefined; deepLinkId: ICasesDeepLinkId | undefined } => {
  const { appId } = useApplication();
  return isTopLevelAppEnabled()
    ? { appId: CASES_APP_ID, deepLinkId: undefined }
    : { appId, deepLinkId };
};

export const useCaseViewParams = () => useParams<CaseViewPathParams>();

export function useUrlParams() {
  const { search } = useLocation();
  const [urlParams, setUrlParams] = useState<CaseViewPathSearchParams>(() => parseURL(search));
  const toUrlParams = useCallback(
    (params: CaseViewPathSearchParams = urlParams) =>
      stringifyToURL(params as Record<string, string>),
    [urlParams]
  );
  useEffect(() => {
    setUrlParams(parseURL(search));
  }, [search]);
  return {
    urlParams,
    toUrlParams,
  };
}

type GetCasesUrl = (absolute?: boolean) => string;
type NavigateToCases = () => void;
type UseCasesNavigation = [GetCasesUrl, NavigateToCases];

export const useCasesNavigation = ({
  path,
  deepLinkId,
}: {
  path?: string;
  deepLinkId?: ICasesDeepLinkId;
}): UseCasesNavigation => {
  const { appId, deepLinkId: targetDeepLinkId } = useCasesAppTarget(deepLinkId);
  const { navigateTo, getAppUrl } = useNavigation(appId);
  const getCasesUrl = useCallback<GetCasesUrl>(
    (absolute) => getAppUrl({ path, deepLinkId: targetDeepLinkId, absolute }),
    [getAppUrl, targetDeepLinkId, path]
  );
  const navigateToCases = useCallback<NavigateToCases>(
    () => navigateTo({ path, deepLinkId: targetDeepLinkId }),
    [navigateTo, targetDeepLinkId, path]
  );
  return [getCasesUrl, navigateToCases];
};

/**
 * Cases can be either be part of a solution or a standalone application
 * The standalone application is registered from the cases plugin and is called
 * the main application. The main application uses paths and the solutions
 * deep links.
 */
const navigationMapping = {
  all: { path: '/' },
  create: { path: CASES_CREATE_PATH },
  configure: { path: CASES_CONFIGURE_PATH },
  templates: { path: CASES_CONFIGURE_TEMPLATES_PATH },
  createTemplate: { path: CASES_CONFIGURE_CREATE_TEMPLATE_PATH },
  fieldLibrary: { path: CASES_CONFIGURE_FIELD_LIBRARY_PATH },
};

export const useAllCasesNavigation = () => {
  const [getAllCasesUrl, navigateToAllCases] = useCasesNavigation({
    path: navigationMapping.all.path,
    deepLinkId: APP_ID,
  });

  return { getAllCasesUrl, navigateToAllCases };
};

export const useCreateCaseNavigation = () => {
  const [getCreateCaseUrl, navigateToCreateCase] = useCasesNavigation({
    path: navigationMapping.create.path,
    deepLinkId: APP_ID,
  });
  return { getCreateCaseUrl, navigateToCreateCase };
};

export const useConfigureCasesNavigation = () => {
  const [getConfigureCasesUrl, navigateToConfigureCases] = useCasesNavigation({
    path: navigationMapping.configure.path,
    deepLinkId: APP_ID,
  });
  return { getConfigureCasesUrl, navigateToConfigureCases };
};

export const useCasesTemplatesNavigation = () => {
  const [getCasesTemplatesUrl, navigateToCasesTemplates] = useCasesNavigation({
    path: navigationMapping.templates.path,
    deepLinkId: APP_ID,
  });
  return { getCasesTemplatesUrl, navigateToCasesTemplates };
};

export const useCasesCreateTemplateNavigation = () => {
  const [getCasesCreateTemplateUrl, navigateToCasesCreateTemplate] = useCasesNavigation({
    path: navigationMapping.createTemplate.path,
    deepLinkId: APP_ID,
  });
  return { getCasesCreateTemplateUrl, navigateToCasesCreateTemplate };
};

export const useCasesFieldLibraryNavigation = () => {
  const [getCasesFieldLibraryUrl, navigateToCasesFieldLibrary] = useCasesNavigation({
    path: navigationMapping.fieldLibrary.path,
    deepLinkId: APP_ID,
  });
  return { getCasesFieldLibraryUrl, navigateToCasesFieldLibrary };
};

export const useTemplateViewParams = () => useParams<TemplateViewPathParams>();

type GetEditTemplateUrl = (pathParams: TemplateViewPathParams, absolute?: boolean) => string;
type NavigateToEditTemplate = (pathParams: TemplateViewPathParams) => void;

export const useCasesEditTemplateNavigation = () => {
  const { appId, deepLinkId } = useCasesAppTarget();
  const { navigateTo, getAppUrl } = useNavigation(appId);

  const getCasesEditTemplateUrl = useCallback<GetEditTemplateUrl>(
    (pathParams, absolute) =>
      getAppUrl({
        deepLinkId,
        absolute,
        path: generateConfigureTemplateEditPath(pathParams),
      }),
    [deepLinkId, getAppUrl]
  );

  const navigateToCasesEditTemplate = useCallback<NavigateToEditTemplate>(
    (pathParams) =>
      navigateTo({
        deepLinkId,
        path: generateConfigureTemplateEditPath(pathParams),
      }),
    [navigateTo, deepLinkId]
  );

  return { getCasesEditTemplateUrl, navigateToCasesEditTemplate };
};

type GetCaseViewUrl = (pathParams: CaseViewPathParams, absolute?: boolean) => string;
type NavigateToCaseView = (pathParams: CaseViewPathParams) => void;

export const useCaseViewNavigation = () => {
  const { appId, deepLinkId } = useCasesAppTarget();
  const { navigateTo, getAppUrl } = useNavigation(appId);

  const getCaseViewUrl = useCallback<GetCaseViewUrl>(
    (pathParams, absolute) =>
      getAppUrl({
        deepLinkId,
        absolute,
        path: generateCaseViewPath(pathParams),
      }),
    [deepLinkId, getAppUrl]
  );

  const navigateToCaseView = useCallback<NavigateToCaseView>(
    (pathParams) =>
      navigateTo({
        deepLinkId,
        path: generateCaseViewPath(pathParams),
      }),
    [navigateTo, deepLinkId]
  );
  return { getCaseViewUrl, navigateToCaseView };
};
