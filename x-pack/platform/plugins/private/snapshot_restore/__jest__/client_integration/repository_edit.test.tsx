/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './helpers/mocks';

import React from 'react';
import { render, screen } from '@testing-library/react';

import { getRandomString } from '@kbn/test-jest-helpers';
import { setupEnvironment, WithAppDependencies } from './helpers/setup_environment';
import { renderApp } from './helpers/render_app';
import { RepositoryForm } from '../../public/application/components/repository_form/repository_form';
import { REPOSITORY_EDIT } from './helpers/constant';
import type { getRepository } from '../../test/fixtures';

type Repository = ReturnType<typeof getRepository>;

describe('<RepositoryEdit />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setupPage = async (
    repository: Repository,
    { isManagedRepository }: { isManagedRepository?: boolean } = {}
  ) => {
    const { httpSetup } = setupEnvironment();
    const clearSaveError = jest.fn();
    const onSave = jest.fn();

    const RepositoryFormWithDeps = WithAppDependencies(RepositoryForm, httpSetup);
    render(
      <RepositoryFormWithDeps
        repository={repository}
        isManagedRepository={isManagedRepository}
        isEditing={true}
        isSaving={false}
        clearSaveError={clearSaveError}
        onSave={onSave}
      />
    );

    // Let mount-time effects settle under RTL's async act wrapper.
    await screen.findByTestId('title');

    return { onSave };
  };

  describe('on component mount', () => {
    test('should set the correct page title', async () => {
      await setupPage(REPOSITORY_EDIT);

      const title = screen.getByTestId('title');
      expect(title).toHaveTextContent(`'${REPOSITORY_EDIT.name}' settings`);
    });

    /**
     * As the "edit" repository component uses the same form underneath that
     * the "create" repository, we won't test it again but simply make sure that
     * the same form component is indeed shared between the 2 app sections.
     */
    test('should use the same Form component as the "<RepositoryAdd />" section', async () => {
      const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

      httpRequestsMockHelpers.setGetRepositoryResponse(REPOSITORY_EDIT.name, {
        repository: REPOSITORY_EDIT,
        snapshots: { count: 0 },
      });

      const { unmount } = renderApp(httpSetup, {
        initialEntries: [`/edit_repository/${encodeURIComponent(REPOSITORY_EDIT.name)}`],
      });

      await screen.findByTestId('title');
      expect(screen.getByTestId('title')).toBeInTheDocument();

      unmount();

      httpRequestsMockHelpers.setLoadRepositoryTypesResponse(['fs', 'url']);
      renderApp(httpSetup, { initialEntries: ['/add_repository'] });

      await screen.findByTestId('fsRepositoryType');
      expect(screen.getByTestId('nextButton')).toBeInTheDocument();
    });
  });

  describe('should disable client, bucket / container and base path fields for managed repositories', () => {
    it('azure repository', async () => {
      const repositoryName = getRandomString();
      await setupPage(
        { name: repositoryName, type: 'azure', settings: {} },
        { isManagedRepository: true }
      );
      expect(screen.getByTestId('clientInput')).toBeDisabled();
      expect(screen.getByTestId('containerInput')).toBeDisabled();
      expect(screen.getByTestId('basePathInput')).toBeDisabled();
    });

    it('gcs repository', async () => {
      const repositoryName = getRandomString();
      await setupPage(
        { name: repositoryName, type: 'gcs', settings: {} },
        { isManagedRepository: true }
      );
      expect(screen.getByTestId('clientInput')).toBeDisabled();
      expect(screen.getByTestId('bucketInput')).toBeDisabled();
      expect(screen.getByTestId('basePathInput')).toBeDisabled();
    });

    it('s3 repository', async () => {
      const repositoryName = getRandomString();
      await setupPage(
        { name: repositoryName, type: 's3', settings: {} },
        { isManagedRepository: true }
      );
      expect(screen.getByTestId('clientInput')).toBeDisabled();
      expect(screen.getByTestId('bucketInput')).toBeDisabled();
      expect(screen.getByTestId('basePathInput')).toBeDisabled();
    });
  });

  describe('should populate the correct values', () => {
    it('fs repository', async () => {
      const settings = {
        location: getRandomString(),
        compress: true,
        chunkSize: getRandomString(),
        maxSnapshotBytesPerSec: getRandomString(),
        maxRestoreBytesPerSec: getRandomString(),
        readonly: true,
      };

      const repositoryName = getRandomString();
      await setupPage({ name: repositoryName, type: 'fs', settings });

      expect(screen.getByTestId('locationInput')).toHaveValue(settings.location);
      expect(screen.getByTestId('compressToggle')).toHaveAttribute(
        'aria-checked',
        settings.compress ? 'true' : 'false'
      );
      expect(screen.getByTestId('chunkSizeInput')).toHaveValue(settings.chunkSize);
      expect(screen.getByTestId('maxSnapshotBytesInput')).toHaveValue(
        settings.maxSnapshotBytesPerSec
      );
      expect(screen.getByTestId('maxRestoreBytesInput')).toHaveValue(
        settings.maxRestoreBytesPerSec
      );
      expect(screen.getByTestId('readOnlyToggle')).toHaveAttribute(
        'aria-checked',
        settings.readonly ? 'true' : 'false'
      );
    });

    it('readonly repository', async () => {
      const settings = {
        url: 'https://elastic.co',
        readonly: true,
      };

      const repositoryName = getRandomString();
      await setupPage({ name: repositoryName, type: 'url', settings });

      // URL settings UI strips scheme from the input value.
      expect(screen.getByTestId('urlInput')).toHaveValue('elastic.co');
    });

    it('azure repository', async () => {
      const settings = {
        client: getRandomString(),
        container: getRandomString(),
        basePath: getRandomString(),
        compress: true,
        chunkSize: getRandomString(),
        readonly: true,
        maxRestoreBytesPerSec: getRandomString(),
        maxSnapshotBytesPerSec: getRandomString(),
      };

      const repositoryName = getRandomString();
      await setupPage({ name: repositoryName, type: 'azure', settings });

      expect(screen.getByTestId('clientInput')).toHaveValue(settings.client);
      expect(screen.getByTestId('containerInput')).toHaveValue(settings.container);
      expect(screen.getByTestId('basePathInput')).toHaveValue(settings.basePath);
      expect(screen.getByTestId('compressToggle')).toHaveAttribute(
        'aria-checked',
        settings.compress ? 'true' : 'false'
      );
      expect(screen.getByTestId('chunkSizeInput')).toHaveValue(settings.chunkSize);
      expect(screen.getByTestId('maxSnapshotBytesInput')).toHaveValue(
        settings.maxSnapshotBytesPerSec
      );
      expect(screen.getByTestId('maxRestoreBytesInput')).toHaveValue(
        settings.maxRestoreBytesPerSec
      );
      expect(screen.getByTestId('readOnlyToggle')).toHaveAttribute(
        'aria-checked',
        settings.readonly ? 'true' : 'false'
      );
    });

    it('gcs repository', async () => {
      const settings = {
        client: getRandomString(),
        bucket: getRandomString(),
        basePath: getRandomString(),
        compress: true,
        chunkSize: getRandomString(),
        readonly: true,
        maxRestoreBytesPerSec: getRandomString(),
        maxSnapshotBytesPerSec: getRandomString(),
      };

      const repositoryName = getRandomString();
      await setupPage({ name: repositoryName, type: 'gcs', settings });

      expect(screen.getByTestId('clientInput')).toHaveValue(settings.client);
      expect(screen.getByTestId('bucketInput')).toHaveValue(settings.bucket);
      expect(screen.getByTestId('basePathInput')).toHaveValue(settings.basePath);
      expect(screen.getByTestId('compressToggle')).toHaveAttribute(
        'aria-checked',
        settings.compress ? 'true' : 'false'
      );
      expect(screen.getByTestId('chunkSizeInput')).toHaveValue(settings.chunkSize);
      expect(screen.getByTestId('maxSnapshotBytesInput')).toHaveValue(
        settings.maxSnapshotBytesPerSec
      );
      expect(screen.getByTestId('maxRestoreBytesInput')).toHaveValue(
        settings.maxRestoreBytesPerSec
      );
      expect(screen.getByTestId('readOnlyToggle')).toHaveAttribute(
        'aria-checked',
        settings.readonly ? 'true' : 'false'
      );
    });

    it('hdfs repository', async () => {
      const settings = {
        delegateType: 'gcs',
        uri: 'hdfs://elastic.co',
        path: getRandomString(),
        loadDefault: true,
        compress: true,
        chunkSize: getRandomString(),
        readonly: true,
        'security.principal': getRandomString(),
        maxRestoreBytesPerSec: getRandomString(),
        maxSnapshotBytesPerSec: getRandomString(),
        conf1: 'foo',
        conf2: 'bar',
      };

      const repositoryName = getRandomString();
      await setupPage({ name: repositoryName, type: 'hdfs', settings });

      expect(screen.getByTestId('uriInput')).toHaveValue('elastic.co');
      expect(screen.getByTestId('pathInput')).toHaveValue(settings.path);
      expect(screen.getByTestId('loadDefaultsToggle')).toHaveAttribute(
        'aria-checked',
        settings.loadDefault ? 'true' : 'false'
      );
      expect(screen.getByTestId('compressToggle')).toHaveAttribute(
        'aria-checked',
        settings.compress ? 'true' : 'false'
      );
      expect(screen.getByTestId('chunkSizeInput')).toHaveValue(settings.chunkSize);
      expect(screen.getByTestId('securityPrincipalInput')).toHaveValue(
        settings['security.principal']
      );
      expect(screen.getByTestId('maxSnapshotBytesInput')).toHaveValue(
        settings.maxSnapshotBytesPerSec
      );
      expect(screen.getByTestId('maxRestoreBytesInput')).toHaveValue(
        settings.maxRestoreBytesPerSec
      );
      expect(screen.getByTestId('readOnlyToggle')).toHaveAttribute(
        'aria-checked',
        settings.readonly ? 'true' : 'false'
      );

      const codeEditorValue = screen.getByTestId('codeEditor').getAttribute('data-currentvalue');
      expect(JSON.parse(codeEditorValue!)).toEqual({
        loadDefault: true,
        conf1: 'foo',
        conf2: 'bar',
      });
    });

    it('s3 repository', async () => {
      const settings = {
        bucket: getRandomString(),
        client: getRandomString(),
        basePath: getRandomString(),
        compress: true,
        chunkSize: getRandomString(),
        serverSideEncryption: true,
        bufferSize: getRandomString(),
        // Must be one of the allowed options (see s3_settings.tsx).
        cannedAcl: 'public-read',
        storageClass: 'onezone_ia',
        readonly: true,
        maxRestoreBytesPerSec: getRandomString(),
        maxSnapshotBytesPerSec: getRandomString(),
      };

      const repositoryName = getRandomString();
      await setupPage({ name: repositoryName, type: 's3', settings });

      expect(screen.getByTestId('clientInput')).toHaveValue(settings.client);
      expect(screen.getByTestId('bucketInput')).toHaveValue(settings.bucket);
      expect(screen.getByTestId('basePathInput')).toHaveValue(settings.basePath);
      expect(screen.getByTestId('compressToggle')).toHaveAttribute(
        'aria-checked',
        settings.compress ? 'true' : 'false'
      );
      expect(screen.getByTestId('chunkSizeInput')).toHaveValue(settings.chunkSize);
      expect(screen.getByTestId('serverSideEncryptionToggle')).toHaveAttribute(
        'aria-checked',
        settings.serverSideEncryption ? 'true' : 'false'
      );
      expect(screen.getByTestId('bufferSizeInput')).toHaveValue(settings.bufferSize);
      expect(screen.getByTestId('cannedAclSelect')).toHaveValue(settings.cannedAcl);
      expect(screen.getByTestId('storageClassSelect')).toHaveValue(settings.storageClass);
      expect(screen.getByTestId('maxSnapshotBytesInput')).toHaveValue(
        settings.maxSnapshotBytesPerSec
      );
      expect(screen.getByTestId('maxRestoreBytesInput')).toHaveValue(
        settings.maxRestoreBytesPerSec
      );
      expect(screen.getByTestId('readOnlyToggle')).toHaveAttribute(
        'aria-checked',
        settings.readonly ? 'true' : 'false'
      );
    });
  });
});
