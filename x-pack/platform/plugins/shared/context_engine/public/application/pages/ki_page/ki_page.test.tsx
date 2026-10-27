/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { APP_MENU_TEST_SUBJECTS } from '@kbn/app-menu';
import { ChromeServiceProvider } from '@kbn/core-chrome-browser-context';
import { coreMock, scopedHistoryMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { createMemoryHistory } from 'history';
import { Route, Router } from '@kbn/shared-ux-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { GetKiResponse } from '../../../../common/http_api/knowledge_indicators';
import { uiPrivileges } from '../../../../common/features';
import { CONTEXT_ENGINE_BACK_BUTTON_TEST_SUBJ } from '../../layout/context_engine_page_header';
import {
  getAiIndexKnowledgeIndicatorsPath,
  getViewKiDocumentPath,
  getViewKiPath,
  CONTEXT_ENGINE_PATHS,
} from '../../paths';
import { createAppChromeMock } from '../../test_utils/app_chrome_mock';
import { KiPage } from './ki_page';

const mockUseKi = jest.fn();
const mockNavigateToContextEngine = jest.fn();
const mockCreateContextEngineUrl = jest.fn((path: string, params?: Record<string, string>) => {
  const queryParams = new URLSearchParams(params);
  return queryParams.size ? `${path}?${queryParams}` : path;
});
const mockUpdateMutate = jest.fn();
const mockDeleteMutateAsync = jest.fn();
const mockRestoreMutateAsync = jest.fn();

jest.mock('../../hooks/use_ki', () => ({
  useKi: (args: { aiIndexId: string; kiId: string; index: string; enabled?: boolean }) =>
    mockUseKi(args),
}));

jest.mock('../../hooks/use_navigation', () => ({
  useNavigation: () => ({
    createContextEngineUrl: mockCreateContextEngineUrl,
    navigateToContextEngine: mockNavigateToContextEngine,
  }),
}));

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiMarkdownEditor: ({
      value,
      onChange,
      'data-test-subj': testSubj,
    }: {
      value: string;
      onChange: (next: string) => void;
      'data-test-subj'?: string;
    }) => (
      <textarea
        data-test-subj={testSubj}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    ),
  };
});

jest.mock('../../hooks/use_ki_mutations', () => ({
  useUpdateKi: () => ({
    mutate: mockUpdateMutate,
    isLoading: false,
  }),
  useDeleteKi: () => ({
    mutateAsync: mockDeleteMutateAsync,
    isLoading: false,
  }),
  useRestoreKi: () => ({
    mutateAsync: mockRestoreMutateAsync,
    isLoading: false,
  }),
}));

const defaultKi: GetKiResponse = {
  id: 'ki-1',
  document: {
    title: 'Refund playbook',
    content: '# Hello',
    type: 'playbook',
  },
};

const renderKiPage = (initialEntry: string, { canWrite = false }: { canWrite?: boolean } = {}) => {
  const services = coreMock.createStart();
  services.application.getUrlForApp.mockImplementation(
    (appId, options) => `/app/${appId}${options?.path ?? ''}`
  );
  services.application.capabilities = {
    ...services.application.capabilities,
    contextEngine: {
      show: true,
      [uiPrivileges.write]: canWrite,
    },
  };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const history = createMemoryHistory({ initialEntries: [initialEntry] });

  const view = render(
    <ChromeServiceProvider value={{ chrome: services.chrome }}>
      <I18nProvider>
        <EuiProvider>
          <KibanaContextProvider
            services={{
              ...services,
              appChrome: createAppChromeMock(),
              history: scopedHistoryMock.create(),
            }}
          >
            <QueryClientProvider client={queryClient}>
              <Router history={history}>
                <Route
                  path={[CONTEXT_ENGINE_PATHS.viewKi, CONTEXT_ENGINE_PATHS.viewKiDocument]}
                  component={KiPage}
                />
              </Router>
            </QueryClientProvider>
          </KibanaContextProvider>
        </EuiProvider>
      </I18nProvider>
    </ChromeServiceProvider>
  );

  return { ...view, history };
};

const openHeaderOverflowMenu = async () => {
  fireEvent.click(await screen.findByTestId(APP_MENU_TEST_SUBJECTS.overflowButton));
};

