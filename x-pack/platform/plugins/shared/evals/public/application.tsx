/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTab, EuiTabs, EuiTitle } from '@elastic/eui';
import { Router, Route, Routes } from '@kbn/shared-ux-router';
import type { AppMountParameters, ChromeBreadcrumb } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useHistory, useLocation } from 'react-router-dom';
import { RunsListPage } from './pages/runs_list';
import { RunDetailPage } from './pages/run_detail';
import { DatasetsListPage } from './pages/datasets_list';
import { DatasetDetailPage } from './pages/dataset_detail';

const appTitleLabel = i18n.translate('xpack.evals.app.title', {
  defaultMessage: 'Evaluations',
});

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
  const runsHref = getHref('/');
  const datasetsHref = getHref('/datasets');

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
    <div style={{ flex: '0 0 auto' }}>
      <EuiTabs size="s">
        <EuiTab isSelected={!isDatasetsSelected} onClick={() => history.push('/')}>
          {runsTabLabel}
        </EuiTab>
        <EuiTab isSelected={isDatasetsSelected} onClick={() => history.push('/datasets')}>
          {datasetsTabLabel}
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
          <Routes>
            <Route exact path="/" component={RunsListPage} />
            <Route exact path="/datasets" component={DatasetsListPage} />
            <Route path="/datasets/:datasetId" component={DatasetDetailPage} />
            <Route path="/runs/:runId" component={RunDetailPage} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};
