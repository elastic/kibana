/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useEffect } from 'react';
import {
  EuiBetaBadge,
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
import { Redirect, useHistory, useLocation } from 'react-router-dom';
import { RunsListPage } from './pages/runs_list';
import { DatasetsListPage } from './pages/datasets_list';
import { EvaluatorCatalogPage } from './pages/evaluators';
import { SkillPerformanceDashboard } from './pages/monitoring';
// AesopErrorBoundary is a lightweight class used as the wrapper around
// lazy AESOP routes; imported eagerly so it can catch errors thrown by
// the lazy children during render. It is tree-shakable when no AESOP
// route is rendered (i.e. xpack.evals.aesop.enabled is false).
import { AesopErrorBoundary } from './pages/aesop/components/aesop_error_boundary';

// AESOP pages are lazy-loaded so their bundle cost is paid only when
// xpack.evals.aesop.enabled is true AND the user navigates to an
// AESOP route.
const ProposedSkillsList = React.lazy(async () => {
  const mod = await import('./pages/aesop/proposed_skills_list');
  return { default: mod.ProposedSkillsList };
});

const ExplorationDashboard = React.lazy(async () => {
  const mod = await import('./pages/aesop/exploration_dashboard');
  return { default: mod.ExplorationDashboard };
});

const ExecutionDetailPage = React.lazy(async () => {
  const mod = await import('./pages/aesop/execution_detail');
  return { default: mod.ExecutionDetailPage };
});

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

const ExperimentsPage = React.lazy(async () => {
  const mod = await import('./pages/experiments');
  return { default: mod.ExperimentsPage };
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

const monitoringTabLabel = i18n.translate('xpack.evals.navigation.monitoring', {
  defaultMessage: 'Monitoring',
});

const remotesTabLabel = i18n.translate('xpack.evals.navigation.remotes', {
  defaultMessage: 'Remotes',
});

const tracingTabLabel = i18n.translate('xpack.evals.navigation.tracing', {
  defaultMessage: 'Tracing',
});

const experimentsTabLabel = i18n.translate('xpack.evals.navigation.experiments', {
  defaultMessage: 'Experiments',
});

const ROOT_PATH = '/' as const;
const COMPARE_PATH = '/compare' as const;
const DATASETS_PATH = '/datasets' as const;
const TRACING_PATH = '/tracing' as const;
const EXPERIMENTS_PATH = '/experiments' as const;
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

const monitoringBreadcrumbLabel = i18n.translate('xpack.evals.breadcrumbs.monitoring', {
  defaultMessage: 'Monitoring',
});

const technicalPreviewLabel = i18n.translate('xpack.evals.technicalPreview.badgeLabel', {
  defaultMessage: 'Technical preview',
});

const technicalPreviewTooltip = i18n.translate('xpack.evals.technicalPreview.tooltip', {
  defaultMessage:
    'This feature is in technical preview. It may change or be removed in a future release, and is not subject to support SLA.',
});

const TechPreviewBadge: React.FC = () => (
  <EuiBetaBadge
    label={technicalPreviewLabel}
    iconType="beaker"
    size="s"
    color="hollow"
    tooltipContent={technicalPreviewTooltip}
    css={{ marginLeft: 6 }}
  />
);

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

  if (pathname.startsWith('/monitoring')) {
    return [{ text: monitoringBreadcrumbLabel }];
  }

  if (pathname === EXPERIMENTS_PATH) {
    return [{ text: experimentsTabLabel }];
  }

  return [{ text: runsTabLabel }];
};

const EvalsNavigation: React.FC<{ aesopEnabled: boolean }> = ({ aesopEnabled }) => {
  const history = useHistory();
  const { pathname } = useLocation();
  const isTracingSelected = pathname.startsWith(TRACING_PATH);
  const isDatasetsSelected = pathname.startsWith(DATASETS_PATH);
  const isRemotesSelected = pathname.startsWith(REMOTES_PATH);
  const isAESOPSelected = aesopEnabled && pathname.startsWith('/aesop');
  const isEvaluatorsSelected = pathname === '/evaluators';
  const isMonitoringSelected = pathname.startsWith('/monitoring');
  const isExperimentsSelected = pathname.startsWith(EXPERIMENTS_PATH);
  const isRunsSelected =
    !isTracingSelected &&
    !isDatasetsSelected &&
    !isRemotesSelected &&
    !isAESOPSelected &&
    !isEvaluatorsSelected &&
    !isMonitoringSelected &&
    !isExperimentsSelected;

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
        {aesopEnabled && (
          <EuiTab
            isSelected={isAESOPSelected}
            onClick={() => history.push('/aesop/skills/proposed')}
          >
            {aesopTabLabel}
            <TechPreviewBadge />
          </EuiTab>
        )}
        <EuiTab isSelected={isEvaluatorsSelected} onClick={() => history.push('/evaluators')}>
          {evaluatorsTabLabel}
          <TechPreviewBadge />
        </EuiTab>
        <EuiTab isSelected={isMonitoringSelected} onClick={() => history.push('/monitoring')}>
          {monitoringTabLabel}
          <TechPreviewBadge />
        </EuiTab>
        <EuiTab isSelected={isExperimentsSelected} onClick={() => history.push(EXPERIMENTS_PATH)}>
          {experimentsTabLabel}
          <TechPreviewBadge />
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
  aesopEnabled?: boolean;
}> = ({ history, setBreadcrumbs, getHref, breadcrumbPrefix, aesopEnabled = false }) => {
  return (
    <Router history={history}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <EvalsHeader />
        <EvalsNavigation aesopEnabled={aesopEnabled} />
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
              {/* AESOP Routes (flag-gated) */}
              {aesopEnabled && (
                <Route exact path="/aesop/skills/proposed">
                  <AesopErrorBoundary>
                    <ProposedSkillsList />
                  </AesopErrorBoundary>
                </Route>
              )}
              {aesopEnabled && (
                <Route exact path="/aesop/exploration">
                  <AesopErrorBoundary>
                    <ExplorationDashboard />
                  </AesopErrorBoundary>
                </Route>
              )}
              {aesopEnabled && (
                <Route path="/aesop/exploration/:executionId">
                  <AesopErrorBoundary>
                    <ExecutionDetailPage />
                  </AesopErrorBoundary>
                </Route>
              )}
              {/* Bookmarks to bare `/aesop` should land on the proposed-skills
                  hub, not a blank page. */}
              {aesopEnabled && (
                <Route
                  exact
                  path="/aesop"
                  render={() => <Redirect to="/aesop/skills/proposed" />}
                />
              )}
              {/* When AESOP is disabled, bookmarked deep-links to /aesop/*
                  would otherwise render a blank page. Redirect them to the
                  root instead so the user lands on a working page. */}
              {!aesopEnabled && <Route path="/aesop" render={() => <Redirect to={ROOT_PATH} />} />}
              <Route exact path="/evaluators" component={EvaluatorCatalogPage} />
              <Route exact path="/monitoring" component={SkillPerformanceDashboard} />
              <Route path="/monitoring/:skillId" component={SkillPerformanceDashboard} />
              <Route exact path={EXPERIMENTS_PATH} component={ExperimentsPage} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </Router>
  );
};
