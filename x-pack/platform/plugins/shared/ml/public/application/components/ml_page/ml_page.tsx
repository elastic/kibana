/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { createContext, useEffect, useMemo, useState } from 'react';
import { createHtmlPortalNode, type HtmlPortalNode } from 'react-reverse-portal';
import { Redirect } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';
import { Subscription } from 'rxjs';
import { EuiPageSection, EuiPageHeader } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { type AppMountParameters } from '@kbn/core/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { DatePickerWrapper } from '@kbn/ml-date-picker';

import * as routes from '../../routing/routes';
import * as overviewRoutes from '../../routing/routes/overview';
import * as anomalyDetectionRoutes from '../../routing/routes/anomaly_detection_management';
import * as dfaRoutes from '../../routing/routes/data_frame_analytics';
import * as suppliedConfigsRoutes from '../../routing/routes/supplied_configurations';
import * as settingsRoutes from '../../routing/routes/settings';
import * as trainedModelsRoutes from '../../routing/routes/trained_models';
import { MlPageWrapper } from '../../routing/ml_page_wrapper';
import { useMlKibana, useNavigateToPath } from '../../contexts/kibana';
import type { MlRoute, PageDependencies } from '../../routing/router';
import { useActiveRoute } from '../../routing/use_active_route';
import { useDocTitle } from '../../routing/use_doc_title';

import { MlPageHeaderRenderer } from '../page_header/page_header';

import { useSideNavItems } from './side_nav';
import { useEnabledFeatures } from '../../contexts/ml';

const ML_APP_SELECTOR = '[data-test-subj="mlApp"]';

export const MlPageControlsContext = createContext<{
  headerPortal: HtmlPortalNode;
  setHeaderActionMenu?: AppMountParameters['setHeaderActionMenu'];
  setIsHeaderMounted: (v: boolean) => void;
  isHeaderMounted: boolean;
}>({
  setHeaderActionMenu: () => {},
  headerPortal: createHtmlPortalNode(),
  isHeaderMounted: false,
  setIsHeaderMounted: () => {},
});

/**
 * Main page component of the ML App
 * @constructor
 */
