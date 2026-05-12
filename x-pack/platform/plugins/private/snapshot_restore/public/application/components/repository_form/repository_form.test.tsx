/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@kbn/code-editor-mock/jest_helper';

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { i18n } from '@kbn/i18n';

import type { RepositoryType } from '../../../../common/types';
import { textService } from '../../services/text';
import { RepositoryForm } from './repository_form';

const repositoryTypes: RepositoryType[] = ['fs', 'url', 'source', 'azure', 'gcs', 's3', 'hdfs'];

jest.mock('../../services/http', () => {
  const actual = jest.requireActual<typeof import('../../services/http')>('../../services/http');
  return {
    ...actual,
    useLoadRepositoryTypes: jest.fn().mockReturnValue({
      isLoading: false,
      error: null,
      data: repositoryTypes,
    }),
  };
});

const mockDocLinks = {
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
};

jest.mock('../../app_context', () => {
  const actual = jest.requireActual<typeof import('../../app_context')>('../../app_context');

  return {
    ...actual,
    useCore: () => ({ docLinks: mockDocLinks }),
    useServices: () => ({
      i18n: {
        translate: (_key: string, { defaultMessage }: { defaultMessage: string }) => defaultMessage,
      },
    }),
  };
});

textService.setup(i18n);

const emptyRepository = { name: '', type: null, settings: {} };

const onSaveMock = jest.fn();
const clearSaveErrorMock = jest.fn();

const renderForm = (overrides: Record<string, unknown> = {}) => {
  return render(
    <I18nProvider>
      <RepositoryForm
        repository={emptyRepository}
        isSaving={false}
        saveError={undefined}
        clearSaveError={clearSaveErrorMock}
        onSave={onSaveMock}
        {...overrides}
      />
    </I18nProvider>
  );
};

/**
 * Render the form directly on step 2 by passing `isEditing: true`
 * with a pre-populated repository. This skips rendering step 1
 * (which has 7 expensive EuiCard components) and keeps tests fast.
 */
const renderOnStepTwo = (type: RepositoryType, name: string) => {
  renderForm({
    repository: { name, type, settings: {} },
    isEditing: true,
  });
};

const goToStepTwo = (name: string, type: RepositoryType) => {
  fireEvent.change(screen.getByTestId('nameInput'), { target: { value: name } });
  fireEvent.click(screen.getByTestId(`${type}RepositoryType`));
  fireEvent.click(screen.getByTestId('nextButton'));
};

