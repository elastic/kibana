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
import { RepositoryEdit } from './repository_edit';

let mockDecodedRepositoryName = 'my-repo';

const mockUseDefaultRepository = jest.fn();
const mockUseCanSetDefaultRepository = jest.fn();
const mockUseLoadRepository = jest.fn();
const mockEditRepository = jest.fn();
const mockToastNotifications = {
  addSuccess: jest.fn(),
  addDanger: jest.fn(),
};

jest.mock('../../lib', () => {
  const actual = jest.requireActual<typeof import('../../lib')>('../../lib');
  return {
    ...actual,
    useDecodedParams: () => ({ name: mockDecodedRepositoryName }),
  };
});

jest.mock('../../components/repository_form', () => ({
  ...jest.requireActual('../../components/repository_form'),
  RepositoryForm: ({
    onSave,
    saveError,
    onToggleDefault,
    isDefaultRepository,
    isDefaultRepositoryFeatureAvailable = true,
  }: {
    onSave: (repository: unknown) => void;
    saveError?: React.ReactNode;
    onToggleDefault?: (isDefault: boolean) => void;
    isDefaultRepository?: boolean;
    isDefaultRepositoryFeatureAvailable?: boolean;
  }) => (
    <div>
      {onToggleDefault ? (
        <button
          data-test-subj="repositoryFormToggleDefault"
          onClick={() => onToggleDefault(!isDefaultRepository)}
          disabled={!isDefaultRepositoryFeatureAvailable}
        >
          toggle default
        </button>
      ) : null}
      <button
        data-test-subj="repositoryFormSave"
        onClick={() =>
          onSave({ name: mockDecodedRepositoryName, type: 'fs', settings: { location: '/tmp' } })
        }
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
    editRepository: (...args: unknown[]) => mockEditRepository(...args),
    useLoadRepository: (...args: unknown[]) => mockUseLoadRepository(...args),
  };
});

jest.mock('../../services/use_default_repository', () => ({
  useDefaultRepository: (...args: unknown[]) => mockUseDefaultRepository(...args),
}));

jest.mock('../../services/authorization', () => ({
  useCanSetDefaultRepository: (...args: unknown[]) => mockUseCanSetDefaultRepository(...args),
}));

jest.mock('../../app_context', () => {
  const actual = jest.requireActual<typeof import('../../app_context')>('../../app_context');

  return {
    ...actual,
    useToastNotifications: () => mockToastNotifications,
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

describe('<RepositoryEdit />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDecodedRepositoryName = 'my-repo';
    mockUseCanSetDefaultRepository.mockReturnValue(true);
    mockUseLoadRepository.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        repository: { name: mockDecodedRepositoryName, type: 'fs', settings: { location: '/tmp' } },
        isManagedRepository: false,
        snapshots: { count: 0 },
      },
    });
    mockEditRepository.mockResolvedValue({ data: null, error: null });
    mockUseDefaultRepository.mockReturnValue({
      defaultRepository: null,
      isLoadingDefaultRepository: false,
      defaultRepositoryStatus: 'loaded',
      setDefaultRepository: jest.fn().mockResolvedValue({ data: null, error: null }),
    });
  });

  it('SHOULD not show default toggle or attempt setting default when missing privilege', async () => {
    mockUseCanSetDefaultRepository.mockReturnValue(false);

    const setDefaultRepository = jest.fn().mockResolvedValue({ data: null, error: null });
    mockUseDefaultRepository.mockReturnValue({
      defaultRepository: 'old-default',
      isLoadingDefaultRepository: false,
      defaultRepositoryStatus: 'loaded',
      setDefaultRepository,
    });

    const history = createMemoryHistory({
      initialEntries: [`/edit_repository/${mockDecodedRepositoryName}`],
    });
    render(
      <I18nProvider>
        <Router history={history}>
          <RepositoryEdit
            history={history}
            location={history.location}
            match={{
              params: { name: mockDecodedRepositoryName },
              isExact: true,
              path: '',
              url: '',
            }}
          />
        </Router>
      </I18nProvider>
    );

    expect(screen.queryByTestId('repositoryFormToggleDefault')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('repositoryFormSave'));

    await waitFor(() => {
      expect(screen.queryByTestId('confirmDefaultRepositoryModal')).not.toBeInTheDocument();
      expect(mockEditRepository).toHaveBeenCalled();
      expect(setDefaultRepository).not.toHaveBeenCalled();
      expect(history.location.pathname).toBe('/repositories');
    });
  });

  it('SHOULD disable default toggle and not attempt setting default when default repository feature is unavailable', async () => {
    const setDefaultRepository = jest.fn().mockResolvedValue({ data: null, error: null });
    mockUseDefaultRepository.mockReturnValue({
      defaultRepository: null,
      isLoadingDefaultRepository: false,
      defaultRepositoryStatus: 'error',
      setDefaultRepository,
    });

    const history = createMemoryHistory({
      initialEntries: [`/edit_repository/${mockDecodedRepositoryName}`],
    });
    render(
      <I18nProvider>
        <Router history={history}>
          <RepositoryEdit
            history={history}
            location={history.location}
            match={{
              params: { name: mockDecodedRepositoryName },
              isExact: true,
              path: '',
              url: '',
            }}
          />
        </Router>
      </I18nProvider>
    );

    expect(screen.getByTestId('repositoryFormToggleDefault')).toBeDisabled();

    fireEvent.click(screen.getByTestId('repositoryFormSave'));

    await waitFor(() => {
      expect(mockEditRepository).toHaveBeenCalled();
      expect(setDefaultRepository).not.toHaveBeenCalled();
      expect(history.location.pathname).toBe('/repositories');
    });
  });

  it('SHOULD show confirm modal when changing an existing default repository', async () => {
    const setDefaultRepository = jest.fn().mockResolvedValue({ data: null, error: null });
    mockUseDefaultRepository.mockReturnValue({
      defaultRepository: 'old-default',
      isLoadingDefaultRepository: false,
      defaultRepositoryStatus: 'loaded',
      setDefaultRepository,
    });

    const history = createMemoryHistory({
      initialEntries: [`/edit_repository/${mockDecodedRepositoryName}`],
    });
    render(
      <I18nProvider>
        <Router history={history}>
          <RepositoryEdit
            history={history}
            location={history.location}
            match={{
              params: { name: mockDecodedRepositoryName },
              isExact: true,
              path: '',
              url: '',
            }}
          />
        </Router>
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('repositoryFormToggleDefault'));
    fireEvent.click(screen.getByTestId('repositoryFormSave'));

    expect(await screen.findByTestId('confirmDefaultRepositoryModal')).toBeInTheDocument();
    expect(mockEditRepository).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.queryByTestId('confirmDefaultRepositoryModal')).not.toBeInTheDocument();
    });
    expect(mockEditRepository).not.toHaveBeenCalled();
    expect(setDefaultRepository).not.toHaveBeenCalled();
  });

  it('SHOULD not show confirm modal when default repository is an empty string', async () => {
    mockEditRepository.mockResolvedValueOnce({ data: null, error: null });

    const setDefaultRepository = jest.fn().mockResolvedValue({ data: null, error: null });
    mockUseDefaultRepository.mockReturnValue({
      defaultRepository: '',
      isLoadingDefaultRepository: false,
      defaultRepositoryStatus: 'loaded',
      setDefaultRepository,
    });

    const history = createMemoryHistory({
      initialEntries: [`/edit_repository/${mockDecodedRepositoryName}`],
    });
    render(
      <I18nProvider>
        <Router history={history}>
          <RepositoryEdit
            history={history}
            location={history.location}
            match={{
              params: { name: mockDecodedRepositoryName },
              isExact: true,
              path: '',
              url: '',
            }}
          />
        </Router>
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('repositoryFormToggleDefault'));
    fireEvent.click(screen.getByTestId('repositoryFormSave'));

    await waitFor(() => {
      expect(screen.queryByTestId('confirmDefaultRepositoryModal')).not.toBeInTheDocument();
      expect(mockEditRepository).toHaveBeenCalled();
      expect(setDefaultRepository).toHaveBeenCalledWith(mockDecodedRepositoryName);
      expect(history.location.pathname).toBe('/repositories');
    });
  });

  it('SHOULD save and set default after confirming default repository change', async () => {
    mockEditRepository.mockResolvedValueOnce({ data: null, error: null });

    const setDefaultRepository = jest.fn().mockResolvedValue({ data: null, error: null });
    mockUseDefaultRepository.mockReturnValue({
      defaultRepository: 'old-default',
      isLoadingDefaultRepository: false,
      defaultRepositoryStatus: 'loaded',
      setDefaultRepository,
    });

    const history = createMemoryHistory({
      initialEntries: [`/edit_repository/${mockDecodedRepositoryName}`],
    });
    render(
      <I18nProvider>
        <Router history={history}>
          <RepositoryEdit
            history={history}
            location={history.location}
            match={{
              params: { name: mockDecodedRepositoryName },
              isExact: true,
              path: '',
              url: '',
            }}
          />
        </Router>
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('repositoryFormToggleDefault'));
    fireEvent.click(screen.getByTestId('repositoryFormSave'));
    expect(await screen.findByTestId('confirmDefaultRepositoryModal')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Change default'));

    await waitFor(() => {
      expect(mockEditRepository).toHaveBeenCalled();
      expect(setDefaultRepository).toHaveBeenCalledWith(mockDecodedRepositoryName);
      expect(history.location.pathname).toBe('/repositories');
    });
  });

  it('SHOULD show danger toast when setting default fails, but still save repository', async () => {
    mockEditRepository.mockResolvedValueOnce({ data: null, error: null });

    const setDefaultRepository = jest.fn().mockResolvedValue({
      data: null,
      error: { statusCode: 500, error: 'Internal Server Error', message: 'fail' },
    });
    mockUseDefaultRepository.mockReturnValue({
      defaultRepository: null,
      isLoadingDefaultRepository: false,
      defaultRepositoryStatus: 'loaded',
      setDefaultRepository,
    });

    const history = createMemoryHistory({
      initialEntries: [`/edit_repository/${mockDecodedRepositoryName}`],
    });
    render(
      <I18nProvider>
        <Router history={history}>
          <RepositoryEdit
            history={history}
            location={history.location}
            match={{
              params: { name: mockDecodedRepositoryName },
              isExact: true,
              path: '',
              url: '',
            }}
          />
        </Router>
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('repositoryFormToggleDefault'));
    fireEvent.click(screen.getByTestId('repositoryFormSave'));

    await waitFor(() => {
      expect(mockToastNotifications.addDanger).toHaveBeenCalled();
      expect(mockToastNotifications.addSuccess).toHaveBeenCalled();
      expect(history.location.pathname).toBe('/repositories');
    });
  });
});
