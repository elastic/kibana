/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { EuiButton, EuiEmptyPrompt, EuiLoadingSpinner, EuiPageTemplate } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AppMenuConfig } from '@kbn/app-menu';
import { AppMenu } from '@kbn/core-chrome-app-menu';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import {
  ExitFullScreenButton,
  ExitFullScreenButtonKibanaProvider,
} from '@kbn/shared-ux-button-exit-full-screen';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import useAsync from 'react-use/lib/useAsync';
import type { NotebookApp, NotebookAttributes } from '../../common/types';
import { getNotebookPath } from '../../common/constants';
import { AppView } from '../components/app_flyout';
import { createNotebookContext } from '../components/create_notebook_context';
import { NotebookContext } from '../components/notebook_context';
import { useNotebookServices } from '../services';
import type { NotebookApi } from '../services/notebook_api';
import { NotebookLoadError } from './notebook_page';
import { useBreadcrumbs } from './use_breadcrumbs';

/** Query parameter that opens the app in full-screen mode, e.g. `?fullScreen=true`. */
const FULL_SCREEN_PARAM = 'fullScreen';

const OPEN_NOTEBOOK_LABEL = i18n.translate('xpack.notebook.appPage.openNotebook', {
  defaultMessage: 'Open notebook',
});

const AppNotFound = ({ notebookId }: { notebookId: string }) => {
  const history = useHistory();
  return (
    <EuiEmptyPrompt
      iconType="dashboardApp"
      title={
        <h2>
          {i18n.translate('xpack.notebook.appPage.notFoundTitle', {
            defaultMessage: 'App not found',
          })}
        </h2>
      }
      body={i18n.translate('xpack.notebook.appPage.notFoundBody', {
        defaultMessage:
          'The notebook has no app with this link. It may have been deleted, or added since the notebook was last saved.',
      })}
      actions={
        <EuiButton
          onClick={() => history.push(getNotebookPath(notebookId))}
          data-test-subj="notebookAppPageOpenNotebook"
        >
          {OPEN_NOTEBOOK_LABEL}
        </EuiButton>
      }
      data-test-subj="notebookAppPageNotFound"
    />
  );
};

/** One app of a saved notebook, read-only, running only the cells it needs. */
const StandaloneApp = ({
  notebookId,
  app: { id: appId, panels },
  attributes,
}: {
  notebookId: string;
  app: NotebookApp;
  attributes: NotebookAttributes;
}) => {
  const { core, plugins } = useNotebookServices();
  const history = useHistory();
  const { search } = useLocation();
  const [notebook] = useState(() =>
    createNotebookContext({
      attributes,
      search: plugins.data.search,
      notebookId,
      scope: panels.map(({ cellId }) => cellId),
      // The page has no Run buttons, so every cell runs whenever what it reads changes.
      ignoreManualRunMode: true,
    })
  );
  const [isFullScreen, setIsFullScreen] = useState(
    () => new URLSearchParams(search).get(FULL_SCREEN_PARAM) === 'true'
  );
  const apps = useStateFromPublishingSubject(notebook.store.apps$);
  const app = apps.find(({ id }) => id === appId);

  useEffect(() => {
    const { scheduler } = notebook;
    scheduler.start();
    return () => scheduler.stop();
  }, [notebook]);

  const appMenu = useMemo<AppMenuConfig>(
    () => ({
      items: [
        {
          id: 'fullScreen',
          order: 1,
          label: i18n.translate('xpack.notebook.appPage.fullScreen', {
            defaultMessage: 'Full screen',
          }),
          iconType: 'fullScreen',
          testId: 'notebookAppPageFullScreen',
          run: () => setIsFullScreen(true),
        },
        {
          id: 'openNotebook',
          order: 2,
          label: OPEN_NOTEBOOK_LABEL,
          iconType: 'notebookApp',
          testId: 'notebookAppPageOpenNotebook',
          run: () => history.push(getNotebookPath(notebookId, appId)),
        },
      ],
    }),
    [history, notebookId, appId]
  );

  return (
    <NotebookContext.Provider value={notebook}>
      <AppMenu setAppMenu={core.chrome.setAppMenu} config={appMenu} />
      {isFullScreen && (
        <ExitFullScreenButtonKibanaProvider
          coreStart={{ chrome: core.chrome, customBranding: core.customBranding }}
        >
          <ExitFullScreenButton onExit={() => setIsFullScreen(false)} />
        </ExitFullScreenButtonKibanaProvider>
      )}
      <EuiPageTemplate paddingSize="none" restrictWidth={false} data-test-subj="notebookAppPage">
        <EuiPageTemplate.Section paddingSize="none" restrictWidth={false}>
          {app ? <AppView app={app} /> : <AppNotFound notebookId={notebookId} />}
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </NotebookContext.Provider>
  );
};

export const AppPage = ({ api }: { api: NotebookApi }) => {
  const { id, appId } = useParams<{ id: string; appId: string }>();
  const { loading, value, error } = useAsync(() => api.get(id), [api, id]);
  const app = value?.attributes.panels?.find((candidate) => candidate.id === appId);
  useBreadcrumbs(
    value?.attributes.title,
    app && { title: app.title, notebookPath: getNotebookPath(id, appId) }
  );

  if (loading) return <EuiLoadingSpinner size="xl" />;
  if (error || !value) return <NotebookLoadError message={error?.message} />;
  if (!app) return <AppNotFound notebookId={id} />;
  return (
    <StandaloneApp key={`${id}/${appId}`} notebookId={id} app={app} attributes={value.attributes} />
  );
};
