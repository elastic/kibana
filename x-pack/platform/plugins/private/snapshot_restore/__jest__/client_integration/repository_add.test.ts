/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './helpers/mocks';

import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { INVALID_NAME_CHARS } from '../../public/application/services/validation/validate_repository';
import { API_BASE_PATH } from '../../common';
import { getRepository } from '../../test/fixtures';
import type { RepositoryType } from '../../common/types';
import { setupEnvironment } from './helpers/setup_environment';
import { renderApp } from './helpers/render_app';

const repositoryTypes = ['fs', 'url', 'source', 'azure', 'gcs', 's3', 'hdfs'];

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

const createDeferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

const waitForRepositoryTypesToLoad = async () => {
  await waitFor(() => {
    expect(screen.queryByTestId('sectionLoading')).not.toBeInTheDocument();
  });
  await screen.findByTestId(`${repositoryTypes[0]}RepositoryType`);
};

const waitForNoRepositoryTypesError = async () => {
  await waitFor(() => {
    expect(screen.queryByTestId('sectionLoading')).not.toBeInTheDocument();
  });
  await screen.findByTestId('noRepositoryTypesError');
};

describe('<RepositoryAdd />', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRepositoryTypesResponse(repositoryTypes);
      renderApp(httpSetup, { initialEntries: ['/add_repository'] });
      await waitForRepositoryTypesToLoad();
    });

    test('should set the correct page title', async () => {
      const pageTitle = await screen.findByTestId('pageTitle');
      expect(pageTitle).toHaveTextContent('Register repository');
    });

    test('should not let the user go to the next step if some fields are missing', async () => {
      await screen.findByTestId('nextButton');
      fireEvent.click(screen.getByTestId('nextButton'));

      // Error text can appear both in the form-wide error summary and the field-level error.
      expect(screen.getAllByText('Repository name is required.').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Type is required.').length).toBeGreaterThan(0);
    });
  });

  describe('loading states', () => {
    test('should indicate that the repository types are loading', async () => {
      const typesDeferred = createDeferred<string[]>();
      // Promise cast needed: mock helper signature doesn't explicitly allow Promise for loading-state tests
      httpRequestsMockHelpers.setLoadRepositoryTypesResponse(
        typesDeferred.promise as unknown as string[]
      );

      renderApp(httpSetup, { initialEntries: ['/add_repository'] });

      const loading = await screen.findByTestId('sectionLoading');
      expect(loading).toHaveTextContent('Loading repository types…');

      // Resolve to avoid leaving a dangling request.
      typesDeferred.resolve(repositoryTypes);
      await waitForRepositoryTypesToLoad();
    });
  });

  describe('when no repository types are not found', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRepositoryTypesResponse([]);
      renderApp(httpSetup, { initialEntries: ['/add_repository'] });
      await waitForNoRepositoryTypesError();
    });

    test('should show an error callout  ', async () => {
      const callout = screen.getByTestId('noRepositoryTypesError');
      expect(callout).toHaveTextContent('No repository types available');
    });
  });

  describe('when repository types are found', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRepositoryTypesResponse(repositoryTypes);
      renderApp(httpSetup, { initialEntries: ['/add_repository'] });
      await waitForRepositoryTypesToLoad();
    });

    test('should have 1 card for each repository type', async () => {
      repositoryTypes.forEach((type) => {
        expect(screen.getByTestId(`${type}RepositoryType`)).toBeInTheDocument();
      });
    });
  });

  describe('form validations', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRepositoryTypesResponse(repositoryTypes);
      renderApp(httpSetup, { initialEntries: ['/add_repository'] });
      await waitForRepositoryTypesToLoad();
    });

    describe('name (step 1)', () => {
      it('should not allow spaces in the name', async () => {
        await screen.findByTestId('nameInput');
        fireEvent.change(screen.getByTestId('nameInput'), { target: { value: 'with space' } });
        fireEvent.click(screen.getByTestId('nextButton'));

        // Error text can appear both in the form-wide error summary and the field-level error.
        expect(screen.getAllByText('Spaces are not allowed in the name.').length).toBeGreaterThan(
          0
        );
      });

      it('should not allow invalid characters', async () => {
        await screen.findByTestId('nameInput');

        const expectErrorForChar = (char: string) => {
          fireEvent.change(screen.getByTestId('nameInput'), { target: { value: `with${char}` } });
          fireEvent.click(screen.getByTestId('nextButton'));

          // Error text can appear both in the form-wide error summary and the field-level error.
          expect(
            screen.getAllByText(`Character "${char}" is not allowed in the name.`).length
          ).toBeGreaterThan(0);
        };

        INVALID_NAME_CHARS.forEach(expectErrorForChar);
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/248548
    describe.skip('settings (step 2)', () => {
      const typeToErrorMessagesMap: Record<string, string[]> = {
        fs: ['Location is required.'],
        url: ['URL is required.'],
        s3: ['Bucket is required.'],
        gcs: ['Bucket is required.'],
        hdfs: ['URI is required.'],
      };

      test('should validate required repository settings', async () => {
        const user = userEvent.setup();
        await screen.findByTestId('nameInput');
        fireEvent.change(screen.getByTestId('nameInput'), { target: { value: 'my-repo' } });

        const selectRepoTypeAndExpectErrors = async (type: RepositoryType) => {
          await user.click(screen.getByTestId(`${type}RepositoryType`));
          await user.click(screen.getByTestId('nextButton'));
          await screen.findByTestId('stepTwo');

          await user.click(screen.getByTestId('submitButton'));

          const expectedErrors = typeToErrorMessagesMap[type];
          expectedErrors.forEach((error) => {
            // Error text can appear both in the form-wide error summary and the field-level error.
            expect(screen.getAllByText(error).length).toBeGreaterThan(0);
          });

          await user.click(screen.getByTestId('backButton'));
          // Navigating back remounts step 1 and triggers repository types loading again.
          // Ensure the async request resolves inside RTL's async act wrapper.
          await waitForRepositoryTypesToLoad();
        };

        await selectRepoTypeAndExpectErrors('fs');
        await selectRepoTypeAndExpectErrors('url');
        await selectRepoTypeAndExpectErrors('s3');
        await selectRepoTypeAndExpectErrors('gcs');
        await selectRepoTypeAndExpectErrors('hdfs');
      });
    });
  });

  describe('form payload & api errors', () => {
    const fsRepository = getRepository({
      settings: {
        chunkSize: '10mb',
        location: '/tmp/es-backups',
        maxSnapshotBytesPerSec: '1g',
        maxRestoreBytesPerSec: '1g',
      },
    });

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRepositoryTypesResponse(repositoryTypes);
      renderApp(httpSetup, { initialEntries: ['/add_repository'] });
      await waitForRepositoryTypesToLoad();
    });

    describe('not source only', () => {
      test('should send the correct payload for FS repository', async () => {
        await screen.findByTestId('nameInput');

        // Fill step 1 required fields and go to step 2
        fireEvent.change(screen.getByTestId('nameInput'), { target: { value: fsRepository.name } });
        fireEvent.click(screen.getByTestId(`${fsRepository.type}RepositoryType`));
        fireEvent.click(screen.getByTestId('nextButton'));
        await screen.findByTestId('stepTwo');

        // Fill step 2
        fireEvent.change(screen.getByTestId('locationInput'), {
          target: { value: fsRepository.settings.location },
        });
        fireEvent.click(screen.getByTestId('compressToggle'));
        fireEvent.change(screen.getByTestId('chunkSizeInput'), {
          target: { value: fsRepository.settings.chunkSize },
        });
        fireEvent.change(screen.getByTestId('maxSnapshotBytesInput'), {
          target: { value: fsRepository.settings.maxSnapshotBytesPerSec },
        });
        fireEvent.change(screen.getByTestId('maxRestoreBytesInput'), {
          target: { value: fsRepository.settings.maxRestoreBytesPerSec },
        });
        fireEvent.click(screen.getByTestId('readOnlyToggle'));

        fireEvent.click(screen.getByTestId('submitButton'));

        await waitFor(() => {
          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}repositories`,
            expect.objectContaining({
              body: JSON.stringify({
                name: fsRepository.name,
                type: fsRepository.type,
                settings: {
                  location: fsRepository.settings.location,
                  compress: false,
                  chunkSize: fsRepository.settings.chunkSize,
                  maxSnapshotBytesPerSec: fsRepository.settings.maxSnapshotBytesPerSec,
                  maxRestoreBytesPerSec: fsRepository.settings.maxRestoreBytesPerSec,
                  readonly: true,
                },
              }),
            })
          );
        });
      });

      test('should send the correct payload for Azure repository', async () => {
        const azureRepository = getRepository({
          type: 'azure',
          settings: {
            chunkSize: '10mb',
            maxSnapshotBytesPerSec: '1g',
            maxRestoreBytesPerSec: '1g',
            client: 'client',
            container: 'container',
            basePath: 'path',
          },
        });

        await screen.findByTestId('nameInput');

        // Fill step 1 required fields and go to step 2
        fireEvent.change(screen.getByTestId('nameInput'), {
          target: { value: azureRepository.name },
        });
        fireEvent.click(screen.getByTestId(`${azureRepository.type}RepositoryType`));
        fireEvent.click(screen.getByTestId('nextButton'));
        await screen.findByTestId('stepTwo');

        // Fill step 2
        fireEvent.change(screen.getByTestId('clientInput'), {
          target: { value: azureRepository.settings.client },
        });
        fireEvent.change(screen.getByTestId('containerInput'), {
          target: { value: azureRepository.settings.container },
        });
        fireEvent.change(screen.getByTestId('basePathInput'), {
          target: { value: azureRepository.settings.basePath },
        });
        fireEvent.click(screen.getByTestId('compressToggle'));
        fireEvent.change(screen.getByTestId('chunkSizeInput'), {
          target: { value: azureRepository.settings.chunkSize },
        });
        fireEvent.change(screen.getByTestId('maxSnapshotBytesInput'), {
          target: { value: azureRepository.settings.maxSnapshotBytesPerSec },
        });
        fireEvent.change(screen.getByTestId('maxRestoreBytesInput'), {
          target: { value: azureRepository.settings.maxRestoreBytesPerSec },
        });
        fireEvent.click(screen.getByTestId('readOnlyToggle'));

        fireEvent.click(screen.getByTestId('submitButton'));

        await waitFor(() => {
          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}repositories`,
            expect.objectContaining({
              body: JSON.stringify({
                name: azureRepository.name,
                type: azureRepository.type,
                settings: {
                  client: azureRepository.settings.client,
                  container: azureRepository.settings.container,
                  basePath: azureRepository.settings.basePath,
                  compress: false,
                  chunkSize: azureRepository.settings.chunkSize,
                  maxSnapshotBytesPerSec: azureRepository.settings.maxSnapshotBytesPerSec,
                  maxRestoreBytesPerSec: azureRepository.settings.maxRestoreBytesPerSec,
                  readonly: true,
                },
              }),
            })
          );
        });
      });

      test('should send the correct payload for GCS repository', async () => {
        const gcsRepository = getRepository({
          type: 'gcs',
          settings: {
            chunkSize: '10mb',
            maxSnapshotBytesPerSec: '1g',
            maxRestoreBytesPerSec: '1g',
            client: 'test_client',
            bucket: 'test_bucket',
            basePath: 'test_path',
          },
        });

        await screen.findByTestId('nameInput');

        // Fill step 1 required fields and go to step 2
        fireEvent.change(screen.getByTestId('nameInput'), {
          target: { value: gcsRepository.name },
        });
        fireEvent.click(screen.getByTestId(`${gcsRepository.type}RepositoryType`));
        fireEvent.click(screen.getByTestId('nextButton'));
        await screen.findByTestId('stepTwo');

        // Fill step 2
        fireEvent.change(screen.getByTestId('clientInput'), {
          target: { value: gcsRepository.settings.client },
        });
        fireEvent.change(screen.getByTestId('bucketInput'), {
          target: { value: gcsRepository.settings.bucket },
        });
        fireEvent.change(screen.getByTestId('basePathInput'), {
          target: { value: gcsRepository.settings.basePath },
        });
        fireEvent.click(screen.getByTestId('compressToggle'));
        fireEvent.change(screen.getByTestId('chunkSizeInput'), {
          target: { value: gcsRepository.settings.chunkSize },
        });
        fireEvent.change(screen.getByTestId('maxSnapshotBytesInput'), {
          target: { value: gcsRepository.settings.maxSnapshotBytesPerSec },
        });
        fireEvent.change(screen.getByTestId('maxRestoreBytesInput'), {
          target: { value: gcsRepository.settings.maxRestoreBytesPerSec },
        });
        fireEvent.click(screen.getByTestId('readOnlyToggle'));

        fireEvent.click(screen.getByTestId('submitButton'));

        await waitFor(() => {
          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}repositories`,
            expect.objectContaining({
              body: JSON.stringify({
                name: gcsRepository.name,
                type: gcsRepository.type,
                settings: {
                  client: gcsRepository.settings.client,
                  bucket: gcsRepository.settings.bucket,
                  basePath: gcsRepository.settings.basePath,
                  compress: false,
                  chunkSize: gcsRepository.settings.chunkSize,
                  maxSnapshotBytesPerSec: gcsRepository.settings.maxSnapshotBytesPerSec,
                  maxRestoreBytesPerSec: gcsRepository.settings.maxRestoreBytesPerSec,
                  readonly: true,
                },
              }),
            })
          );
        });
      });

      test('should send the correct payload for HDFS repository', async () => {
        const hdfsRepository = getRepository({
          type: 'hdfs',
          settings: {
            uri: 'uri',
            path: 'test_path',
            chunkSize: '10mb',
            maxSnapshotBytesPerSec: '1g',
            maxRestoreBytesPerSec: '1g',
          },
        });

        await screen.findByTestId('nameInput');

        // Fill step 1 required fields and go to step 2
        fireEvent.change(screen.getByTestId('nameInput'), {
          target: { value: hdfsRepository.name },
        });
        fireEvent.click(screen.getByTestId(`${hdfsRepository.type}RepositoryType`));
        fireEvent.click(screen.getByTestId('nextButton'));
        await screen.findByTestId('stepTwo');

        // Fill step 2
        fireEvent.change(screen.getByTestId('uriInput'), {
          target: { value: hdfsRepository.settings.uri },
        });
        fireEvent.change(screen.getByTestId('pathInput'), {
          target: { value: hdfsRepository.settings.path },
        });
        fireEvent.click(screen.getByTestId('compressToggle'));
        fireEvent.change(screen.getByTestId('chunkSizeInput'), {
          target: { value: hdfsRepository.settings.chunkSize },
        });
        fireEvent.change(screen.getByTestId('maxSnapshotBytesInput'), {
          target: { value: hdfsRepository.settings.maxSnapshotBytesPerSec },
        });
        fireEvent.change(screen.getByTestId('maxRestoreBytesInput'), {
          target: { value: hdfsRepository.settings.maxRestoreBytesPerSec },
        });
        fireEvent.click(screen.getByTestId('readOnlyToggle'));

        fireEvent.click(screen.getByTestId('submitButton'));

        await waitFor(() => {
          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}repositories`,
            expect.objectContaining({
              body: JSON.stringify({
                name: hdfsRepository.name,
                type: hdfsRepository.type,
                settings: {
                  uri: `hdfs://${hdfsRepository.settings.uri}`,
                  path: hdfsRepository.settings.path,
                  compress: false,
                  chunkSize: hdfsRepository.settings.chunkSize,
                  maxSnapshotBytesPerSec: hdfsRepository.settings.maxSnapshotBytesPerSec,
                  maxRestoreBytesPerSec: hdfsRepository.settings.maxRestoreBytesPerSec,
                  readonly: true,
                },
              }),
            })
          );
        });
      });

      test('should send the correct payload for S3 repository', async () => {
        await screen.findByTestId('nameInput');

        const s3Repository = getRepository({
          type: 's3',
          settings: {
            bucket: 'test_bucket',
            client: 'test_client',
            basePath: 'test_path',
            bufferSize: '1g',
            chunkSize: '10mb',
            maxSnapshotBytesPerSec: '1g',
            maxRestoreBytesPerSec: '1g',
          },
        });

        // Fill step 1 required fields and go to step 2
        fireEvent.change(screen.getByTestId('nameInput'), { target: { value: s3Repository.name } });
        fireEvent.click(screen.getByTestId(`${s3Repository.type}RepositoryType`));
        fireEvent.click(screen.getByTestId('nextButton'));
        await screen.findByTestId('stepTwo');

        // Fill step 2
        fireEvent.change(screen.getByTestId('bucketInput'), {
          target: { value: s3Repository.settings.bucket },
        });
        fireEvent.change(screen.getByTestId('clientInput'), {
          target: { value: s3Repository.settings.client },
        });
        fireEvent.change(screen.getByTestId('basePathInput'), {
          target: { value: s3Repository.settings.basePath },
        });
        fireEvent.change(screen.getByTestId('bufferSizeInput'), {
          target: { value: s3Repository.settings.bufferSize },
        });
        fireEvent.click(screen.getByTestId('compressToggle'));
        fireEvent.change(screen.getByTestId('chunkSizeInput'), {
          target: { value: s3Repository.settings.chunkSize },
        });
        fireEvent.change(screen.getByTestId('maxSnapshotBytesInput'), {
          target: { value: s3Repository.settings.maxSnapshotBytesPerSec },
        });
        fireEvent.change(screen.getByTestId('maxRestoreBytesInput'), {
          target: { value: s3Repository.settings.maxRestoreBytesPerSec },
        });
        fireEvent.click(screen.getByTestId('readOnlyToggle'));

        fireEvent.click(screen.getByTestId('submitButton'));

        await waitFor(() => {
          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}repositories`,
            expect.objectContaining({
              body: JSON.stringify({
                name: s3Repository.name,
                type: s3Repository.type,
                settings: {
                  bucket: s3Repository.settings.bucket,
                  client: s3Repository.settings.client,
                  basePath: s3Repository.settings.basePath,
                  bufferSize: s3Repository.settings.bufferSize,
                  compress: false,
                  chunkSize: s3Repository.settings.chunkSize,
                  maxSnapshotBytesPerSec: s3Repository.settings.maxSnapshotBytesPerSec,
                  maxRestoreBytesPerSec: s3Repository.settings.maxRestoreBytesPerSec,
                  readonly: true,
                },
              }),
            })
          );
        });
      });

      test('should surface the API errors from the "save" HTTP request', async () => {
        await screen.findByTestId('nameInput');

        // Fill step 1 required fields and go to step 2
        fireEvent.change(screen.getByTestId('nameInput'), { target: { value: fsRepository.name } });
        fireEvent.click(screen.getByTestId(`${fsRepository.type}RepositoryType`));
        fireEvent.click(screen.getByTestId('nextButton'));
        await screen.findByTestId('stepTwo');

        // Fill step 2
        fireEvent.change(screen.getByTestId('locationInput'), {
          target: { value: fsRepository.settings.location },
        });
        fireEvent.click(screen.getByTestId('compressToggle'));

        const error = {
          statusCode: 400,
          error: 'Bad request',
          message: 'Repository payload is invalid',
        };

        httpRequestsMockHelpers.setSaveRepositoryResponse(undefined, error);

        fireEvent.click(screen.getByTestId('submitButton'));

        const errorCallout = await screen.findByTestId('saveRepositoryApiError');
        expect(errorCallout).toHaveTextContent(error.message);
      });
    });

    describe('source only', () => {
      beforeEach(() => {
        // Fill step 1 required fields and go to step 2
        fireEvent.change(screen.getByTestId('nameInput'), { target: { value: fsRepository.name } });
        fireEvent.click(screen.getByTestId(`${fsRepository.type}RepositoryType`));
        fireEvent.click(screen.getByTestId('sourceOnlyToggle')); // toggle source
        fireEvent.click(screen.getByTestId('nextButton'));
      });

      test('should send the correct payload', async () => {
        await screen.findByTestId('stepTwo');

        // Fill step 2
        fireEvent.change(screen.getByTestId('locationInput'), {
          target: { value: fsRepository.settings.location },
        });

        fireEvent.click(screen.getByTestId('submitButton'));

        await waitFor(() => {
          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}repositories`,
            expect.objectContaining({
              body: JSON.stringify({
                name: fsRepository.name,
                type: 'source',
                settings: {
                  delegateType: fsRepository.type,
                  location: fsRepository.settings.location,
                },
              }),
            })
          );
        });
      });
    });
  });

  describe('settings for s3 repository', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRepositoryTypesResponse(repositoryTypes);
      renderApp(httpSetup, { initialEntries: ['/add_repository'] });
      await waitForRepositoryTypesToLoad();
    });

    test('should correctly set the intelligent_tiering storage class', async () => {
      const s3Repository = getRepository({
        type: 's3',
        settings: {
          bucket: 'test_bucket',
          storageClass: 'intelligent_tiering',
        },
      });

      await screen.findByTestId('nameInput');

      // Fill step 1 required fields and go to step 2
      fireEvent.change(screen.getByTestId('nameInput'), { target: { value: s3Repository.name } });
      fireEvent.click(screen.getByTestId(`${s3Repository.type}RepositoryType`));
      fireEvent.click(screen.getByTestId('nextButton'));
      await screen.findByTestId('stepTwo');

      // Fill step 2
      fireEvent.change(screen.getByTestId('bucketInput'), {
        target: { value: s3Repository.settings.bucket },
      });
      fireEvent.change(screen.getByTestId('storageClassSelect'), {
        target: { value: s3Repository.settings.storageClass },
      });

      fireEvent.click(screen.getByTestId('submitButton'));

      await waitFor(() => {
        expect(httpSetup.put).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}repositories`,
          expect.objectContaining({
            body: JSON.stringify({
              name: s3Repository.name,
              type: s3Repository.type,
              settings: {
                bucket: s3Repository.settings.bucket,
                storageClass: s3Repository.settings.storageClass,
              },
            }),
          })
        );
      });
    });

    test('should correctly set the onezone_ia storage class', async () => {
      const s3Repository = getRepository({
        type: 's3',
        settings: {
          bucket: 'test_bucket',
          storageClass: 'onezone_ia',
        },
      });

      await screen.findByTestId('nameInput');

      // Fill step 1 required fields and go to step 2
      fireEvent.change(screen.getByTestId('nameInput'), { target: { value: s3Repository.name } });
      fireEvent.click(screen.getByTestId(`${s3Repository.type}RepositoryType`));
      fireEvent.click(screen.getByTestId('nextButton'));
      await screen.findByTestId('stepTwo');

      // Fill step 2
      fireEvent.change(screen.getByTestId('bucketInput'), {
        target: { value: s3Repository.settings.bucket },
      });
      fireEvent.change(screen.getByTestId('storageClassSelect'), {
        target: { value: s3Repository.settings.storageClass },
      });

      fireEvent.click(screen.getByTestId('submitButton'));

      await waitFor(() => {
        expect(httpSetup.put).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}repositories`,
          expect.objectContaining({
            body: JSON.stringify({
              name: s3Repository.name,
              type: s3Repository.type,
              settings: {
                bucket: s3Repository.settings.bucket,
                storageClass: s3Repository.settings.storageClass,
              },
            }),
          })
        );
      });
    });
  });
});