describe('<RepositoryForm />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('step navigation', () => {
    describe('WHEN the form renders', () => {
      it('SHOULD show step 1 initially', () => {
        renderForm();

        expect(screen.getByTestId('nextButton')).toBeInTheDocument();
        expect(screen.getByTestId('nameInput')).toBeInTheDocument();
      });
    });

    describe('WHEN step 1 fields are missing and next is clicked', () => {
      it('SHOULD not proceed to step 2 and show validation errors', () => {
        renderForm();

        fireEvent.click(screen.getByTestId('nextButton'));

        expect(screen.queryByTestId('stepTwo')).not.toBeInTheDocument();
        expect(screen.getAllByText('Repository name is required.').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Type is required.').length).toBeGreaterThan(0);
      });
    });

    describe('WHEN step 1 is valid and next is clicked', () => {
      it('SHOULD navigate to step 2', () => {
        renderForm();
        goToStepTwo('my-repo', 'fs');

        expect(screen.getByTestId('stepTwo')).toBeInTheDocument();
      });
    });

    describe('WHEN the back button is clicked on step 2', () => {
      it('SHOULD navigate back to step 1', () => {
        renderForm();
        goToStepTwo('my-repo', 'fs');

        expect(screen.getByTestId('stepTwo')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('backButton'));

        expect(screen.getByTestId('nameInput')).toBeInTheDocument();
        expect(screen.queryByTestId('stepTwo')).not.toBeInTheDocument();
      });
    });
  });

  describe('form payload', () => {
    describe('WHEN submitting an FS repository', () => {
      it('SHOULD call onSave with the correct payload', () => {
        renderOnStepTwo('fs', 'my-fs-repo');

        fireEvent.change(screen.getByTestId('locationInput'), {
          target: { value: '/tmp/es-backups' },
        });
        fireEvent.click(screen.getByTestId('compressToggle'));
        fireEvent.change(screen.getByTestId('chunkSizeInput'), {
          target: { value: '10mb' },
        });
        fireEvent.change(screen.getByTestId('maxSnapshotBytesInput'), {
          target: { value: '1g' },
        });
        fireEvent.change(screen.getByTestId('maxRestoreBytesInput'), {
          target: { value: '1g' },
        });
        fireEvent.click(screen.getByTestId('readOnlyToggle'));

        fireEvent.click(screen.getByTestId('submitButton'));

        expect(onSaveMock).toHaveBeenCalledWith({
          name: 'my-fs-repo',
          type: 'fs',
          settings: {
            location: '/tmp/es-backups',
            compress: false,
            chunkSize: '10mb',
            maxSnapshotBytesPerSec: '1g',
            maxRestoreBytesPerSec: '1g',
            readonly: true,
          },
        });
      });
    });

    describe('WHEN submitting an Azure repository', () => {
      it('SHOULD call onSave with the correct payload', () => {
        renderOnStepTwo('azure', 'my-azure-repo');

        fireEvent.change(screen.getByTestId('clientInput'), { target: { value: 'client' } });
        fireEvent.change(screen.getByTestId('containerInput'), {
          target: { value: 'container' },
        });
        fireEvent.change(screen.getByTestId('basePathInput'), { target: { value: 'path' } });
        fireEvent.click(screen.getByTestId('compressToggle'));
        fireEvent.click(screen.getByTestId('readOnlyToggle'));

        fireEvent.click(screen.getByTestId('submitButton'));

        expect(onSaveMock).toHaveBeenCalledWith({
          name: 'my-azure-repo',
          type: 'azure',
          settings: {
            client: 'client',
            container: 'container',
            basePath: 'path',
            compress: false,
            readonly: true,
          },
        });
      });
    });

    describe('WHEN submitting a GCS repository', () => {
      it('SHOULD call onSave with the correct payload', () => {
        renderOnStepTwo('gcs', 'my-gcs-repo');

        fireEvent.change(screen.getByTestId('clientInput'), {
          target: { value: 'test_client' },
        });
        fireEvent.change(screen.getByTestId('bucketInput'), {
          target: { value: 'test_bucket' },
        });
        fireEvent.change(screen.getByTestId('basePathInput'), {
          target: { value: 'test_path' },
        });
        fireEvent.click(screen.getByTestId('compressToggle'));
        fireEvent.click(screen.getByTestId('readOnlyToggle'));

        fireEvent.click(screen.getByTestId('submitButton'));

        expect(onSaveMock).toHaveBeenCalledWith({
          name: 'my-gcs-repo',
          type: 'gcs',
          settings: {
            client: 'test_client',
            bucket: 'test_bucket',
            basePath: 'test_path',
            compress: false,
            readonly: true,
          },
        });
      });
    });

    describe('WHEN submitting an HDFS repository', () => {
      it('SHOULD call onSave with the correct payload', () => {
        renderOnStepTwo('hdfs', 'my-hdfs-repo');

        fireEvent.change(screen.getByTestId('uriInput'), { target: { value: 'uri' } });
        fireEvent.change(screen.getByTestId('pathInput'), { target: { value: 'test_path' } });
        fireEvent.click(screen.getByTestId('compressToggle'));
        fireEvent.click(screen.getByTestId('readOnlyToggle'));

        fireEvent.click(screen.getByTestId('submitButton'));

        expect(onSaveMock).toHaveBeenCalledWith({
          name: 'my-hdfs-repo',
          type: 'hdfs',
          settings: {
            uri: 'hdfs://uri',
            path: 'test_path',
            compress: false,
            readonly: true,
          },
        });
      });
    });

    describe('WHEN submitting an S3 repository', () => {
      it('SHOULD call onSave with the correct payload', () => {
        renderOnStepTwo('s3', 'my-s3-repo');

        fireEvent.change(screen.getByTestId('bucketInput'), {
          target: { value: 'test_bucket' },
        });
        fireEvent.change(screen.getByTestId('clientInput'), {
          target: { value: 'test_client' },
        });
        fireEvent.change(screen.getByTestId('basePathInput'), {
          target: { value: 'test_path' },
        });
        fireEvent.change(screen.getByTestId('bufferSizeInput'), {
          target: { value: '1g' },
        });
        fireEvent.click(screen.getByTestId('compressToggle'));
        fireEvent.click(screen.getByTestId('readOnlyToggle'));

        fireEvent.click(screen.getByTestId('submitButton'));

        expect(onSaveMock).toHaveBeenCalledWith({
          name: 'my-s3-repo',
          type: 's3',
          settings: {
            bucket: 'test_bucket',
            client: 'test_client',
            basePath: 'test_path',
            bufferSize: '1g',
            compress: false,
            readonly: true,
          },
        });
      });
    });

    describe('WHEN submitting a source-only FS repository', () => {
      it('SHOULD call onSave with delegateType in the payload', () => {
        renderForm();

        fireEvent.change(screen.getByTestId('nameInput'), {
          target: { value: 'my-source-repo' },
        });
        fireEvent.click(screen.getByTestId('fsRepositoryType'));
        fireEvent.click(screen.getByTestId('sourceOnlyToggle'));
        fireEvent.click(screen.getByTestId('nextButton'));

        expect(screen.getByTestId('stepTwo')).toBeInTheDocument();

        fireEvent.change(screen.getByTestId('locationInput'), {
          target: { value: '/tmp/es-backups' },
        });

        fireEvent.click(screen.getByTestId('submitButton'));

        expect(onSaveMock).toHaveBeenCalledWith({
          name: 'my-source-repo',
          type: 'source',
          settings: {
            delegateType: 'fs',
            location: '/tmp/es-backups',
          },
        });
      });
    });
  });

  describe('S3 storage class settings', () => {
    describe('WHEN intelligent_tiering storage class is selected', () => {
      it('SHOULD call onSave with the correct storageClass', () => {
        renderOnStepTwo('s3', 'my-s3-repo');

        fireEvent.change(screen.getByTestId('bucketInput'), {
          target: { value: 'test_bucket' },
        });
        fireEvent.change(screen.getByTestId('storageClassSelect'), {
          target: { value: 'intelligent_tiering' },
        });

        fireEvent.click(screen.getByTestId('submitButton'));

        expect(onSaveMock).toHaveBeenCalledWith(
          expect.objectContaining({
            settings: expect.objectContaining({
              bucket: 'test_bucket',
              storageClass: 'intelligent_tiering',
            }),
          })
        );
      });
    });

    describe('WHEN onezone_ia storage class is selected', () => {
      it('SHOULD call onSave with the correct storageClass', () => {
        renderOnStepTwo('s3', 'my-s3-repo');

        fireEvent.change(screen.getByTestId('bucketInput'), {
          target: { value: 'test_bucket' },
        });
        fireEvent.change(screen.getByTestId('storageClassSelect'), {
          target: { value: 'onezone_ia' },
        });

        fireEvent.click(screen.getByTestId('submitButton'));

        expect(onSaveMock).toHaveBeenCalledWith(
          expect.objectContaining({
            settings: expect.objectContaining({
              bucket: 'test_bucket',
              storageClass: 'onezone_ia',
            }),
          })
        );
      });
    });
  });

  describe('WHEN a save error is provided', () => {
    it('SHOULD display the save error on step 2', () => {
      renderForm({
        repository: { name: 'my-repo', type: 'fs', settings: { location: '/tmp' } },
        isEditing: true,
        saveError: <div data-test-subj="saveRepositoryApiError">Repository payload is invalid</div>,
      });

      expect(screen.getByTestId('saveRepositoryApiError')).toHaveTextContent(
        'Repository payload is invalid'
      );
    });
  });

  describe('WHEN step 2 settings validation fails', () => {
    it('SHOULD not call onSave and show validation errors', () => {
      renderOnStepTwo('fs', 'my-fs-repo');

      fireEvent.click(screen.getByTestId('submitButton'));

      expect(onSaveMock).not.toHaveBeenCalled();
      expect(screen.getAllByText('Location is required.').length).toBeGreaterThan(0);
    });
  });
});
