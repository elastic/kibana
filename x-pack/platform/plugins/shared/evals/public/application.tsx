/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useEffect } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
} from '@elastic/eui';
import { Router, Route, Routes } from '@kbn/shared-ux-router';
import type { AppMountParameters, ChromeBreadcrumb } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useHistory, useLocation } from 'react-router-dom';
import { RunsListPage } from './pages/runs_list';
import { DatasetsListPage } from './pages/datasets_list';

const RunDetailPage = React.lazy(async () => {
  const mod = await import('./pages/run_detail');
  return { default: mod.RunDetailPage };
});

const DatasetDetailPage = React.lazy(async () => {
  const mod = await import('./pages/dataset_detail');
  return { default: mod.DatasetDetailPage };
});

const RemotesListPage = React.lazy(async () => {
  const mod = await import('./pages/remotes_list');
  return { default: mod.RemotesListPage };
});

const TracingProjectsListPage = React.lazy(async () => {
  const mod = await import('./pages/tracing_projects_list');
  return { default: mod.TracingProjectsListPage };
});

const TracingProjectDetailPage = React.lazy(async () => {
  const mod = await import('./pages/tracing_project_detail');
  return { default: mod.TracingProjectDetailPage };
});

const CompareRunsPage = React.lazy(async () => {
  const mod = await import('./pages/compare_runs');
  return { default: mod.CompareRunsPage };
});

const appTitleLabel = i18n.translate('xpack.evals.app.title', {
  defaultMessage: 'Evaluations',
});

const runsTabLabel = i18n.translate('xpack.evals.navigation.runs', {
  defaultMessage: 'Runs',
});

const datasetsTabLabel = i18n.translate('xpack.evals.navigation.datasets', {
  defaultMessage: 'Datasets',
});

const remotesTabLabel = i18n.translate('xpack.evals.navigation.remotes', {
  defaultMessage: 'Remotes',
});

const tracingTabLabel = i18n.translate('xpack.evals.navigation.tracing', {
  defaultMessage: 'Tracing',
});

const ROOT_PATH = '/' as const;
const COMPARE_PATH = '/compare' as const;
const DATASETS_PATH = '/datasets' as const;
const TRACING_PATH = '/tracing' as const;
const REMOTES_PATH = '/remotes' as const;
const runDetailBreadcrumbLabel = i18n.translate('xpack.evals.breadcrumbs.runDetail', {
  defaultMessage: 'Run details',
});

const compareRunsBreadcrumbLabel = i18n.translate('xpack.evals.breadcrumbs.compareRuns', {
  defaultMessage: 'Compare runs',
});

const datasetDetailBreadcrumbLabel = i18n.translate('xpack.evals.breadcrumbs.datasetDetail', {
  defaultMessage: 'Dataset details',
});

const EvalsHeader: React.FC = () => {
  return (
    <>
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="center"
        responsive={false}
        css={{ flexGrow: 0 }}
      >
        <EuiFlexItem>
          <EuiTitle size="l">
            <h2>{appTitleLabel}</h2>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </>
  );
};

const getBreadcrumbs = ({
  pathname,
  getHref,
}: {
  pathname: string;
  getHref: (path: string) => string;
}): ChromeBreadcrumb[] => {
  const runsHref = getHref(ROOT_PATH);
  const datasetsHref = getHref(DATASETS_PATH);
  const tracingHref = getHref(TRACING_PATH);

  if (pathname.startsWith(`${TRACING_PATH}/`)) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const projectName = decodeURIComponent(parts[1]);
      return [{ text: tracingTabLabel, href: tracingHref }, { text: projectName }];
    }
  }

  if (pathname === TRACING_PATH) {
    return [{ text: tracingTabLabel }];
  }

  if (pathname.startsWith(`${DATASETS_PATH}/`)) {
    return [{ text: datasetsTabLabel, href: datasetsHref }, { text: datasetDetailBreadcrumbLabel }];
  }

  if (pathname === DATASETS_PATH) {
    return [{ text: datasetsTabLabel }];
  }

  if (pathname === REMOTES_PATH) {
    return [{ text: remotesTabLabel }];
  }

  if (pathname.startsWith('/runs/')) {
    return [{ text: runsTabLabel, href: runsHref }, { text: runDetailBreadcrumbLabel }];
  }

  if (pathname.startsWith(COMPARE_PATH)) {
    return [{ text: runsTabLabel, href: runsHref }, { text: compareRunsBreadcrumbLabel }];
  }

  return [{ text: runsTabLabel }];
};

const EvalsNavigation: React.FC = () => {
  const history = useHistory();
  const { pathname } = useLocation();
  const isTracingSelected = pathname.startsWith(TRACING_PATH);
  const isDatasetsSelected = pathname.startsWith(DATASETS_PATH);
  const isRemotesSelected = pathname.startsWith(REMOTES_PATH);
  const isRunsSelected = !isTracingSelected && !isDatasetsSelected && !isRemotesSelected;

  return (
    <div style={{ flex: '0 0 auto' }}>
      <EuiTabs size="s">
        <EuiTab isSelected={isRunsSelected} onClick={() => history.push(ROOT_PATH)}>
          {runsTabLabel}
        </EuiTab>
        <EuiTab isSelected={isDatasetsSelected} onClick={() => history.push(DATASETS_PATH)}>
          {datasetsTabLabel}
        </EuiTab>
        <EuiTab isSelected={isTracingSelected} onClick={() => history.push(TRACING_PATH)}>
          {tracingTabLabel}
        </EuiTab>
        <EuiTab isSelected={isRemotesSelected} onClick={() => history.push(REMOTES_PATH)}>
          {remotesTabLabel}
        </EuiTab>
      </EuiTabs>
    </div>
  );
};

const EvalsBreadcrumbs: React.FC<{
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  getHref: (path: string) => string;
  breadcrumbPrefix?: ChromeBreadcrumb[];
}> = ({ setBreadcrumbs, getHref, breadcrumbPrefix = [] }) => {
  const { pathname } = useLocation();

  useEffect(() => {
    setBreadcrumbs([...breadcrumbPrefix, ...getBreadcrumbs({ pathname, getHref })]);
  }, [breadcrumbPrefix, getHref, pathname, setBreadcrumbs]);

  return null;
};

export const EvalsApp: React.FC<{
  history: AppMountParameters['history'];
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  getHref: (path: string) => string;
  breadcrumbPrefix?: ChromeBreadcrumb[];
}> = ({ history, setBreadcrumbs, getHref, breadcrumbPrefix }) => {
  return (
    <Router history={history}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <EvalsHeader />
        <EvalsNavigation />
        <EvalsBreadcrumbs
          setBreadcrumbs={setBreadcrumbs}
          getHref={getHref}
          breadcrumbPrefix={breadcrumbPrefix}
        />
        <div style={{ flex: 1, minHeight: 0 }}>
          <Suspense fallback={<EuiLoadingSpinner size="xl" />}>
            <Routes>
              <Route exact path={ROOT_PATH} component={RunsListPage} />
              <Route exact path={COMPARE_PATH} component={CompareRunsPage} />
              <Route exact path={DATASETS_PATH} component={DatasetsListPage} />
              <Route path="/datasets/:datasetId" component={DatasetDetailPage} />
              <Route exact path={REMOTES_PATH} component={RemotesListPage} />
              <Route path="/runs/:runId" component={RunDetailPage} />
              <Route exact path={TRACING_PATH} component={TracingProjectsListPage} />
              <Route exact path="/tracing/:projectName" component={TracingProjectDetailPage} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </Router>
  );
};
