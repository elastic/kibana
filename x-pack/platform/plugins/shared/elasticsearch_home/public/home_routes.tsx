/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Redirect } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { Route, Routes } from '@kbn/shared-ux-router';
import { dynamic } from '@kbn/shared-ux-utility';
import { HOME_PATHS } from '../common/constants';
import { useHomeAppHref } from './hooks/use_home_app_href';
import {
  GUIDED_API_WIZARD_TITLE,
  SAMPLE_APP_WIZARD_TITLE,
  UPLOAD_FILE_WIZARD_TITLE,
} from './wizards/wizard_titles';
import { IntegratedHomePage } from './integrated_home_page';
import type { ElasticsearchHomeAppProps } from './types';

const HOME_BREADCRUMB_TEXT = i18n.translate('xpack.elasticsearchHome.breadcrumbs.home', {
  defaultMessage: 'Home',
});

const WIZARD_ROUTES = [
  {
    path: HOME_PATHS.sampleApp,
    title: SAMPLE_APP_WIZARD_TITLE,
    Wizard: dynamic(async () => ({
      default: (await import('./wizards/sample_app_wizard')).SampleAppWizard,
    })),
  },
  {
    path: HOME_PATHS.guidedApi,
    title: GUIDED_API_WIZARD_TITLE,
    Wizard: dynamic(async () => ({
      default: (await import('./wizards/guided_api_wizard')).GuidedApiWizard,
    })),
  },
  {
    path: HOME_PATHS.uploadFile,
    title: UPLOAD_FILE_WIZARD_TITLE,
    Wizard: dynamic(async () => ({
      default: (await import('./wizards/upload_file_wizard')).UploadFileWizard,
    })),
  },
];

type HomeRoutesProps = Pick<ElasticsearchHomeAppProps, 'setBreadcrumbs'>;

interface RouteBreadcrumbsProps extends HomeRoutesProps {
  wizardTitle?: string;
}

const RouteBreadcrumbs = ({ setBreadcrumbs, wizardTitle }: RouteBreadcrumbsProps) => {
  const getAppHref = useHomeAppHref();

  useEffect(() => {
    if (!setBreadcrumbs) {
      return;
    }
    if (!wizardTitle) {
      setBreadcrumbs([{ text: HOME_BREADCRUMB_TEXT }]);
      return;
    }
    setBreadcrumbs([
      { text: HOME_BREADCRUMB_TEXT, href: getAppHref(HOME_PATHS.home) },
      { text: wizardTitle },
    ]);
  }, [setBreadcrumbs, wizardTitle, getAppHref]);

  return null;
};

export const HomeRoutes = ({ setBreadcrumbs }: HomeRoutesProps) => (
  <Routes>
    <Route exact path={HOME_PATHS.home}>
      <RouteBreadcrumbs setBreadcrumbs={setBreadcrumbs} />
      <IntegratedHomePage />
    </Route>
    {WIZARD_ROUTES.map(({ path, title, Wizard }) => (
      <Route key={path} exact path={path}>
        <RouteBreadcrumbs setBreadcrumbs={setBreadcrumbs} wizardTitle={title} />
        <Wizard />
      </Route>
    ))}
    <Route render={() => <Redirect to={HOME_PATHS.home} />} />
  </Routes>
);
