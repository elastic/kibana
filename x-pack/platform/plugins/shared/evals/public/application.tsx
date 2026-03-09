/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { EuiPanel, EuiTab, EuiTabs } from '@elastic/eui';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Router, Route, Routes } from '@kbn/shared-ux-router';
import type { CoreStart, AppMountParameters } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useHistory, useLocation } from 'react-router-dom';
import { RunsListPage } from './pages/runs_list';
import { RunDetailPage } from './pages/run_detail';
import { DatasetsListPage } from './pages/datasets_list';
import { DatasetDetailPage } from './pages/dataset_detail';

const queryClient = new QueryClient();

const runsTabLabel = i18n.translate('xpack.evals.navigation.runs', {
  defaultMessage: 'Runs',
});

const datasetsTabLabel = i18n.translate('xpack.evals.navigation.datasets', {
  defaultMessage: 'Datasets',
});

const runDetailBreadcrumbLabel = i18n.translate('xpack.evals.breadcrumbs.runDetail', {
  defaultMessage: 'Run details',
});

const datasetDetailBreadcrumbLabel = i18n.translate('xpack.evals.breadcrumbs.datasetDetail', {
  defaultMessage: 'Dataset details',
});

const getBreadcrumbs = (pathname: string, coreStart: CoreStart) => {
  const runsHref = coreStart.application.getUrlForApp('evals', { path: '/' });
  const datasetsHref = coreStart.application.getUrlForApp('evals', { path: '/datasets' });

  if (pathname.startsWith('/datasets/')) {
    return [{ text: datasetsTabLabel, href: datasetsHref }, { text: datasetDetailBreadcrumbLabel }];
  }

  if (pathname === '/datasets') {
    return [{ text: datasetsTabLabel }];
  }

  if (pathname.startsWith('/runs/')) {
    return [{ text: runsTabLabel, href: runsHref }, { text: runDetailBreadcrumbLabel }];
  }

  return [{ text: runsTabLabel }];
};

const EvalsNavigation: React.FC = () => {
  const history = useHistory();
  const { pathname } = useLocation();
  const isDatasetsSelected = pathname.startsWith('/datasets');

  return (
    <EuiPanel hasShadow={false} hasBorder={false} paddingSize="none">
      <EuiTabs size="s">
        <EuiTab isSelected={!isDatasetsSelected} onClick={() => history.push('/')}>
          {runsTabLabel}
        </EuiTab>
        <EuiTab isSelected={isDatasetsSelected} onClick={() => history.push('/datasets')}>
          {datasetsTabLabel}
        </EuiTab>
      </EuiTabs>
    </EuiPanel>
  );
};

const EvalsBreadcrumbs: React.FC<{ coreStart: CoreStart }> = ({ coreStart }) => {
  const { pathname } = useLocation();

  useEffect(() => {
    coreStart.chrome.setBreadcrumbs(getBreadcrumbs(pathname, coreStart));
  }, [coreStart, pathname]);

  return null;
};

const EvalsApp: React.FC<{ coreStart: CoreStart; history: AppMountParameters['history'] }> = ({
  coreStart,
  history,
}) => {
  return (
    <KibanaRenderContextProvider {...coreStart}>
      <KibanaContextProvider services={coreStart}>
        <QueryClientProvider client={queryClient}>
          <Router history={history}>
            <EvalsNavigation />
            <EvalsBreadcrumbs coreStart={coreStart} />
            <Routes>
              <Route exact path="/" component={RunsListPage} />
              <Route exact path="/datasets" component={DatasetsListPage} />
              <Route path="/datasets/:datasetId" component={DatasetDetailPage} />
              <Route path="/runs/:runId" component={RunDetailPage} />
            </Routes>
          </Router>
        </QueryClientProvider>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );
};

export const renderApp = (coreStart: CoreStart, { element, history }: AppMountParameters) => {
  ReactDOM.render(<EvalsApp coreStart={coreStart} history={history} />, element);
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
