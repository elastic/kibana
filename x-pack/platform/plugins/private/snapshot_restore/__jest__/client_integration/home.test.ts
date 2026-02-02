/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './helpers/mocks';

import { getRandomString } from '@kbn/test-jest-helpers';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import * as fixtures from '../../test/fixtures';
import { API_BASE_PATH } from '../../common';
import {
  SNAPSHOT_REPOSITORY_EXCEPTION_ERROR,
  SNAPSHOT_STATE,
} from '../../public/application/constants';
import { REPOSITORY_NAME } from './helpers/constant';
import { setupEnvironment } from './helpers/setup_environment';
import { renderHome } from './helpers/render_home';

type Repository = ReturnType<typeof fixtures.getRepository>;
type Snapshot = ReturnType<typeof fixtures.getSnapshot>;

// Mocking FormattedDate and FormattedTime due to timezone differences on CI
jest.mock('@kbn/i18n-react', () => {
  const original = jest.requireActual('@kbn/i18n-react');
  const { i18n } = jest.requireActual('@kbn/i18n');
  i18n.init({ locale: 'en' });

  return {
    ...original,
    FormattedDate: () => '',
    FormattedTime: () => '',
  };
});

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

describe('<SnapshotRestoreHome />', () => {
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];

  const renderHomePage = ({
    initialEntries = ['/repositories'],
  }: { initialEntries?: string[] } = {}) => renderHome(httpSetup, { initialEntries });

  beforeEach(() => {
    jest.clearAllMocks();
    const env = setupEnvironment();
    httpSetup = env.httpSetup;
    httpRequestsMockHelpers = env.httpRequestsMockHelpers;
  });

  describe('on component mount', () => {
    test('should set the correct app title', async () => {
      httpRequestsMockHelpers.setLoadRepositoriesResponse({ repositories: [] });
      httpRequestsMockHelpers.setLoadSnapshotsResponse({ snapshots: [], total: 0, errors: {} });
      httpRequestsMockHelpers.setLoadPoliciesResponse({ policies: [] });

      renderHomePage();

      const appTitle = await screen.findByTestId('appTitle');
      expect(appTitle).toHaveTextContent('Snapshot and Restore');
    });

    test('should display a loading while fetching the repositories', async () => {
      const repositoriesDeferred = createDeferred<{ repositories: Repository[] }>();

      // Promise cast needed: mock helper signature doesn't explicitly allow Promise for loading-state tests
      httpRequestsMockHelpers.setLoadRepositoriesResponse(
        repositoriesDeferred.promise as unknown as { repositories: Repository[] }
      );
      httpRequestsMockHelpers.setLoadSnapshotsResponse({ snapshots: [], total: 0, errors: {} });
      httpRequestsMockHelpers.setLoadPoliciesResponse({ policies: [] });

      renderHomePage();

      const loading = await screen.findByTestId('sectionLoading');
      expect(loading).toHaveTextContent('Loading repositories…');

      // Resolve to avoid leaving a dangling request.
      repositoriesDeferred.resolve({ repositories: [] });
      await screen.findByTestId('emptyPrompt');
    });

    test('should have a link to the documentation', async () => {
      httpRequestsMockHelpers.setLoadRepositoriesResponse({ repositories: [] });
      httpRequestsMockHelpers.setLoadSnapshotsResponse({ snapshots: [], total: 0, errors: {} });
      httpRequestsMockHelpers.setLoadPoliciesResponse({ policies: [] });

      renderHomePage();

      const docLink = await screen.findByTestId('documentationLink');
      expect(docLink).toHaveTextContent('Snapshot and Restore docs');
    });

    describe('tabs', () => {
      test('should have 4 tabs', async () => {
        httpRequestsMockHelpers.setLoadRepositoriesResponse({ repositories: [] });
        httpRequestsMockHelpers.setLoadSnapshotsResponse({ snapshots: [], total: 0, errors: {} });
        httpRequestsMockHelpers.setLoadPoliciesResponse({ policies: [] });

        renderHomePage();

        const repositoriesTab = await screen.findByTestId('repositories_tab');
        expect(screen.getByTestId('snapshots_tab')).toHaveTextContent('Snapshots');
        expect(repositoriesTab).toHaveTextContent('Repositories');
        expect(screen.getByTestId('policies_tab')).toHaveTextContent('Policies');
        expect(screen.getByTestId('restore_status_tab')).toHaveTextContent('Restore Status');
      });

      test('should navigate to snapshot list tab', async () => {
        httpRequestsMockHelpers.setLoadRepositoriesResponse({ repositories: [] });
        httpRequestsMockHelpers.setLoadSnapshotsResponse({ snapshots: [], total: 0, errors: {} });
        httpRequestsMockHelpers.setLoadPoliciesResponse({ policies: [] });

        renderHomePage();

        await screen.findByTestId('emptyPrompt');
        expect(screen.queryByTestId('snapshotListEmpty')).not.toBeInTheDocument();

        const user = userEvent.setup();
        await user.click(screen.getByTestId('snapshots_tab'));

        await screen.findByTestId('snapshotListEmpty');
        expect(screen.queryByTestId('emptyPrompt')).not.toBeInTheDocument();
      });
    });
  });

  describe('repositories', () => {
    describe('when there are no repositories', () => {
      beforeEach(() => {
        httpRequestsMockHelpers.setLoadRepositoriesResponse({ repositories: [] });
        httpRequestsMockHelpers.setLoadSnapshotsResponse({ snapshots: [], total: 0, errors: {} });
        httpRequestsMockHelpers.setLoadPoliciesResponse({ policies: [] });
      });

      test('should display an empty prompt', async () => {
        renderHomePage();

        const emptyPrompt = await screen.findByTestId('emptyPrompt');
        expect(within(emptyPrompt).getByTestId('registerRepositoryButton')).toBeInTheDocument();
      });
    });

    describe('when there are repositories', () => {
      const repo1 = fixtures.getRepository({ name: `a${getRandomString()}`, type: 'fs' });
      const repo2 = fixtures.getRepository({ name: `b${getRandomString()}`, type: 'url' });
      const repo3 = fixtures.getRepository({ name: `c${getRandomString()}`, type: 's3' });
      const repo4 = fixtures.getRepository({ name: `d${getRandomString()}`, type: 'hdfs' });
      const repo5 = fixtures.getRepository({ name: `e${getRandomString()}`, type: 'azure' });
      const repo6 = fixtures.getRepository({ name: `f${getRandomString()}`, type: 'gcs' });
      const repo7 = fixtures.getRepository({ name: `g${getRandomString()}`, type: 'source' });
      const repo8 = fixtures.getRepository({
        name: `h${getRandomString()}`,
        type: 'source',
        settings: { delegateType: 'gcs' },
      });

      const repositories = [repo1, repo2, repo3, repo4, repo5, repo6, repo7, repo8];

      beforeEach(() => {
        httpRequestsMockHelpers.setLoadRepositoriesResponse({ repositories });
        httpRequestsMockHelpers.setLoadSnapshotsResponse({ snapshots: [], total: 0, errors: {} });
        httpRequestsMockHelpers.setLoadPoliciesResponse({ policies: [] });
      });

      test('should list them in the table', async () => {
        renderHomePage();

        const table = await screen.findByTestId('repositoryTable');
        const rows = within(table).getAllByTestId('row');

        // Table is sorted by name asc by default.
        const expected = [
          { repo: repo1, typeText: 'Shared file system' },
          { repo: repo2, typeText: 'Read-only URL' },
          { repo: repo3, typeText: 'AWS S3' },
          { repo: repo4, typeText: 'Hadoop HDFS' },
          { repo: repo5, typeText: 'Azure' },
          { repo: repo6, typeText: 'Google Cloud Storage' },
          { repo: repo7, typeText: 'Source-only' },
          { repo: repo8, typeText: 'Google Cloud Storage (Source-only)' },
        ];

        expected.forEach(({ repo, typeText }, idx) => {
          expect(rows[idx]).toHaveTextContent(repo.name);
          expect(rows[idx]).toHaveTextContent(typeText);
        });
      });

      test('should have a button to reload the repositories', async () => {
        renderHomePage();

        await screen.findByTestId('reloadButton');
        const user = userEvent.setup();
        await user.click(screen.getByTestId('reloadButton'));

        await waitFor(() => {
          expect(httpSetup.get).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}repositories`,
            expect.anything()
          );
        });
      });

      test('should have a button to register a new repository', async () => {
        renderHomePage();

        await screen.findByTestId('registerRepositoryButton');
        expect(screen.getByTestId('registerRepositoryButton')).toBeInTheDocument();
      });

      test('should have action buttons on each row to edit and delete a repository', async () => {
        renderHomePage();

        const table = await screen.findByTestId('repositoryTable');
        const firstRow = within(table).getAllByTestId('row')[0];
        expect(within(firstRow).getByTestId('editRepositoryButton')).toBeInTheDocument();
        expect(within(firstRow).getByTestId('deleteRepositoryButton')).toBeInTheDocument();
      });

      describe('delete repository', () => {
        test('should show a confirmation when clicking the delete repository button', async () => {
          renderHomePage();

          const table = await screen.findByTestId('repositoryTable');
          const firstRow = within(table).getAllByTestId('row')[0];

          const user = userEvent.setup();
          await user.click(within(firstRow).getByTestId('deleteRepositoryButton'));

          const modal = await within(document.body).findByTestId('deleteRepositoryConfirmation');
          expect(modal).toHaveTextContent(`Remove repository '${repo1.name}'?`);
        });

        test('should send the correct HTTP request to delete repository', async () => {
          renderHomePage();

          const table = await screen.findByTestId('repositoryTable');
          const firstRow = within(table).getAllByTestId('row')[0];

          const user = userEvent.setup();
          await user.click(within(firstRow).getByTestId('deleteRepositoryButton'));

          await within(document.body).findByTestId('deleteRepositoryConfirmation');
          await user.click(within(document.body).getByTestId('confirmModalConfirmButton'));

          await waitFor(() => {
            expect(httpSetup.delete).toHaveBeenLastCalledWith(
              `${API_BASE_PATH}repositories/${encodeURIComponent(repo1.name)}`,
              expect.anything()
            );
          });
        });
      });

      describe('detail panel', () => {
        beforeEach(() => {
          httpRequestsMockHelpers.setGetRepositoryResponse(repo1.name, {
            repository: {
              name: repo1.name,
              type: 'fs',
              settings: { location: '/tmp/es-backups' },
            },
            snapshots: { count: 0 },
          });
        });

        test('should show the detail when clicking on a repository', async () => {
          renderHomePage();

          expect(screen.queryByTestId('repositoryDetail')).not.toBeInTheDocument();

          const table = await screen.findByTestId('repositoryTable');
          const firstRow = within(table).getAllByTestId('row')[0];

          const user = userEvent.setup();
          await user.click(within(firstRow).getByTestId('repositoryLink'));

          const detail = await screen.findByTestId('repositoryDetail');
          // Wait for mount-time request to resolve inside act
          await within(detail).findByTestId('repositoryType');
          expect(detail).toBeInTheDocument();
        });

        test('should set the correct title', async () => {
          renderHomePage();

          const table = await screen.findByTestId('repositoryTable');
          const firstRow = within(table).getAllByTestId('row')[0];

          const user = userEvent.setup();
          await user.click(within(firstRow).getByTestId('repositoryLink'));

          const detail = await screen.findByTestId('repositoryDetail');
          await within(detail).findByTestId('repositoryType');
          expect(within(detail).getByTestId('title')).toHaveTextContent(repo1.name);
        });

        test('should show a loading state while fetching the repository', async () => {
          const repositoryDeferred = createDeferred<unknown>();
          httpRequestsMockHelpers.setGetRepositoryResponse(
            repo1.name,
            repositoryDeferred.promise as unknown as Record<string, unknown>
          );

          renderHomePage();

          const table = await screen.findByTestId('repositoryTable');
          const firstRow = within(table).getAllByTestId('row')[0];

          const user = userEvent.setup();
          await user.click(within(firstRow).getByTestId('repositoryLink'));

          const detail = await screen.findByTestId('repositoryDetail');
          const loading = await within(detail).findByTestId('sectionLoading');
          expect(loading).toHaveTextContent('Loading repository…');

          repositoryDeferred.resolve({
            repository: {
              name: repo1.name,
              type: 'fs',
              settings: { location: '/tmp/es-backups' },
            },
            snapshots: { count: 0 },
          });
          await within(detail).findByTestId('repositoryType');
        });

        describe('when the repository has been fetched', () => {
          beforeEach(() => {
            httpRequestsMockHelpers.setGetRepositoryResponse(repo1.name, {
              repository: {
                name: 'my-repo',
                type: 'fs',
                settings: { location: '/tmp/es-backups' },
              },
              snapshots: { count: 0 },
            });
          });

          test('should have a link to the documentation', async () => {
            renderHomePage();

            const table = await screen.findByTestId('repositoryTable');
            const firstRow = within(table).getAllByTestId('row')[0];

            const user = userEvent.setup();
            await user.click(within(firstRow).getByTestId('repositoryLink'));

            const detail = await screen.findByTestId('repositoryDetail');
            await within(detail).findByTestId('documentationLink');
            expect(within(detail).getByTestId('documentationLink')).toBeInTheDocument();
          });

          test('should set the correct repository settings', async () => {
            renderHomePage();

            const table = await screen.findByTestId('repositoryTable');
            const firstRow = within(table).getAllByTestId('row')[0];

            const user = userEvent.setup();
            await user.click(within(firstRow).getByTestId('repositoryLink'));

            const detail = await screen.findByTestId('repositoryDetail');
            expect(within(detail).getByTestId('repositoryType')).toHaveTextContent(
              'Shared file system'
            );
            expect(within(detail).getByTestId('snapshotCount')).toHaveTextContent(
              'Repository has no snapshots'
            );
          });

          test('should have a button to verify the status of the repository', async () => {
            renderHomePage();

            const table = await screen.findByTestId('repositoryTable');
            const firstRow = within(table).getAllByTestId('row')[0];

            const user = userEvent.setup();
            await user.click(within(firstRow).getByTestId('repositoryLink'));

            const detail = await screen.findByTestId('repositoryDetail');
            await within(detail).findByTestId('verifyRepositoryButton');
            await user.click(within(detail).getByTestId('verifyRepositoryButton'));

            await waitFor(() => {
              expect(httpSetup.get).toHaveBeenLastCalledWith(
                `${API_BASE_PATH}repositories/${encodeURIComponent(repo1.name)}/verify`,
                expect.anything()
              );
            });
          });

          describe('clean repository', () => {
            test('shows results when request succeeds', async () => {
              httpRequestsMockHelpers.setCleanupRepositoryResponse(repo1.name, {
                cleanup: {
                  cleaned: true,
                  response: {
                    results: {
                      deleted_bytes: 0,
                      deleted_blobs: 0,
                    },
                  },
                },
              });

              renderHomePage();

              const table = await screen.findByTestId('repositoryTable');
              const firstRow = within(table).getAllByTestId('row')[0];

              const user = userEvent.setup();
              await user.click(within(firstRow).getByTestId('repositoryLink'));

              const detail = await screen.findByTestId('repositoryDetail');
              await user.click(within(detail).getByTestId('cleanupRepositoryButton'));

              await waitFor(() => {
                expect(httpSetup.post).toHaveBeenLastCalledWith(
                  `${API_BASE_PATH}repositories/${encodeURIComponent(repo1.name)}/cleanup`,
                  expect.anything()
                );
              });

              await within(detail).findByTestId('cleanupCodeBlock');
              expect(within(detail).queryByTestId('cleanupError')).not.toBeInTheDocument();
            });

            test('shows error when success fails', async () => {
              httpRequestsMockHelpers.setCleanupRepositoryResponse(repo1.name, {
                cleanup: {
                  cleaned: false,
                  error: {
                    message: 'Error message',
                    statusCode: 400,
                  },
                },
              });

              renderHomePage();

              const table = await screen.findByTestId('repositoryTable');
              const firstRow = within(table).getAllByTestId('row')[0];

              const user = userEvent.setup();
              await user.click(within(firstRow).getByTestId('repositoryLink'));

              const detail = await screen.findByTestId('repositoryDetail');
              await user.click(within(detail).getByTestId('cleanupRepositoryButton'));

              await waitFor(() => {
                expect(httpSetup.post).toHaveBeenLastCalledWith(
                  `${API_BASE_PATH}repositories/${encodeURIComponent(repo1.name)}/cleanup`,
                  expect.anything()
                );
              });

              await within(detail).findByTestId('cleanupError');
              expect(within(detail).queryByTestId('cleanupCodeBlock')).not.toBeInTheDocument();
            });
          });
        });

        describe('when the repository has been fetched (and has snapshots)', () => {
          beforeEach(() => {
            httpRequestsMockHelpers.setGetRepositoryResponse(repo1.name, {
              repository: {
                name: 'my-repo',
                type: 'fs',
                settings: { location: '/tmp/es-backups' },
              },
              snapshots: { count: 2 },
            });
          });

          test('should indicate the number of snapshots found', async () => {
            renderHomePage();

            const table = await screen.findByTestId('repositoryTable');
            const firstRow = within(table).getAllByTestId('row')[0];

            const user = userEvent.setup();
            await user.click(within(firstRow).getByTestId('repositoryLink'));

            const detail = await screen.findByTestId('repositoryDetail');
            expect(within(detail).getByTestId('snapshotCount')).toHaveTextContent(
              '2 snapshots found'
            );
          });
        });
      });
    });
  });

  describe('snapshots', () => {
    const goToSnapshotsTab = async () => {
      const user = userEvent.setup();
      const tabs = screen.getAllByTestId('snapshots_tab');
      await user.click(tabs[0]);
    };

    describe('when there are no snapshots nor repositories', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadSnapshotsResponse({ snapshots: [], total: 0, errors: {} });
        httpRequestsMockHelpers.setLoadRepositoriesResponse({ repositories: [] });
        httpRequestsMockHelpers.setLoadPoliciesResponse({ policies: [] });

        renderHomePage();
        await goToSnapshotsTab();
      });

      test('should display an empty prompt', async () => {
        await screen.findByTestId('snapshotListEmpty');
        expect(screen.getByTestId('snapshotListEmpty')).toBeInTheDocument();
      });

      test('should invite the user to first register a repository', async () => {
        const empty = await screen.findByTestId('snapshotListEmpty');
        expect(within(empty).getByTestId('title')).toHaveTextContent(
          'Start by registering a repository'
        );
        expect(within(empty).getByTestId('registerRepositoryButton')).toBeInTheDocument();
      });
    });

    describe('when there are no snapshots but has some repository', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadSnapshotsResponse({ snapshots: [], total: 0, errors: {} });
        httpRequestsMockHelpers.setLoadRepositoriesResponse({
          repositories: [{ name: 'my-repo' }],
        });
        httpRequestsMockHelpers.setLoadPoliciesResponse({ policies: [] });

        renderHomePage();
        await goToSnapshotsTab();
      });

      test('should display an empty prompt', async () => {
        const emptyPrompt = await screen.findByTestId('emptyPrompt');
        expect(within(emptyPrompt).getByTestId('title')).toHaveTextContent(
          `You don't have any snapshots yet`
        );
      });

      test('should have a link to the snapshot documentation', async () => {
        const emptyPrompt = await screen.findByTestId('emptyPrompt');
        expect(within(emptyPrompt).getByTestId('documentationLink')).toBeInTheDocument();
      });
    });

    describe('when there are snapshots and repositories', () => {
      const snapshot1 = fixtures.getSnapshot({
        repository: REPOSITORY_NAME,
        snapshot: 'a-snapshot',
        featureStates: ['kibana'],
      });
      const snapshot2 = fixtures.getSnapshot({
        repository: REPOSITORY_NAME,
        snapshot: 'b-snapshot',
        includeGlobalState: false,
      });
      const snapshots = [snapshot1, snapshot2];

      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadSnapshotsResponse({ snapshots, total: 2, errors: {} });
        httpRequestsMockHelpers.setLoadRepositoriesResponse({
          repositories: [{ name: REPOSITORY_NAME }],
        });
        httpRequestsMockHelpers.setLoadPoliciesResponse({ policies: [] });

        renderHomePage();
        await goToSnapshotsTab();
      });

      test('should list them in the table', async () => {
        const table = await screen.findByTestId('snapshotTable');
        const rows = within(table).getAllByTestId('row');

        snapshots.forEach((snap, idx) => {
          expect(rows[idx]).toHaveTextContent(snap.snapshot);
          expect(rows[idx]).toHaveTextContent(REPOSITORY_NAME);
          expect(rows[idx]).toHaveTextContent(String(snap.indices.length));
          expect(rows[idx]).toHaveTextContent('Complete');
        });
      });

      test('should show a warning if one repository contains errors', async () => {
        httpRequestsMockHelpers.setLoadSnapshotsResponse({
          snapshots,
          total: 2,
          errors: {
            repository_with_errors: {
              type: 'repository_exception',
              reason:
                '[repository_with_errors] Could not read repository data because the contents of the repository do not match its expected state.',
            },
          },
        });
        // Re-run the request to pick up the new mocked response.
        const user = userEvent.setup();
        await user.click(screen.getByTestId('reloadButton'));

        const warning = await screen.findByTestId('repositoryErrorsWarning');
        expect(warning).toHaveTextContent('Some repositories contain errors');
      });

      test('each row should have a link to the repository', async () => {
        httpRequestsMockHelpers.setGetRepositoryResponse(REPOSITORY_NAME, {
          repository: {
            name: REPOSITORY_NAME,
            type: 'fs',
            settings: { location: '/tmp/es-backups' },
          },
          snapshots: { count: 0 },
        });

        const table = await screen.findByTestId('snapshotTable');
        const firstRow = within(table).getAllByTestId('row')[0];

        const user = userEvent.setup();
        await user.click(within(firstRow).getAllByTestId('repositoryLink')[0]);

        await screen.findByTestId('repositoryList');
        const repositoryDetail = await screen.findByTestId('repositoryDetail');
        expect(within(repositoryDetail).getByTestId('title')).toHaveTextContent(REPOSITORY_NAME);
      });

      test('should have a button to reload the snapshots', async () => {
        await screen.findByTestId('reloadButton');
        const user = userEvent.setup();
        await user.click(screen.getByTestId('reloadButton'));

        await waitFor(() => {
          expect(httpSetup.get).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}snapshots`,
            expect.anything()
          );
        });
      });

      describe('detail panel', () => {
        beforeEach(() => {
          httpRequestsMockHelpers.setGetSnapshotResponse(
            snapshot1.repository,
            snapshot1.snapshot,
            snapshot1
          );
        });

        const clickSnapshotAt = async (index: number) => {
          const table = await screen.findByTestId('snapshotTable');
          const row = within(table).getAllByTestId('row')[index];
          const user = userEvent.setup();
          await user.click(within(row).getByTestId('snapshotLink'));
          return await screen.findByTestId('snapshotDetail');
        };

        test('should show the detail when clicking on a snapshot', async () => {
          expect(screen.queryByTestId('snapshotDetail')).not.toBeInTheDocument();
          const detail = await clickSnapshotAt(0);
          // Wait for mount-time request to resolve inside act
          await within(detail).findByTestId('version');
          expect(detail).toBeInTheDocument();
        });

        test('should show a loading while fetching the snapshot', async () => {
          const snapshotDeferred = createDeferred<Snapshot>();
          httpRequestsMockHelpers.setGetSnapshotResponse(
            snapshot1.repository,
            snapshot1.snapshot,
            snapshotDeferred.promise as unknown as Snapshot
          );

          const detail = await clickSnapshotAt(0);
          const loading = await within(detail).findByTestId('sectionLoading');
          expect(loading).toHaveTextContent('Loading snapshot…');

          snapshotDeferred.resolve(snapshot1);
          // Wait for the request to resolve to avoid act warnings.
          await within(detail).findByTestId('version');
        });

        describe('on mount', () => {
          beforeEach(async () => {
            const detail = await clickSnapshotAt(0);
            await within(detail).findByTestId('version');
          });

          test('should set the correct title', async () => {
            const detail = await screen.findByTestId('snapshotDetail');
            expect(within(detail).getByTestId('detailTitle')).toHaveTextContent(snapshot1.snapshot);
          });

          test('should have a link to show the repository detail', async () => {
            httpRequestsMockHelpers.setGetRepositoryResponse(REPOSITORY_NAME, {
              repository: {
                name: REPOSITORY_NAME,
                type: 'fs',
                settings: { location: '/tmp/es-backups' },
              },
              snapshots: { count: 0 },
            });

            const detail = await screen.findByTestId('snapshotDetail');
            const link = within(detail).getByTestId('repositoryLink');

            const user = userEvent.setup();
            await user.click(link);

            await screen.findByTestId('repositoryList');
            const repositoryDetail = await screen.findByTestId('repositoryDetail');
            expect(within(repositoryDetail).getByTestId('title')).toHaveTextContent(
              REPOSITORY_NAME
            );
          });

          test('should have a button to close the detail panel', async () => {
            const detail = await screen.findByTestId('snapshotDetail');
            const user = userEvent.setup();
            await user.click(within(detail).getByTestId('closeButton'));

            await waitFor(() => {
              expect(screen.queryByTestId('snapshotDetail')).not.toBeInTheDocument();
            });
          });

          test('should show feature states if include global state is enabled', async () => {
            const detail = await screen.findByTestId('snapshotDetail');

            const includeGlobalState = within(detail).getByTestId('includeGlobalState');
            expect(within(includeGlobalState).getByTestId('value')).toHaveTextContent('Yes');

            const featureStatesSummary = within(detail).getByTestId('snapshotFeatureStatesSummary');
            expect(within(featureStatesSummary).getByTestId('featureStatesList')).toHaveTextContent(
              'kibana'
            );

            const user = userEvent.setup();
            await user.click(within(detail).getByTestId('closeButton'));

            httpRequestsMockHelpers.setGetSnapshotResponse(
              snapshot2.repository,
              snapshot2.snapshot,
              snapshot2
            );
            const detail2 = await clickSnapshotAt(1);
            await within(detail2).findByTestId('version');
            const includeGlobalState2 = within(detail2).getByTestId('includeGlobalState');
            expect(within(includeGlobalState2).getByTestId('value')).toHaveTextContent('No');

            const featureStatesSummary2 = within(detail2).getByTestId(
              'snapshotFeatureStatesSummary'
            );
            expect(within(featureStatesSummary2).getByTestId('value')).toHaveTextContent('No');
          });

          describe('tabs', () => {
            test('should have 2 tabs', async () => {
              const detail = await screen.findByTestId('snapshotDetail');
              const tabs = within(detail).getAllByTestId('tab');

              expect(tabs).toHaveLength(2);
              expect(tabs[0]).toHaveTextContent('Summary');
              expect(tabs[1]).toHaveTextContent('Failed indices (0)');
            });

            test('should have the default tab set on "Summary"', async () => {
              const detail = await screen.findByTestId('snapshotDetail');
              const tabs = within(detail).getAllByTestId('tab');

              expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
            });

            describe('summary tab', () => {
              test('should set the correct summary values', async () => {
                const detail = await screen.findByTestId('snapshotDetail');

                const version = within(detail).getByTestId('version');
                expect(within(version).getByTestId('value')).toHaveTextContent(snapshot1.version);

                const uuid = within(detail).getByTestId('uuid');
                expect(within(uuid).getByTestId('value')).toHaveTextContent(snapshot1.uuid);

                const state = within(detail).getByTestId('state');
                expect(within(state).getByTestId('value')).toHaveTextContent('Complete');

                const includeGlobalState = within(detail).getByTestId('includeGlobalState');
                expect(within(includeGlobalState).getByTestId('value')).toHaveTextContent('Yes');

                const featureStatesSummary = within(detail).getByTestId(
                  'snapshotFeatureStatesSummary'
                );
                expect(
                  within(featureStatesSummary).getByTestId('featureStatesList')
                ).toHaveTextContent('kibana');

                const indices = within(detail).getByTestId('indices');
                expect(within(indices).getByTestId('title')).toHaveTextContent(
                  `Indices (${snapshot1.indices.length})`
                );
                expect(within(indices).getByTestId('value')).toHaveTextContent(
                  snapshot1.indices[0]
                );
              });

              test('should indicate the different snapshot states', async () => {
                const mapStateToMessage: Record<string, string> = {
                  [SNAPSHOT_STATE.IN_PROGRESS]: 'In progress',
                  [SNAPSHOT_STATE.FAILED]: 'Failed',
                  [SNAPSHOT_STATE.PARTIAL]: 'Partial',
                  [SNAPSHOT_STATE.SUCCESS]: 'Complete',
                };

                let itemIndexToClickOn = 1;

                const setSnapshotStateAndUpdateDetail = async (state: string) => {
                  const updatedSnapshot = { ...snapshot1, state };
                  httpRequestsMockHelpers.setGetSnapshotResponse(
                    itemIndexToClickOn === 0 ? snapshot1.repository : snapshot2.repository,
                    itemIndexToClickOn === 0 ? snapshot1.snapshot : snapshot2.snapshot,
                    updatedSnapshot
                  );

                  return await clickSnapshotAt(itemIndexToClickOn);
                };

                const expectMessageForSnapshotState = async (
                  state: string,
                  expectedMessage: string
                ) => {
                  const detail = await setSnapshotStateAndUpdateDetail(state);
                  const stateRow = within(detail).getByTestId('state');
                  expect(within(stateRow).getByTestId('value')).toHaveTextContent(expectedMessage);

                  itemIndexToClickOn = itemIndexToClickOn ? 0 : 1;
                };

                for (const [state, msg] of Object.entries(mapStateToMessage)) {
                  await expectMessageForSnapshotState(state, msg);
                }
              });
            });

            describe('failed indices tab', () => {
              test('should display a message when snapshot created successfully', async () => {
                const detail = await screen.findByTestId('snapshotDetail');
                const tabs = within(detail).getAllByTestId('tab');

                const user = userEvent.setup();
                await user.click(tabs[1]);

                expect(within(detail).getByTestId('content')).toHaveTextContent(
                  'All indices were stored successfully.'
                );
              });

              test('should display a message when snapshot in progress ', async () => {
                const updatedSnapshot = { ...snapshot2, state: SNAPSHOT_STATE.IN_PROGRESS };
                httpRequestsMockHelpers.setGetSnapshotResponse(
                  snapshot2.repository,
                  snapshot2.snapshot,
                  updatedSnapshot
                );

                const detail = await clickSnapshotAt(1);
                const tabs = within(detail).getAllByTestId('tab');

                const user = userEvent.setup();
                await user.click(tabs[1]);

                expect(within(detail).getByTestId('content')).toHaveTextContent(
                  'Snapshot is being created.'
                );
              });
            });
          });
        });
      });

      describe('when there are failed indices', () => {
        const failure1 = fixtures.getIndexFailure();
        const failure2 = fixtures.getIndexFailure();
        const indexFailures = [failure1, failure2];

        beforeEach(async () => {
          const updatedSnapshot = { ...snapshot1, indexFailures };
          httpRequestsMockHelpers.setGetSnapshotResponse(
            updatedSnapshot.repository,
            updatedSnapshot.snapshot,
            updatedSnapshot
          );

          const table = await screen.findByTestId('snapshotTable');
          const row = within(table).getAllByTestId('row')[0];
          const user = userEvent.setup();
          await user.click(within(row).getByTestId('snapshotLink'));

          const detail = await screen.findByTestId('snapshotDetail');
          const tabs = within(detail).getAllByTestId('tab');
          await user.click(tabs[1]);
        });

        test('should update the tab label', async () => {
          const detail = await screen.findByTestId('snapshotDetail');
          const tabs = within(detail).getAllByTestId('tab');
          expect(tabs[1]).toHaveTextContent(`Failed indices (${indexFailures.length})`);
        });

        test('should display the failed indices', async () => {
          const detail = await screen.findByTestId('snapshotDetail');
          const failures = within(detail).getAllByTestId('indexFailure');
          expect(failures).toHaveLength(2);

          const found = failures.map((node) => within(node).getByTestId('index').textContent ?? '');
          expect(found).toEqual([failure1.index, failure2.index]);
        });

        test('should detail the failure for each index', async () => {
          const detail = await screen.findByTestId('snapshotDetail');
          const firstIndexFailure = within(detail).getAllByTestId('indexFailure')[0];

          const failuresFound = within(firstIndexFailure).getAllByTestId('failure');
          expect(failuresFound).toHaveLength(failure1.failures.length);

          const failure0 = failuresFound[0];
          expect(within(failure0).getByTestId('shard')).toHaveTextContent(
            `Shard ${failure1.failures[0].shard_id}`
          );
          expect(within(failure0).getByTestId('reason')).toHaveTextContent(
            `${failure1.failures[0].status}: ${failure1.failures[0].reason}`
          );
        });
      });
    });

    describe('when there is an error while fetching the snapshots', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setLoadSnapshotsResponse(undefined, {
          statusCode: 500,
          message: '[repository_with_errors] cannot retrieve snapshots list from this repository',
        });
        httpRequestsMockHelpers.setLoadRepositoriesResponse({
          repositories: [{ name: REPOSITORY_NAME }, { name: 'repository_with_errors' }],
        });
        httpRequestsMockHelpers.setLoadPoliciesResponse({ policies: [] });

        renderHomePage();
        await goToSnapshotsTab();
      });

      test('should show a generic error prompt if snapshots request fails while still showing the search bar', async () => {
        await screen.findByTestId('snapshotListSearch');
        expect(screen.getByTestId('snapshotListSearch')).toBeInTheDocument();

        const error = await screen.findByTestId('snapshotsLoadingError');
        expect(error).toHaveTextContent('Error loading snapshots');
      });

      test('should show a repository error prompt if snapshots request fails due to repository exception while still showing the search bar', async () => {
        httpRequestsMockHelpers.setLoadSnapshotsResponse(undefined, {
          statusCode: 500,
          message: '[repository_with_errors] cannot retrieve snapshots list from this repository',
          attributes: {
            error: {
              type: SNAPSHOT_REPOSITORY_EXCEPTION_ERROR,
            },
          },
        });
        httpRequestsMockHelpers.setLoadRepositoriesResponse({
          repositories: [{ name: REPOSITORY_NAME }, { name: 'repository_with_errors' }],
        });
        httpRequestsMockHelpers.setLoadPoliciesResponse({ policies: [] });

        await screen.findByTestId('snapshotListSearch');
        expect(screen.getByTestId('snapshotListSearch')).toBeInTheDocument();

        // Re-run the request to pick up the new mocked response.
        const user = userEvent.setup();
        await user.click(screen.getByTestId('reloadButton'));

        const prompt = await screen.findByTestId('repositoryErrorsPrompt');
        expect(prompt).toHaveTextContent('Some repositories contain errors');
      });
    });
  });
});
