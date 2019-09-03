/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';

import { setupEnvironment, pageHelpers, nextTick, TestBed, getRandomString } from './helpers';
import { RepositoryForm } from '../../public/app/components/repository_form';
import { RepositoryEditTestSubjects } from './helpers/repository_edit.helpers';
import { RepositoryAddTestSubjects } from './helpers/repository_add.helpers';
import { REPOSITORY_EDIT } from './helpers/constant';

const { setup } = pageHelpers.repositoryEdit;
const { setup: setupRepositoryAdd } = pageHelpers.repositoryAdd;

jest.mock('ui/i18n', () => {
  const I18nContext = ({ children }: any) => children;
  return { I18nContext };
});

// We need to skip the tests until react 16.9.0 is released
// which supports asynchronous code inside act()
describe.skip('<RepositoryEdit />', () => {
  let testBed: TestBed<RepositoryEditTestSubjects>;
  let testBedRepositoryAdd: TestBed<RepositoryAddTestSubjects>;
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  afterAll(() => {
    server.restore();
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setGetRepositoryResponse({
        repository: REPOSITORY_EDIT,
        snapshots: { count: 0 },
      });
      testBed = await setup();

      // @ts-ignore (remove when react 16.9.0 is released)
      await act(async () => {
        await nextTick();
        testBed.component.update();
      });
    });

    test('should set the correct page title', () => {
      const { find } = testBed;
      expect(find('repositoryForm.stepTwo.title').text()).toBe(
        `'${REPOSITORY_EDIT.name}' settings`
      );
    });

    /**
     * As the "edit" repository component uses the same form underneath that
     * the "create" repository, we won't test it again but simply make sure that
     * the same form component is indeed shared between the 2 app sections.
     */
    test('should use the same Form component as the "<RepositoryAdd />" section', async () => {
      httpRequestsMockHelpers.setLoadRepositoryTypesResponse(['fs', 'url']);

      testBedRepositoryAdd = await setupRepositoryAdd();

      const formEdit = testBed.component.find(RepositoryForm);
      const formAdd = testBedRepositoryAdd.component.find(RepositoryForm);

      expect(formEdit.length).toBe(1);
      expect(formAdd.length).toBe(1);
    });
  });

  describe('should populate the correct values', () => {
    const mountComponentWithMock = async (repository: any) => {
      httpRequestsMockHelpers.setGetRepositoryResponse({
        repository: { name: getRandomString(), ...repository },
        snapshots: { count: 0 },
      });
      testBed = await setup();

      // @ts-ignore (remove when react 16.9.0 is released)
      await act(async () => {
        await nextTick();
        testBed.component.update();
      });
    };

    it('fs repository', async () => {
      const settings = {
        location: getRandomString(),
        compress: true,
        chunkSize: getRandomString(),
        maxSnapshotBytesPerSec: getRandomString(),
        maxRestoreBytesPerSec: getRandomString(),
        readonly: true,
      };

      await mountComponentWithMock({ type: 'fs', settings });

      const { find } = testBed;

      expect(find('locationInput').props().defaultValue).toBe(settings.location);
      expect(find('compressToggle').props().checked).toBe(settings.compress);
      expect(find('chunkSizeInput').props().defaultValue).toBe(settings.chunkSize);
      expect(find('maxSnapshotBytesInput').props().defaultValue).toBe(
        settings.maxSnapshotBytesPerSec
      );
      expect(find('maxRestoreBytesInput').props().defaultValue).toBe(
        settings.maxRestoreBytesPerSec
      );
      expect(find('readOnlyToggle').props().checked).toBe(settings.readonly);
    });

    it('readonly repository', async () => {
      const settings = {
        url: 'https://elastic.co',
      };

      await mountComponentWithMock({ type: 'url', settings });

      const { find } = testBed;

      expect(find('schemeSelect').props().value).toBe('https');
      expect(find('urlInput').props().defaultValue).toBe('elastic.co');
    });

    it('azure repository', async () => {
      const settings = {
        client: getRandomString(),
        container: getRandomString(),
        basePath: getRandomString(),
        compress: true,
        chunkSize: getRandomString(),
        readonly: true,
        locationMode: getRandomString(),
        maxRestoreBytesPerSec: getRandomString(),
        maxSnapshotBytesPerSec: getRandomString(),
      };

      await mountComponentWithMock({ type: 'azure', settings });

      const { find } = testBed;

      expect(find('clientInput').props().defaultValue).toBe(settings.client);
      expect(find('containerInput').props().defaultValue).toBe(settings.container);
      expect(find('basePathInput').props().defaultValue).toBe(settings.basePath);
      expect(find('compressToggle').props().checked).toBe(settings.compress);
      expect(find('chunkSizeInput').props().defaultValue).toBe(settings.chunkSize);
      expect(find('maxSnapshotBytesInput').props().defaultValue).toBe(
        settings.maxSnapshotBytesPerSec
      );
      expect(find('maxRestoreBytesInput').props().defaultValue).toBe(
        settings.maxRestoreBytesPerSec
      );
      expect(find('locationModeSelect').props().value).toBe(settings.locationMode);
      expect(find('readOnlyToggle').props().checked).toBe(settings.readonly);
    });

    it('gcs repository', async () => {
      const settings = {
        bucket: getRandomString(),
        client: getRandomString(),
        basePath: getRandomString(),
        compress: true,
        chunkSize: getRandomString(),
        readonly: true,
        maxRestoreBytesPerSec: getRandomString(),
        maxSnapshotBytesPerSec: getRandomString(),
      };

      await mountComponentWithMock({ type: 'gcs', settings });

      const { find } = testBed;

      expect(find('clientInput').props().defaultValue).toBe(settings.client);
      expect(find('bucketInput').props().defaultValue).toBe(settings.bucket);
      expect(find('basePathInput').props().defaultValue).toBe(settings.basePath);
      expect(find('compressToggle').props().checked).toBe(settings.compress);
      expect(find('chunkSizeInput').props().defaultValue).toBe(settings.chunkSize);
      expect(find('maxSnapshotBytesInput').props().defaultValue).toBe(
        settings.maxSnapshotBytesPerSec
      );
      expect(find('maxRestoreBytesInput').props().defaultValue).toBe(
        settings.maxRestoreBytesPerSec
      );
      expect(find('readOnlyToggle').props().checked).toBe(settings.readonly);
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

      await mountComponentWithMock({ type: 'hdfs', settings });

      const { find } = testBed;

      expect(find('uriInput').props().defaultValue).toBe('elastic.co');
      expect(find('pathInput').props().defaultValue).toBe(settings.path);
      expect(find('loadDefaultsToggle').props().checked).toBe(settings.loadDefault);
      expect(find('compressToggle').props().checked).toBe(settings.compress);
      expect(find('chunkSizeInput').props().defaultValue).toBe(settings.chunkSize);
      expect(find('securityPrincipalInput').props().defaultValue).toBe(
        settings['security.principal']
      );
      expect(find('maxSnapshotBytesInput').props().defaultValue).toBe(
        settings.maxSnapshotBytesPerSec
      );
      expect(find('maxRestoreBytesInput').props().defaultValue).toBe(
        settings.maxRestoreBytesPerSec
      );
      expect(find('readOnlyToggle').props().checked).toBe(settings.readonly);

      const codeEditor = testBed.component.find('EuiCodeEditor');
      expect(JSON.parse(codeEditor.props().value as string)).toEqual({
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
        cannedAcl: getRandomString(),
        storageClass: getRandomString(),
        readonly: true,
        maxRestoreBytesPerSec: getRandomString(),
        maxSnapshotBytesPerSec: getRandomString(),
      };

      await mountComponentWithMock({ type: 's3', settings });

      const { find } = testBed;

      expect(find('clientInput').props().defaultValue).toBe(settings.client);
      expect(find('bucketInput').props().defaultValue).toBe(settings.bucket);
      expect(find('basePathInput').props().defaultValue).toBe(settings.basePath);
      expect(find('compressToggle').props().checked).toBe(settings.compress);
      expect(find('chunkSizeInput').props().defaultValue).toBe(settings.chunkSize);
      expect(find('serverSideEncryptionToggle').props().checked).toBe(
        settings.serverSideEncryption
      );
      expect(find('bufferSizeInput').props().defaultValue).toBe(settings.bufferSize);
      expect(find('cannedAclSelect').props().value).toBe(settings.cannedAcl);
      expect(find('storageClassSelect').props().value).toBe(settings.storageClass);
      expect(find('maxSnapshotBytesInput').props().defaultValue).toBe(
        settings.maxSnapshotBytesPerSec
      );
      expect(find('maxRestoreBytesInput').props().defaultValue).toBe(
        settings.maxRestoreBytesPerSec
      );
      expect(find('readOnlyToggle').props().checked).toBe(settings.readonly);
    });
  });
});