describe('KiPage', () => {
  beforeEach(() => {
    mockUseKi.mockReturnValue({
      ki: defaultKi,
      isLoading: false,
      error: undefined,
    });
    mockDeleteMutateAsync.mockResolvedValue(undefined);
    mockRestoreMutateAsync.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('back button links to the knowledge indicators tab', () => {
    const kiListPath = getAiIndexKnowledgeIndicatorsPath('sample-ki');

    renderKiPage('/ai_index/sample-ki/ki/ki-1?index=ai-index-idx-sample-ki');

    expect(mockCreateContextEngineUrl).toHaveBeenCalledWith(kiListPath);
    expect(screen.getByTestId(CONTEXT_ENGINE_BACK_BUTTON_TEST_SUBJ)).toHaveAttribute(
      'href',
      kiListPath
    );
  });

  it('navigates to the knowledge indicators tab on back click', () => {
    const kiListPath = getAiIndexKnowledgeIndicatorsPath('sample-ki');

    renderKiPage('/ai_index/sample-ki/ki/ki-1?index=ai-index-idx-sample-ki');

    fireEvent.click(screen.getByTestId(CONTEXT_ENGINE_BACK_BUTTON_TEST_SUBJ));

    expect(mockNavigateToContextEngine).toHaveBeenCalledWith(kiListPath);
  });

  it('resolves kiId from a path built with getViewKiPath when the id contains %', () => {
    renderKiPage(`${getViewKiPath('sample-ki', 'ki-1%2')}?index=ai-index-idx-sample-ki`);

    expect(mockUseKi).toHaveBeenCalledWith(
      expect.objectContaining({
        aiIndexId: 'sample-ki',
        kiId: 'ki-1%2',
        index: 'ai-index-idx-sample-ki',
      })
    );
  });

  it('resolves kiId from a path built with getViewKiPath when the id contains a slash', () => {
    renderKiPage(`${getViewKiPath('sample-ki', 'a/b')}?index=ai-index-idx-sample-ki`);

    expect(mockUseKi).toHaveBeenCalledWith(
      expect.objectContaining({
        aiIndexId: 'sample-ki',
        kiId: 'a/b',
        index: 'ai-index-idx-sample-ki',
      })
    );
  });

  it('does not crash when a KI id contains a literal %-escape-like substring', () => {
    renderKiPage(`${getViewKiPath('sample-ki', 'a%41b')}?index=ai-index-idx-sample-ki`);

    expect(mockUseKi).toHaveBeenCalled();
  });

  it('renders missing index prompt when index query param is absent', () => {
    renderKiPage('/ai_index/sample-ki/ki/ki-1');

    expect(screen.getByTestId('contextViewKiMissingIndex')).toBeInTheDocument();
    expect(mockUseKi).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it('renders error prompt when useKi returns an error', () => {
    mockUseKi.mockReturnValue({
      ki: undefined,
      isLoading: false,
      error: new Error('boom'),
    });

    renderKiPage('/ai_index/sample-ki/ki/ki-1?index=ai-index-idx-sample-ki');

    expect(screen.getByTestId('contextViewKiError')).toHaveTextContent('boom');
  });

  it('renders loading skeletons while useKi is loading', () => {
    mockUseKi.mockReturnValue({
      ki: undefined,
      isLoading: true,
      error: undefined,
    });

    renderKiPage('/ai_index/sample-ki/ki/ki-1?index=ai-index-idx-sample-ki');

    expect(screen.getByTestId('contextViewKiTab-details')).toBeInTheDocument();
    expect(screen.getByTestId('contextViewKiTab-document')).toBeInTheDocument();
    expect(screen.getByTestId('contextViewKiContentLayout')).toBeInTheDocument();
    expect(screen.getByTestId('contextViewKiContentLoading')).toBeInTheDocument();
    expect(screen.getByTestId('contextViewKiMetadataLoading')).toBeInTheDocument();
  });

  it('renders document tab loading skeleton while useKi is loading', () => {
    mockUseKi.mockReturnValue({
      ki: undefined,
      isLoading: true,
      error: undefined,
    });

    renderKiPage(`${getViewKiDocumentPath('sample-ki', 'ki-1')}?index=ai-index-idx-sample-ki`);

    expect(screen.getByTestId('contextViewKiRawJsonLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('contextViewKiContentLayout')).not.toBeInTheDocument();
  });

  it('renders details tab by default and links the document tab to the document path', () => {
    renderKiPage('/ai_index/sample-ki/ki/ki-1?index=ai-index-idx-sample-ki');

    expect(screen.getByTestId('contextViewKiContentLayout')).toBeInTheDocument();
    expect(screen.queryByTestId('contextViewKiRawJsonPanel')).not.toBeInTheDocument();

    expect(screen.getByTestId('contextViewKiTab-document')).toHaveAttribute(
      'href',
      `${getViewKiDocumentPath('sample-ki', 'ki-1')}?index=ai-index-idx-sample-ki`
    );
    expect(screen.getByTestId('contextViewKiTab-details')).toHaveAttribute(
      'href',
      `${getViewKiPath('sample-ki', 'ki-1')}?index=ai-index-idx-sample-ki`
    );
  });

  it('renders the raw JSON panel on the document tab route', () => {
    renderKiPage(`${getViewKiDocumentPath('sample-ki', 'ki-1')}?index=ai-index-idx-sample-ki`);

    expect(screen.getByTestId('contextViewKiRawJsonPanel')).toBeInTheDocument();
    expect(screen.queryByTestId('contextViewKiContentLayout')).not.toBeInTheDocument();
  });

  it('renders type badge when document has a type', () => {
    renderKiPage('/ai_index/sample-ki/ki/ki-1?index=ai-index-idx-sample-ki');

    expect(screen.getByTestId('contextViewKiTypeBadge')).toHaveTextContent('playbook');
  });

  it('renders deleted badge when lifecycle status is deleted', () => {
    mockUseKi.mockReturnValue({
      ki: {
        ...defaultKi,
        document: {
          ...defaultKi.document,
          governance: { lifecycle: { status: 'deleted' } },
        },
      },
      isLoading: false,
      error: undefined,
    });

    renderKiPage('/ai_index/sample-ki/ki/ki-1?index=ai-index-idx-sample-ki');

    expect(screen.getByTestId('contextViewKiStatusBadge')).toHaveTextContent('deleted');
  });

  it('renders expired status badge when expires_at is in the past', () => {
    jest.useFakeTimers();
    jest.setSystemTime(Date.parse('2026-06-15T12:00:00.000Z'));

    mockUseKi.mockReturnValue({
      ki: {
        ...defaultKi,
        document: {
          ...defaultKi.document,
          expires_at: '2020-01-01T00:00:00.000Z',
        },
      },
      isLoading: false,
      error: undefined,
    });

    renderKiPage('/ai_index/sample-ki/ki/ki-1?index=ai-index-idx-sample-ki');

    expect(screen.getByTestId('contextViewKiStatusBadge')).toHaveTextContent('expired');

    jest.useRealTimers();
  });

  it('does not render status badge for active lifecycle', () => {
    mockUseKi.mockReturnValue({
      ki: {
        ...defaultKi,
        document: {
          ...defaultKi.document,
          governance: { lifecycle: { status: 'active' } },
        },
      },
      isLoading: false,
      error: undefined,
    });

    renderKiPage('/ai_index/sample-ki/ki/ki-1?index=ai-index-idx-sample-ki');

    expect(screen.queryByTestId('contextViewKiStatusBadge')).not.toBeInTheDocument();
  });

  it('does not show delete or edit actions without write privilege', () => {
    renderKiPage('/ai_index/sample-ki/ki/ki-1?index=ai-index-idx-sample-ki');

    expect(screen.queryByTestId('contextViewKiDeleteButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextViewKiEditButton')).not.toBeInTheDocument();
  });

  it('shows edit primary action and delete overflow when user can write', async () => {
    renderKiPage('/ai_index/sample-ki/ki/ki-1?index=ai-index-idx-sample-ki', {
      canWrite: true,
    });

    expect(await screen.findByTestId('contextViewKiEditButton')).toBeInTheDocument();

    await openHeaderOverflowMenu();
    expect(screen.getByTestId('contextViewKiDeleteButton')).toBeInTheDocument();
  });

  it('opens delete confirm modal and calls delete mutation on confirm', async () => {
    renderKiPage('/ai_index/sample-ki/ki/ki-1?index=ai-index-idx-sample-ki', {
      canWrite: true,
    });

    await openHeaderOverflowMenu();
    fireEvent.click(screen.getByTestId('contextViewKiDeleteButton'));
    expect(screen.getByTestId('contextViewKiDeleteConfirmModal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    await waitFor(() => {
      expect(mockDeleteMutateAsync).toHaveBeenCalled();
    });
    expect(mockNavigateToContextEngine).not.toHaveBeenCalled();
  });

  it('shows restore primary action when KI is deleted and user can write', async () => {
    mockUseKi.mockReturnValue({
      ki: {
        ...defaultKi,
        document: {
          ...defaultKi.document,
          governance: { lifecycle: { status: 'deleted' } },
        },
      },
      isLoading: false,
      error: undefined,
    });

    renderKiPage('/ai_index/sample-ki/ki/ki-1?index=ai-index-idx-sample-ki', {
      canWrite: true,
    });

    expect(await screen.findByTestId('contextViewKiRestoreButton')).toBeInTheDocument();
    expect(screen.queryByTestId('contextViewKiDeleteButton')).not.toBeInTheDocument();
  });

  it('saves edited content and exits edit mode', async () => {
    mockUpdateMutate.mockImplementation((_vars, options) => {
      options?.onSuccess?.({ id: 'ki-1', status: 'updated' });
    });

    renderKiPage('/ai_index/sample-ki/ki/ki-1?index=ai-index-idx-sample-ki', {
      canWrite: true,
    });

    fireEvent.click(await screen.findByTestId('contextViewKiEditButton'));

    fireEvent.change(screen.getByTestId('contextViewKiContentField'), {
      target: { value: 'Updated from page' },
    });
    fireEvent.click(screen.getByTestId('contextViewKiSaveButton'));

    await waitFor(() => {
      expect(mockUpdateMutate).toHaveBeenCalledWith(
        { content: 'Updated from page' },
        expect.any(Object)
      );
    });
    expect(screen.queryByTestId('contextViewKiContentEditing')).not.toBeInTheDocument();
  });

  it('opens restore confirm modal and calls restore mutation on confirm', async () => {
    mockUseKi.mockReturnValue({
      ki: {
        ...defaultKi,
        document: {
          ...defaultKi.document,
          governance: { lifecycle: { status: 'deleted' } },
        },
      },
      isLoading: false,
      error: undefined,
    });

    renderKiPage('/ai_index/sample-ki/ki/ki-1?index=ai-index-idx-sample-ki', {
      canWrite: true,
    });

    fireEvent.click(await screen.findByTestId('contextViewKiRestoreButton'));
    expect(screen.getByTestId('contextViewKiRestoreConfirmModal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    await waitFor(() => {
      expect(mockRestoreMutateAsync).toHaveBeenCalled();
    });
  });

  it('keeps document tab href while editing content', async () => {
    renderKiPage('/ai_index/sample-ki/ki/ki-1?index=ai-index-idx-sample-ki', {
      canWrite: true,
    });

    fireEvent.click(await screen.findByTestId('contextViewKiEditButton'));

    expect(screen.getByTestId('contextViewKiTab-document')).toHaveAttribute(
      'href',
      `${getViewKiDocumentPath('sample-ki', 'ki-1')}?index=ai-index-idx-sample-ki`
    );
  });

  it('exits edit mode when switching tabs so returning to content is not treated as unsaved', async () => {
    const contentPath = '/ai_index/sample-ki/ki/ki-1?index=ai-index-idx-sample-ki';
    const documentPath = `${getViewKiDocumentPath(
      'sample-ki',
      'ki-1'
    )}?index=ai-index-idx-sample-ki`;

    const { history } = renderKiPage(contentPath, { canWrite: true });

    fireEvent.click(await screen.findByTestId('contextViewKiEditButton'));
    expect(screen.getByTestId('contextViewKiContentEditing')).toBeInTheDocument();

    history.push(documentPath);
    await waitFor(() => {
      expect(screen.getByTestId('contextViewKiRawJsonPanel')).toBeInTheDocument();
    });

    history.push(contentPath);
    await waitFor(() => {
      expect(screen.getByTestId('contextViewKiEditButton')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('contextViewKiContentEditing')).not.toBeInTheDocument();
  });

  it('navigates back via context engine routing when back is clicked', async () => {
    renderKiPage('/ai_index/sample-ki/ki/ki-1?index=ai-index-idx-sample-ki', {
      canWrite: true,
    });

    fireEvent.click(screen.getByTestId(CONTEXT_ENGINE_BACK_BUTTON_TEST_SUBJ));

    expect(mockNavigateToContextEngine).toHaveBeenCalledWith(
      getAiIndexKnowledgeIndicatorsPath('sample-ki')
    );
  });

  it('enters content edit mode from the header edit action and hides the delete action', async () => {
    renderKiPage('/ai_index/sample-ki/ki/ki-1?index=ai-index-idx-sample-ki', {
      canWrite: true,
    });

    fireEvent.click(await screen.findByTestId('contextViewKiEditButton'));

    expect(screen.getByTestId('contextViewKiContentEditing')).toBeInTheDocument();
    expect(screen.queryByTestId('contextViewKiDeleteButton')).not.toBeInTheDocument();
  });
});
