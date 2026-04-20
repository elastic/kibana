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
import { ProposedSkillsList } from './pages/aesop/proposed_skills_list';
import { ExplorationDashboard } from './pages/aesop/exploration_dashboard';
import { ExecutionDetailPage } from './pages/aesop/execution_detail';
import { AesopErrorBoundary } from './pages/aesop/components/aesop_error_boundary';
import { EvaluatorCatalogPage } from './pages/evaluators';
import { ComparisonDashboard } from './pages/comparison';
import { SkillPerformanceDashboard } from './pages/monitoring';
import { SuitesListPage } from './pages/suites_list';

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

const aesopTabLabel = i18n.translate('xpack.evals.navigation.aesop', {
  defaultMessage: 'AESOP',
});

const evaluatorsTabLabel = i18n.translate('xpack.evals.navigation.evaluators', {
  defaultMessage: 'Evaluators',
});

const comparisonTabLabel = i18n.translate('xpack.evals.navigation.comparison', {
  defaultMessage: 'Comparison',
});

const monitoringTabLabel = i18n.translate('xpack.evals.navigation.monitoring', {
  defaultMessage: 'Monitoring',
});

const suitesTabLabel = i18n.translate('xpack.evals.navigation.suites', {
  defaultMessage: 'Suites',
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

const aesopSkillsBreadcrumbLabel = i18n.translate('xpack.evals.breadcrumbs.aesopSkills', {
  defaultMessage: 'Proposed Skills',
});

const aesopExplorationBreadcrumbLabel = i18n.translate('xpack.evals.breadcrumbs.aesopExploration', {
  defaultMessage: 'Exploration Dashboard',
});

const aesopExecutionDetailBreadcrumbLabel = i18n.translate(
  'xpack.evals.breadcrumbs.aesopExecutionDetail',
  {
    defaultMessage: 'Execution Detail',
  }
);

const evaluatorsBreadcrumbLabel = i18n.translate('xpack.evals.breadcrumbs.evaluators', {
  defaultMessage: 'Evaluators',
});

const comparisonBreadcrumbLabel = i18n.translate('xpack.evals.breadcrumbs.comparison', {
  defaultMessage: 'Comparison',
});

const monitoringBreadcrumbLabel = i18n.translate('xpack.evals.breadcrumbs.monitoring', {
  defaultMessage: 'Monitoring',
});

const suitesBreadcrumbLabel = i18n.translate('xpack.evals.breadcrumbs.suites', {
  defaultMessage: 'Suites',
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
  const aesopSkillsHref = getHref('/aesop/skills/proposed');
  const aesopExplorationHref = getHref('/aesop/exploration');

  // AESOP routes
  if (pathname.startsWith('/aesop/exploration/') && pathname.split('/').length > 3) {
    return [
      { text: aesopTabLabel, href: aesopSkillsHref },
      { text: aesopExplorationBreadcrumbLabel, href: aesopExplorationHref },
      { text: aesopExecutionDetailBreadcrumbLabel },
    ];
  }

  if (pathname.startsWith('/aesop/exploration')) {
    return [
      { text: aesopTabLabel, href: aesopSkillsHref },
      { text: aesopExplorationBreadcrumbLabel },
    ];
  }

  if (pathname.startsWith('/aesop')) {
    return [{ text: aesopTabLabel, href: aesopSkillsHref }, { text: aesopSkillsBreadcrumbLabel }];
  }

  // Tracing routes
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

  // Datasets routes
  if (pathname.startsWith(`${DATASETS_PATH}/`)) {
    return [{ text: datasetsTabLabel, href: datasetsHref }, { text: datasetDetailBreadcrumbLabel }];
  }

  if (pathname === DATASETS_PATH) {
    return [{ text: datasetsTabLabel }];
  }

  if (pathname === REMOTES_PATH) {
    return [{ text: remotesTabLabel }];
  }

  // Runs routes
  if (pathname.startsWith('/runs/')) {
    return [{ text: runsTabLabel, href: runsHref }, { text: runDetailBreadcrumbLabel }];
  }

  if (pathname.startsWith(COMPARE_PATH)) {
    return [{ text: runsTabLabel, href: runsHref }, { text: compareRunsBreadcrumbLabel }];
  }

  if (pathname === '/evaluators') {
    return [{ text: evaluatorsBreadcrumbLabel }];
  }

  if (pathname.startsWith('/comparison')) {
    return [{ text: comparisonBreadcrumbLabel }];
  }

  if (pathname.startsWith('/monitoring')) {
    return [{ text: monitoringBreadcrumbLabel }];
  }

  if (pathname === '/suites') {
    return [{ text: suitesBreadcrumbLabel }];
  }

  return [{ text: runsTabLabel }];
};

const EvalsNavigation: React.FC = () => {
  const history = useHistory();
  const { pathname } = useLocation();
  const isTracingSelected = pathname.startsWith(TRACING_PATH);
  const isDatasetsSelected = pathname.startsWith(DATASETS_PATH);
  const isRemotesSelected = pathname.startsWith(REMOTES_PATH);
  const isAESOPSelected = pathname.startsWith('/aesop');
  const isEvaluatorsSelected = pathname === '/evaluators';
  const isComparisonSelected = pathname.startsWith('/comparison');
  const isMonitoringSelected = pathname.startsWith('/monitoring');
  const isSuitesSelected = pathname === '/suites';
  const isRunsSelected =
    !isTracingSelected &&
    !isDatasetsSelected &&
    !isRemotesSelected &&
    !isAESOPSelected &&
    !isEvaluatorsSelected &&
    !isComparisonSelected &&
    !isMonitoringSelected &&
    !isSuitesSelected;

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
        <EuiTab isSelected={isAESOPSelected} onClick={() => history.push('/aesop/skills/proposed')}>
          {aesopTabLabel}
        </EuiTab>
        <EuiTab isSelected={isEvaluatorsSelected} onClick={() => history.push('/evaluators')}>
          {evaluatorsTabLabel}
        </EuiTab>
        <EuiTab isSelected={isComparisonSelected} onClick={() => history.push('/comparison')}>
          {comparisonTabLabel}
        </EuiTab>
        <EuiTab isSelected={isMonitoringSelected} onClick={() => history.push('/monitoring')}>
          {monitoringTabLabel}
        </EuiTab>
        <EuiTab isSelected={isSuitesSelected} onClick={() => history.push('/suites')}>
          {suitesTabLabel}
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
              {/* AESOP Routes */}
              <Route exact path="/aesop/skills/proposed">
                <AesopErrorBoundary>
                  <ProposedSkillsList />
                </AesopErrorBoundary>
              </Route>
              <Route exact path="/aesop/exploration">
                <AesopErrorBoundary>
                  <ExplorationDashboard />
                </AesopErrorBoundary>
              </Route>
              <Route path="/aesop/exploration/:executionId">
                <AesopErrorBoundary>
                  <ExecutionDetailPage />
                </AesopErrorBoundary>
              </Route>
              <Route exact path="/evaluators" component={EvaluatorCatalogPage} />
              <Route exact path="/comparison" component={ComparisonDashboard} />
              <Route path="/comparison/:id" component={ComparisonDashboard} />
              <Route exact path="/monitoring" component={SkillPerformanceDashboard} />
              <Route path="/monitoring/:skillId" component={SkillPerformanceDashboard} />
              <Route exact path="/suites" component={SuitesListPage} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </Router>
  );
};
