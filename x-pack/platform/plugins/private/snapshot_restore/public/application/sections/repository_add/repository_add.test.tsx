/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@kbn/code-editor-mock/jest_helper';

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { i18n } from '@kbn/i18n';

import { textService } from '../../services/text';
import { breadcrumbService, docTitleService } from '../../services/navigation';
import { RepositoryAdd } from './repository_add';

jest.mock('../../components/repository_form', () => ({
  ...jest.requireActual('../../components/repository_form'),
  RepositoryForm: ({
    onSave,
    saveError,
  }: {
    onSave: (repository: unknown) => void;
    saveError?: React.ReactNode;
  }) => (
    <div>
      <button
        data-test-subj="repositoryFormSave"
        onClick={() => onSave({ name: 'my-repo', type: 'fs', settings: { location: '/tmp' } })}
      >
        save
      </button>
      <div data-test-subj="repositoryFormSaveError">{saveError}</div>
    </div>
  ),
}));

jest.mock('../../services/http', () => {
  const actual = jest.requireActual<typeof import('../../services/http')>('../../services/http');

  return {
    ...actual,
    useLoadRepositoryTypes: jest.fn().mockReturnValue({
      isLoading: false,
      error: null,
      data: ['fs'],
    }),
    addRepository: jest.fn(),
  };
});

jest.mock('../../app_context', () => {
  const actual = jest.requireActual<typeof import('../../app_context')>('../../app_context');

  return {
    ...actual,
    useCore: () => ({
      docLinks: {
        links: {
          plugins: {
            snapshotRestoreRepos: 'https://doc-link',
            s3Repo: 'https://doc-link',
            hdfsRepo: 'https://doc-link',
            azureRepo: 'https://doc-link',
            gcsRepo: 'https://doc-link',
          },
          snapshotRestore: {
            registerSharedFileSystem: 'https://doc-link',
            registerUrl: 'https://doc-link',
            registerSourceOnly: 'https://doc-link',
            guide: 'https://doc-link',
          },
        },
      },
    }),
    useServices: () => ({
      i18n: {
        translate: (_key: string, { defaultMessage }: { defaultMessage: string }) => defaultMessage,
      },
    }),
  };
});

textService.setup(i18n);
breadcrumbService.setup(() => undefined);
docTitleService.setup(() => undefined);

describe('<RepositoryAdd />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('SHOULD set the correct page title', async () => {
    const history = createMemoryHistory({ initialEntries: ['/add_repository'] });

    render(
      <I18nProvider>
        <Router history={history}>
          <RepositoryAdd
            history={history}
            location={history.location}
            match={{ params: {}, isExact: true, path: '', url: '' }}
          />
        </Router>
      </I18nProvider>
    );

    expect(screen.getByTestId('pageTitle')).toHaveTextContent('Register repository');
  });

  it('SHOULD surface API error when save fails', async () => {
    const { addRepository } = await import('../../services/http');
    jest.mocked(addRepository).mockResolvedValueOnce({
      data: null,
      error: {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Repository payload is invalid',
      },
    });

    const history = createMemoryHistory({ initialEntries: ['/add_repository'] });

    render(
      <I18nProvider>
        <Router history={history}>
          <RepositoryAdd
            history={history}
            location={history.location}
            match={{ params: {}, isExact: true, path: '', url: '' }}
          />
        </Router>
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('repositoryFormSave'));

    expect(await screen.findByTestId('saveRepositoryApiError')).toHaveTextContent(
      'Repository payload is invalid'
    );
  });

  it('SHOULD redirect to the repository details page when save succeeds', async () => {
    const { addRepository } = await import('../../services/http');
    jest.mocked(addRepository).mockResolvedValueOnce({ data: null, error: null });

    const history = createMemoryHistory({ initialEntries: ['/add_repository'] });

    render(
      <I18nProvider>
        <Router history={history}>
          <RepositoryAdd
            history={history}
            location={history.location}
            match={{ params: {}, isExact: true, path: '', url: '' }}
          />
        </Router>
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('repositoryFormSave'));

    await waitFor(() => {
      expect(history.location.pathname).toBe('/repositories/my-repo');
    });
  });

  it('SHOULD honor the redirect query param when save succeeds', async () => {
    const { addRepository } = await import('../../services/http');
    jest.mocked(addRepository).mockResolvedValueOnce({ data: null, error: null });

    const history = createMemoryHistory({
      initialEntries: ['/add_repository?redirect=%2Fsomewhere%2Felse'],
    });

    render(
      <I18nProvider>
        <Router history={history}>
          <RepositoryAdd
            history={history}
            location={history.location}
            match={{ params: {}, isExact: true, path: '', url: '' }}
          />
        </Router>
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('repositoryFormSave'));

    await waitFor(() => {
      expect(history.location.pathname).toBe('/somewhere/else');
    });
  });
});