export const MlPage: FC<{ pageDeps: PageDependencies; entryPoint?: string }> = React.memo(
  ({ pageDeps, entryPoint }) => {
    const navigateToPath = useNavigateToPath();
    const {
      services: {
        http: { basePath },
        mlServices: { httpService },
      },
    } = useMlKibana();
    const { showMLNavMenu } = useEnabledFeatures();

    const headerPortalNode = useMemo(() => createHtmlPortalNode(), []);
    const [isHeaderMounted, setIsHeaderMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
      const subscriptions = new Subscription();

      subscriptions.add(
        httpService.getLoadingCount$.subscribe((v) => {
          setIsLoading(v !== 0);
        })
      );
      return function cleanup() {
        subscriptions.unsubscribe();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const routeList = useMemo(
      () => {
        let currentRoutes;

        switch (entryPoint) {
          case 'overview':
            currentRoutes = overviewRoutes;
            break;
          case 'anomaly_detection':
            currentRoutes = anomalyDetectionRoutes;
            break;
          case 'analytics':
            currentRoutes = dfaRoutes;
            break;
          case 'trained_models':
            currentRoutes = trainedModelsRoutes;
            break;
          case 'supplied_configurations':
            currentRoutes = suppliedConfigsRoutes;
            break;
          case 'settings':
            currentRoutes = settingsRoutes;
            break;
          default:
            currentRoutes = routes;
        }

        return Object.values(currentRoutes)
          .map((routeFactory) => routeFactory(navigateToPath, basePath.get()))
          .filter((d) => !d.disabled);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [entryPoint]
    );

    const activeRoute = useActiveRoute(routeList);

    const rightSideItems = useMemo(() => {
      return [
        ...(activeRoute.enableDatePicker
          ? [<DatePickerWrapper isLoading={isLoading} width="full" />]
          : []),
      ];
    }, [activeRoute.enableDatePicker, isLoading]);

    useDocTitle(activeRoute);

    // The deprecated `KibanaPageTemplate` from`'@kbn/kibana-react-plugin/public'`
    // had a `pageBodyProps` prop where we could pass in the `data-test-subj` for
    // the `main` element. This is no longer available in the update template
    // imported from `'@kbn/shared-ux-page-kibana-template'`. The following is a
    // workaround to add the `data-test-subj` on the `main` element again.
    useEffect(() => {
      const mlApp = document.querySelector(ML_APP_SELECTOR) as HTMLElement;
      if (mlApp && typeof activeRoute?.['data-test-subj'] === 'string') {
        const mlAppMain = mlApp.querySelector('main') as HTMLElement;
        if (mlAppMain) {
          mlAppMain.setAttribute('data-test-subj', activeRoute?.['data-test-subj']);
        }
      }
    }, [activeRoute]);

    const sideNavItems = useSideNavItems(activeRoute);

    return (
      <MlPageControlsContext.Provider
        value={{
          setHeaderActionMenu: pageDeps.setHeaderActionMenu,
          headerPortal: headerPortalNode,
          setIsHeaderMounted,
          isHeaderMounted,
        }}
      >
        {entryPoint === undefined ? (
          <KibanaPageTemplate
            className={'ml-app'}
            data-test-subj={'mlApp'}
            restrictWidth={false}
            panelled
            solutionNav={
              showMLNavMenu
                ? {
                    name: i18n.translate('xpack.ml.plugin.title', {
                      defaultMessage: 'Machine Learning',
                    }),
                    icon: 'machineLearningApp',
                    items: sideNavItems,
                  }
                : undefined
            }
            pageHeader={{
              pageTitle: <MlPageHeaderRenderer />,
              rightSideItems,
              restrictWidth: false,
            }}
          >
            <CommonPageWrapper
              headerPortal={headerPortalNode}
              setIsHeaderMounted={setIsHeaderMounted}
              pageDeps={pageDeps}
              routeList={routeList}
            />
          </KibanaPageTemplate>
        ) : (
          <>
            <EuiPageHeader pageTitle={<MlPageHeaderRenderer />} rightSideItems={rightSideItems} />
            <CommonPageWrapper
              headerPortal={headerPortalNode}
              setIsHeaderMounted={setIsHeaderMounted}
              pageDeps={pageDeps}
              routeList={routeList}
              entryPoint={entryPoint}
            />
          </>
        )}
      </MlPageControlsContext.Provider>
    );
  }
);

interface CommonPageWrapperProps {
  setIsHeaderMounted: (v: boolean) => void;
  pageDeps: PageDependencies;
  routeList: MlRoute[];
  headerPortal: HtmlPortalNode;
  entryPoint?: string;
}

const CommonPageWrapper: FC<CommonPageWrapperProps> = React.memo(
  ({ pageDeps, routeList, entryPoint }) => {
    const {
      services: { application },
    } = useMlKibana();

    return (
      /** RedirectAppLinks intercepts all <a> tags to use navigateToUrl
       * avoiding full page reload **/
      <RedirectAppLinks coreStart={{ application }}>
        <EuiPageSection restrictWidth={false}>
          <Routes>
            {routeList.map((route) => {
              return (
                <Route
                  key={route.path}
                  path={route.path}
                  exact
                  render={(props) => {
                    window.setTimeout(() => {
                      pageDeps.setBreadcrumbs(route.breadcrumbs);
                    });
                    return (
                      <MlPageWrapper path={route.path}>
                        {route.render(props, pageDeps)}
                      </MlPageWrapper>
                    );
                  }}
                />
              );
            })}
            <Redirect to="/" />
          </Routes>
        </EuiPageSection>
      </RedirectAppLinks>
    );
  }
);
