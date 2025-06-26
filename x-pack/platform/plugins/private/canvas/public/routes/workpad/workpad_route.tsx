/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren, useEffect, useCallback } from 'react';
import { Redirect, useParams } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';
import { useDispatch } from 'react-redux';
import { WorkpadApp } from '../../components/workpad_app';
import { ExportApp } from '../../components/export_app';
import { CanvasLoading } from '../../components/canvas_loading';
// @ts-expect-error
import { fetchAllRenderables } from '../../state/actions/elements';
import { useNotifyService } from '../../services';
import { CanvasWorkpad } from '../../../types';
import { ErrorStrings } from '../../../i18n';
import { useWorkpad } from './hooks/use_workpad';
import { useRestoreHistory } from './hooks/use_restore_history';
import { useWorkpadHistory } from './hooks/use_workpad_history';
import { usePageSync } from './hooks/use_page_sync';
import { useWorkpadPersist } from './hooks/use_workpad_persist';
import { WorkpadRouteProps, WorkpadPageRouteParams } from '.';
import { WorkpadRoutingContextComponent } from './workpad_routing_context';
import { WorkpadPresentationHelper } from './workpad_presentation_helper';

const { workpadRoutes: strings } = ErrorStrings;

export const WorkpadRoute = () => {
  return (
    <Route
      path={['/workpad/:id/page/:pageNumber', '/workpad/:id']}
      exact={false}
      // @ts-expect-error @types/react@18 - match can be null
      children={(route: WorkpadRouteProps) => {
        return <WorkpadRouteComponent route={route} />;
      }}
    />
  );
};

const WorkpadRouteComponent: FC<{ route: WorkpadRouteProps }> = ({ route }) => {
  const getRedirectPath = useCallback(
    (workpadId: string) =>
      `/workpad/${workpadId}${
        route.match.params.pageNumber ? `/page/${route.match.params.pageNumber}` : ''
      }`,
    [route.match.params.pageNumber]
  );

  return (
    <WorkpadLoaderComponent
      params={route.match.params}
      key="workpad-loader"
      getRedirectPath={getRedirectPath}
    >
      {(workpad: CanvasWorkpad) => (
        <Routes>
          <Route
            path="/workpad/:id/page/:pageNumber"
            children={(pageRoute) => (
              <WorkpadHistoryManager>
                <WorkpadRoutingContextComponent>
                  <WorkpadPresentationHelper>
                    <WorkpadApp />
                  </WorkpadPresentationHelper>
                </WorkpadRoutingContextComponent>
              </WorkpadHistoryManager>
            )}
          />
          <Route path="/workpad/:id" strict={false} exact={true}>
            <Redirect to={`/workpad/${route.match.params.id}/page/${workpad.page + 1}`} />
          </Route>
        </Routes>
      )}
    </WorkpadLoaderComponent>
  );
};

export const ExportWorkpadRoute = () => {
  return (
    <Route
      path={'/export/workpad/pdf/:id/page/:pageNumber'}
      // @ts-expect-error @types/react@18 - match can be null
      children={(route: WorkpadRouteProps) => {
        return <ExportWorkpadRouteComponent route={route} />;
      }}
    />
  );
};

const ExportWorkpadRouteComponent: FC<{ route: WorkpadRouteProps }> = ({ route: { match } }) => {
  const getRedirectPath = useCallback(
    (workpadId: string) => `/export/workpad/pdf/${workpadId}/page/${match.params.pageNumber}`,
    [match.params.pageNumber]
  );

  return (
    <WorkpadLoaderComponent
      loadPages={false}
      params={match.params}
      getRedirectPath={getRedirectPath}
    >
      {() => (
        <ExportRouteManager>
          <ExportApp />
        </ExportRouteManager>
      )}
    </WorkpadLoaderComponent>
  );
};

export const ExportRouteManager: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const params = useParams<WorkpadPageRouteParams>();
  usePageSync();

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchAllRenderables({ onlyActivePage: true }));
  }, [dispatch, params.pageNumber]);

  return <>{children}</>;
};

export const WorkpadHistoryManager: FC<PropsWithChildren<unknown>> = ({ children }) => {
  useRestoreHistory();
  useWorkpadHistory();
  usePageSync();
  useWorkpadPersist();

  return <>{children}</>;
};

const WorkpadLoaderComponent: FC<{
  params: WorkpadRouteProps['match']['params'];
  loadPages?: boolean;
  getRedirectPath: (workpadId: string) => string;
  children: (workpad: CanvasWorkpad) => JSX.Element;
}> = ({ params, children, loadPages, getRedirectPath }) => {
  const [workpad, error] = useWorkpad(params.id, loadPages, getRedirectPath);
  const notifyService = useNotifyService();

  useEffect(() => {
    if (error) {
      notifyService.error(error, { title: strings.getLoadFailureErrorMessage() });
    }
  }, [error, notifyService]);

  if (error) {
    return <Redirect to="/" />;
  }

  if (!workpad) {
    return <CanvasLoading />;
  }

  return children(workpad);
};
