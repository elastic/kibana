/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { BehaviorSubject } from 'rxjs';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import { Router } from '@kbn/shared-ux-router';
import { HOME_PATHS } from '../common/constants';
import { HomeRoutes } from './home_routes';
import { renderWithHomeContext } from './test_utils';

jest.mock('./integrated_home_page', () => ({
  IntegratedHomePage: () => <div data-test-subj="integratedHomePage" />,
}));

const setBreadcrumbs = jest.fn((_breadcrumbs: ChromeBreadcrumb[]) => {});
const TEST_APP_ID = 'testHost';
const application = applicationServiceMock.createStartContract();
application.currentAppId$ = new BehaviorSubject<string | undefined>(TEST_APP_ID);
application.getUrlForApp.mockImplementation((appId, options) => `/app/${appId}${options?.path}`);

const renderRoutes = (path: string, withBreadcrumbs = true) => {
  const history = createMemoryHistory({ initialEntries: [path] });
  renderWithHomeContext(
    <Router history={history}>
      <HomeRoutes setBreadcrumbs={withBreadcrumbs ? setBreadcrumbs : undefined} />
    </Router>,
    { services: { application } }
  );
  return history;
};

const lastBreadcrumbs = (): ChromeBreadcrumb[] => setBreadcrumbs.mock.calls.at(-1)?.[0] ?? [];

beforeEach(() => {
  setBreadcrumbs.mockClear();
});

describe('HomeRoutes', () => {
  it('renders the home page at the root', () => {
    renderRoutes(HOME_PATHS.home);

    expect(screen.getByTestId('integratedHomePage')).toBeInTheDocument();
    expect(lastBreadcrumbs()).toEqual([{ text: 'Home' }]);
  });

  it.each([
    [HOME_PATHS.sampleApp, 'elasticsearchHomeSampleAppWizard', 'Clone a sample app'],
    [HOME_PATHS.guidedApi, 'elasticsearchHomeGuidedApiWizard', 'Guided API setup'],
    [HOME_PATHS.uploadFile, 'elasticsearchHomeUploadFileWizard', 'Upload a file'],
  ])('renders the wizard at %s below a Home breadcrumb', async (path, testSubj, title) => {
    renderRoutes(path);

    expect(await screen.findByTestId(testSubj)).toBeInTheDocument();
    expect(screen.queryByTestId('integratedHomePage')).not.toBeInTheDocument();
    expect(lastBreadcrumbs()).toEqual([
      { text: 'Home', href: `/app/${TEST_APP_ID}${HOME_PATHS.home}` },
      { text: title },
    ]);
  });

  it('redirects unknown sub-paths to the home page', () => {
    const history = renderRoutes('/does-not-exist');

    expect(history.location.pathname).toBe(HOME_PATHS.home);
    expect(screen.getByTestId('integratedHomePage')).toBeInTheDocument();
  });
});
