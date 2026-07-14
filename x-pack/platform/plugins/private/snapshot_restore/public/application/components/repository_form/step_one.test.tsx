/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { i18n } from '@kbn/i18n';

import type { Repository, EmptyRepository, RepositoryType } from '../../../../common/types';
import { textService } from '../../services/text';
import { RepositoryFormStepOne } from './step_one';

/** Build a test repository object, bypassing strict union settings types. */
const testRepo = (overrides: Record<string, unknown>) =>
  overrides as unknown as Repository | EmptyRepository;

const repositoryTypes: RepositoryType[] = ['fs', 'url', 'source', 'azure', 'gcs', 's3', 'hdfs'];

const mockUseLoadRepositoryTypes = jest.fn();

jest.mock('../../services/http', () => {
  const actual = jest.requireActual<typeof import('../../services/http')>('../../services/http');
  return {
    ...actual,
    useLoadRepositoryTypes: (...args: unknown[]) => mockUseLoadRepositoryTypes(...args),
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
  };
});

textService.setup(i18n);

const defaultProps: {
  repository: Repository | EmptyRepository;
  onNext: jest.Mock;
  updateRepository: jest.Mock;
  validation: { isValid: boolean; errors: Record<string, string[]> };
} = {
  repository: { name: '', type: null, settings: {} },
  onNext: jest.fn(),
  updateRepository: jest.fn(),
  validation: { isValid: true, errors: {} },
};

const renderStepOne = (overrides: Partial<typeof defaultProps> = {}) => {
  return render(
    <I18nProvider>
      <RepositoryFormStepOne {...defaultProps} {...overrides} />
    </I18nProvider>
  );
};

describe('<RepositoryFormStepOne />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLoadRepositoryTypes.mockReturnValue({
      isLoading: false,
      error: null,
      data: repositoryTypes,
    });
  });

  describe('WHEN repository types are loaded', () => {
    it('SHOULD render a card for each repository type', () => {
      renderStepOne();

      repositoryTypes.forEach((type) => {
        expect(screen.getByTestId(`${type}RepositoryType`)).toBeInTheDocument();
      });
    });
  });

  describe('WHEN repository types are loading', () => {
    it('SHOULD show a loading indicator', () => {
      mockUseLoadRepositoryTypes.mockReturnValue({
        isLoading: true,
        error: null,
        data: [],
      });

      renderStepOne();

      expect(screen.getByTestId('sectionLoading')).toHaveTextContent('Loading repository types…');
    });
  });

  describe('WHEN repository types are empty', () => {
    it('SHOULD show a no-repository-types error callout', () => {
      mockUseLoadRepositoryTypes.mockReturnValue({
        isLoading: false,
        error: null,
        data: [],
      });

      renderStepOne();

      expect(screen.getByTestId('noRepositoryTypesError')).toHaveTextContent(
        'No repository types available'
      );
    });
  });

  describe('WHEN the next button is clicked', () => {
    it('SHOULD call onNext', () => {
      const onNext = jest.fn();
      renderStepOne({ onNext });

      fireEvent.click(screen.getByTestId('nextButton'));

      expect(onNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('WHEN a repository type card is clicked', () => {
    it('SHOULD call updateRepository with the selected type', () => {
      const updateRepository = jest.fn();
      renderStepOne({ updateRepository });

      fireEvent.click(screen.getByTestId('fsRepositoryType'));

      expect(updateRepository).toHaveBeenCalledWith({
        type: 'fs',
        settings: {},
      });
    });
  });

  describe('WHEN source-only toggle is enabled', () => {
    it('SHOULD call updateRepository with source type and delegateType', () => {
      const updateRepository = jest.fn();
      renderStepOne({
        updateRepository,
        repository: testRepo({ name: 'test', type: 'fs', settings: {} }),
      });

      fireEvent.click(screen.getByTestId('sourceOnlyToggle'));

      expect(updateRepository).toHaveBeenCalledWith({
        type: 'source',
        settings: {
          delegateType: 'fs',
        },
      });
    });
  });

  describe('WHEN source-only toggle is disabled', () => {
    it('SHOULD call updateRepository reverting to the delegate type', () => {
      const updateRepository = jest.fn();
      renderStepOne({
        updateRepository,
        repository: testRepo({ name: 'test', type: 'source', settings: { delegateType: 'fs' } }),
      });

      fireEvent.click(screen.getByTestId('sourceOnlyToggle'));

      expect(updateRepository).toHaveBeenCalledWith({
        type: 'fs',
        settings: {},
      });
    });
  });

  describe('WHEN validation errors exist', () => {
    it('SHOULD display name validation error', () => {
      renderStepOne({
        validation: {
          isValid: false,
          errors: { name: ['Repository name is required.'] },
        },
      });

      expect(screen.getByText('Repository name is required.')).toBeInTheDocument();
    });

    it('SHOULD display type validation error', () => {
      renderStepOne({
        validation: {
          isValid: false,
          errors: { type: ['Type is required.'] },
        },
      });

      expect(screen.getByText('Type is required.')).toBeInTheDocument();
    });

    it('SHOULD display a validation error callout', () => {
      renderStepOne({
        validation: {
          isValid: false,
          errors: { name: ['Repository name is required.'] },
        },
      });

      expect(screen.getByTestId('repositoryFormError')).toBeInTheDocument();
    });
  });
});
