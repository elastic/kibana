/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import type { LocatorGetUrlParams } from '@kbn/share-plugin/common/url_service';
import { useUrlState } from '@kbn/ml-url-state';
import { MANAGEMENT_APP_LOCATOR } from '@kbn/deeplinks-management/constants';
import { useMlKibana } from './kibana_context';
import { ML_APP_LOCATOR } from '../../../../common/constants/locator';
import type { MlLocatorParams } from '../../../../common/types/locator';
import { MlManagementLocatorInternal } from '../../../locator/ml_management_locator';
import type { NavigateToMlManagementLink } from '../../jobs/new_job/common/job_creator/util/general';

export const useMlManagementLocator = () => {
  const {
    services: { share },
  } = useMlKibana();

  return share.url.locators.get(MANAGEMENT_APP_LOCATOR);
};

export const useMlManagementLocatorInternal = () => {
  const {
    services: { share },
  } = useMlKibana();

  return new MlManagementLocatorInternal(share);
};

export const useMlLocator = () => {
  const {
    services: { share },
  } = useMlKibana();

  return share.url.locators.get(ML_APP_LOCATOR);
};

export const useMlLink = (params: MlLocatorParams, getUrlParams?: LocatorGetUrlParams): string => {
  const [href, setHref] = useState<string>(params.page);
  const mlLocator = useMlLocator();

  useEffect(
    function generateMlLink() {
      let isCancelled = false;
      const generateUrl = async (_params: MlLocatorParams) => {
        if (mlLocator) {
          const url = await mlLocator.getUrl(_params, getUrlParams);
          if (!isCancelled) {
            setHref(url);
          }
        }
      };
      generateUrl(params);
      return () => {
        isCancelled = true;
      };
    },
    [params, getUrlParams, mlLocator]
  );

  return href;
};

export const useNavigateToManagementMlLink = (appId: string) => {
  const mlManagementLocatorInternal = useMlManagementLocatorInternal();
  const [globalState] = useUrlState('_g');

  const redirectToMlPage: NavigateToMlManagementLink = useCallback(
    async (_page, pageState?) => {
      if (mlManagementLocatorInternal) {
        const modifiedPageState: MlLocatorParams['pageState'] = pageState ?? {};
        if (globalState?.refreshInterval !== undefined) {
          // @ts-expect-error globalState override
          modifiedPageState.globalState = {
            // @ts-expect-error globalState override
            ...(modifiedPageState.globalState ?? {}),
            refreshInterval: globalState.refreshInterval,
          };
        }

        const { path } = await mlManagementLocatorInternal.getUrl(
          // @ts-expect-error globalState modification
          { page: _page, pageState: modifiedPageState },
          appId
        );
        await mlManagementLocatorInternal.navigate(path, appId);
      } else {
        // eslint-disable-next-line no-console
        console.error('mlManagementLocatorInternal is not defined');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [MlManagementLocatorInternal, appId]
  );

  return redirectToMlPage;
};

export const useCreateAndNavigateToMlLink = (
  page: MlLocatorParams['page']
): (() => Promise<void>) => {
  const mlLocator = useMlLocator();
  const [globalState] = useUrlState('_g');

  const {
    services: {
      application: { navigateToUrl },
    },
  } = useMlKibana();

  const redirectToMlPage = useCallback(
    async (_page: MlLocatorParams['page']) => {
      if (mlLocator) {
        const pageState =
          globalState?.refreshInterval !== undefined
            ? {
                globalState: {
                  refreshInterval: globalState.refreshInterval,
                },
              }
            : undefined;

        const url = await mlLocator.getUrl({ page: _page, pageState });

        await navigateToUrl(url);
      } else {
        // eslint-disable-next-line no-console
        console.error('mlLocator is not defined');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mlLocator, navigateToUrl]
  );

  // returns the onClick callback
  return useCallback(() => redirectToMlPage(page), [redirectToMlPage, page]);
};

export const useCreateAndNavigateToManagementMlLink = (
  page: MlLocatorParams['page'],
  appId: string,
  pageState?: MlLocatorParams['pageState']
): (() => Promise<void>) => {
  const mlManagementLocatorInternal = useMlManagementLocatorInternal();
  const [globalState] = useUrlState('_g');

  const {
    services: {
      application: { navigateToUrl },
    },
  } = useMlKibana();

  const redirectToMlPage = useCallback(
    async (_page: MlLocatorParams['page']) => {
      if (mlManagementLocatorInternal) {
        const modifiedPageState: MlLocatorParams['pageState'] = pageState ?? {};
        if (globalState?.refreshInterval !== undefined) {
          // @ts-expect-error globalState override
          modifiedPageState.globalState = {
            // @ts-expect-error globalState override
            ...(modifiedPageState.globalState ?? {}),
            refreshInterval: globalState.refreshInterval,
          };
        }

        const { path } = await mlManagementLocatorInternal.getUrl(
          // @ts-expect-error globalState modification
          { page: _page, pageState: modifiedPageState },
          appId
        );
        await mlManagementLocatorInternal.navigate(path, appId);
      } else {
        // eslint-disable-next-line no-console
        console.error('mlManagementLocatorInternal is not defined');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [MlManagementLocatorInternal, navigateToUrl, JSON.stringify(pageState)]
  );

  // returns the onClick callback
  return useCallback(() => redirectToMlPage(page), [redirectToMlPage, page]);
};

export const useMlManagementLink = (
  page: MlLocatorParams['page'],
  appId: string,
  pageState?: MlLocatorParams['pageState']
): string => {
  const [href, setHref] = useState<string>('');
  const mlManagementLocatorInternal = useMlManagementLocatorInternal();
  const [globalState] = useUrlState('_g');

  useEffect(
    function generateMlManagementLink() {
      let isCancelled = false;
      const generateUrl = async (_page: MlLocatorParams['page']) => {
        if (mlManagementLocatorInternal) {
          const modifiedPageState: MlLocatorParams['pageState'] = pageState ?? {};
          if (globalState?.refreshInterval !== undefined) {
            // @ts-expect-error globalState override
            modifiedPageState.globalState = {
              // @ts-expect-error globalState override
              ...(modifiedPageState.globalState ?? {}),
              refreshInterval: globalState.refreshInterval,
            };
          }

          const { url } = await mlManagementLocatorInternal.getUrl(
            // @ts-expect-error globalState modification
            { page: _page, pageState: modifiedPageState },
            appId
          );
          if (!isCancelled && url) {
            setHref(url);
          }
        } else {
          // eslint-disable-next-line no-console
          console.error('mlManagementLocatorInternal is not defined');
        }
      };
      generateUrl(page);
      return () => {
        isCancelled = true;
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      mlManagementLocatorInternal,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      JSON.stringify(pageState),
      globalState?.refreshInterval,
      appId,
      page,
    ]
  );

  return href;
};
