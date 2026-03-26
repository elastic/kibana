/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './helpers/mocks';

import { fireEvent, screen, waitFor } from '@testing-library/react';

import { setupEnvironment } from './helpers/setup_environment';
import { renderApp } from './helpers/render_app';
import { POLICY_EDIT } from './helpers/constant';
import { API_BASE_PATH } from '../../common';
import { TIME_UNITS } from '../../common/constants';

describe('<PolicyEdit />', () => {
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];

  const EXPIRE_AFTER_VALUE = '5';
  const EXPIRE_AFTER_UNIT = TIME_UNITS.MINUTE;

  const setupPage = async ({
    policy = POLICY_EDIT,
    repositories = [{ name: policy.repository }],
  }: {
    policy?: typeof POLICY_EDIT;
    repositories?: Array<{ name: string }>;
  } = {}) => {
    httpRequestsMockHelpers.setGetPolicyResponse(policy.name, { policy });
    // Ensure the policy loads *before* indices resolve, so PolicyEdit's effect can set `policy`
    // while the component still renders the "loading indices" screen. This avoids mounting
    // PolicyForm with an empty policy (and getting stuck there).
    const indicesDeferred = {
      promise: Promise.resolve({ indices: ['my_index'], dataStreams: ['my_data_stream'] }),
      resolve: (_value: { indices: string[]; dataStreams: string[] }) => {},
    };
    // Create a real deferred to control timing.
    {
      let resolve!: (value: { indices: string[]; dataStreams: string[] }) => void;
      indicesDeferred.promise = new Promise((res) => {
        resolve = res;
      });
      indicesDeferred.resolve = resolve;
    }

    // Promise cast needed: mock helper signature doesn't explicitly allow Promise for gating tests
    httpRequestsMockHelpers.setLoadIndicesResponse(
      indicesDeferred.promise as unknown as { indices: string[]; dataStreams: string[] }
    );
    httpRequestsMockHelpers.setLoadRepositoriesResponse({
      repositories,
    });
    httpRequestsMockHelpers.setLoadFeaturesResponse({
      features: [{ name: 'kibana' }, { name: 'tasks' }],
    });

    const renderResult = renderApp(httpSetup, {
      initialEntries: [`/edit_policy/${policy.name}`],
    });

    // Prevent route transitions after submit/cancel (not under test here).
    jest.spyOn(renderResult.history, 'push').mockImplementation(() => {});

    // Wait until the policy request has resolved and indices are still loading.
    await screen.findByText('Loading available indices…');
    indicesDeferred.resolve({ indices: ['my_index'], dataStreams: ['my_data_stream'] });

    // Wait for PolicyForm to mount with stable fields.
    await screen.findByTestId('snapshotNameInput');

    return renderResult;
  };

  const setupPolicyAddPage = ({
    repositories = [{ name: POLICY_EDIT.repository }],
  }: {
    repositories?: Array<{ name: string }>;
  } = {}) => {
    httpRequestsMockHelpers.setLoadRepositoriesResponse({ repositories });
    httpRequestsMockHelpers.setLoadIndicesResponse({
      indices: ['my_index'],
      dataStreams: ['my_data_stream'],
    });
    httpRequestsMockHelpers.setLoadFeaturesResponse({
      features: [{ name: 'kibana' }, { name: 'tasks' }],
    });

    const renderResult = renderApp(httpSetup, { initialEntries: ['/add_policy'] });

    // Prevent route transitions after submit/cancel (not under test here).
    jest.spyOn(renderResult.history, 'push').mockImplementation(() => {});

    return renderResult;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    const env = setupEnvironment();
    httpSetup = env.httpSetup;
    httpRequestsMockHelpers = env.httpRequestsMockHelpers;
  });

  describe('on component mount', () => {
    test('should set the correct page title', async () => {
      await setupPage();

      const pageTitle = await screen.findByTestId('pageTitle');
      expect(pageTitle).toHaveTextContent('Edit policy');
    });

    /**
     * As the "edit" policy component uses the same form underneath that
     * the "create" policy, we won't test it again but simply make sure that
     * the same form component is indeed shared between the 2 app sections.
     */
    test('should use the same Form component as the "<PolicyAdd />" section', async () => {
      const { unmount } = await setupPage();

      await screen.findByTestId('snapshotNameInput');
      expect(screen.getByTestId('nextButton')).toBeInTheDocument();

      unmount();

      setupPolicyAddPage();
      await screen.findByTestId('nameInput');
      expect(screen.getByTestId('nextButton')).toBeInTheDocument();
    });

    test('should disable the policy name field', async () => {
      await setupPage();

      const nameInput = await screen.findByTestId('nameInput');
      expect(nameInput).toBeDisabled();
    });

    describe('policy with pre-existing repository that was deleted', () => {
      beforeEach(() => {
        void setupPage({ repositories: [{ name: 'this-is-a-new-repository' }] });
      });

      test('should show repository-not-found warning', async () => {
        await screen.findByTestId('repositoryNotFoundWarning');
        // The select should be an empty string to allow users to select a new repository
        expect(screen.getByTestId('repositorySelect')).toHaveValue('');
      });

      describe('validation', () => {
        test('should block navigating to next step', async () => {
          await screen.findByTestId('repositoryNotFoundWarning');

          fireEvent.click(screen.getByTestId('nextButton'));

          // Assert that we are still on the repository configuration step
          await screen.findByTestId('repositoryNotFoundWarning');
          // The select should be an empty string to allow users to select a new repository
          expect(screen.getByTestId('repositorySelect')).toHaveValue('');
        });
      });
    });

    test('should disable the repo and snapshot fields for managed policies', async () => {
      await setupPage({
        policy: { ...POLICY_EDIT, isManagedPolicy: true } as typeof POLICY_EDIT & {
          isManagedPolicy: true;
        },
      });

      expect(await screen.findByTestId('snapshotNameInput')).toBeDisabled();
      expect(screen.getByTestId('repositorySelect')).toBeDisabled();
    });

    describe('form payload', () => {
      test('should send the correct payload with changed values', async () => {
        await setupPage();

        const { snapshotName } = POLICY_EDIT;

        // Complete step 1, change snapshot name
        const editedSnapshotName = `${snapshotName}-edited`;
        await screen.findByTestId('snapshotNameInput');
        // Ensure the repository is selected after repositories load (clears repositoryDoesNotExist validation helper).
        await screen.findByTestId('repositorySelect');
        const repositorySelect = screen.getByTestId('repositorySelect');
        fireEvent.change(repositorySelect, {
          target: { value: POLICY_EDIT.repository },
        });
        fireEvent.blur(repositorySelect);
        await waitFor(() => expect(repositorySelect).toHaveValue(POLICY_EDIT.repository));
        fireEvent.change(screen.getByTestId('snapshotNameInput'), {
          target: { value: editedSnapshotName },
        });
        fireEvent.blur(screen.getByTestId('snapshotNameInput'));

        await waitFor(() => expect(screen.getByTestId('nextButton')).not.toBeDisabled());
        fireEvent.click(screen.getByTestId('nextButton'));

        // Complete step 2, enable ignore unavailable indices switch
        await screen.findByTestId('ignoreUnavailableIndicesToggle');
        fireEvent.click(screen.getByTestId('ignoreUnavailableIndicesToggle'));

        await waitFor(() => expect(screen.getByTestId('nextButton')).not.toBeDisabled());
        fireEvent.click(screen.getByTestId('nextButton'));

        // Complete step 3, modify retention
        await screen.findByTestId('expireAfterValueInput');
        fireEvent.change(screen.getByTestId('expireAfterValueInput'), {
          target: { value: EXPIRE_AFTER_VALUE },
        });
        fireEvent.change(screen.getByTestId('expireAfterUnitSelect'), {
          target: { value: EXPIRE_AFTER_UNIT },
        });

        await waitFor(() => expect(screen.getByTestId('nextButton')).not.toBeDisabled());
        fireEvent.click(screen.getByTestId('nextButton'));

        await screen.findByTestId('submitButton');
        fireEvent.click(screen.getByTestId('submitButton'));

        const { name, isManagedPolicy, schedule, repository, retention } = POLICY_EDIT;

        await waitFor(() => {
          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}policies/${name}`,
            expect.objectContaining({
              body: JSON.stringify({
                name,
                snapshotName: editedSnapshotName,
                schedule,
                repository,
                config: {
                  featureStates: ['kibana'],
                  includeGlobalState: true,
                  ignoreUnavailable: true,
                },
                retention: {
                  ...retention,
                  expireAfterUnit: EXPIRE_AFTER_UNIT,
                  expireAfterValue: Number(EXPIRE_AFTER_VALUE),
                },
                isManagedPolicy,
              }),
            })
          );
        });
      });

      test('should provide a default time unit value for retention', async () => {
        await setupPage();

        // Bypass step 1
        await screen.findByTestId('snapshotNameInput');
        // Ensure the repository is selected after repositories load (clears repositoryDoesNotExist validation helper).
        await screen.findByTestId('repositorySelect');
        const repositorySelect = screen.getByTestId('repositorySelect');
        fireEvent.change(repositorySelect, {
          target: { value: POLICY_EDIT.repository },
        });
        fireEvent.blur(repositorySelect);
        await waitFor(() => expect(repositorySelect).toHaveValue(POLICY_EDIT.repository));
        await waitFor(() => expect(screen.getByTestId('nextButton')).not.toBeDisabled());
        fireEvent.click(screen.getByTestId('nextButton'));
        await screen.findByTestId('ignoreUnavailableIndicesToggle');

        // Bypass step 2
        await waitFor(() => expect(screen.getByTestId('nextButton')).not.toBeDisabled());
        fireEvent.click(screen.getByTestId('nextButton'));
        await screen.findByTestId('expireAfterValueInput');

        // Step 3: Add expire after value, but do not change unit
        fireEvent.change(screen.getByTestId('expireAfterValueInput'), {
          target: { value: EXPIRE_AFTER_VALUE },
        });

        await waitFor(() => expect(screen.getByTestId('nextButton')).not.toBeDisabled());
        fireEvent.click(screen.getByTestId('nextButton'));

        await screen.findByTestId('submitButton');
        fireEvent.click(screen.getByTestId('submitButton'));

        const { name, isManagedPolicy, schedule, repository, retention, snapshotName } =
          POLICY_EDIT;

        await waitFor(() => {
          expect(httpSetup.put).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}policies/${name}`,
            expect.objectContaining({
              body: JSON.stringify({
                name,
                snapshotName,
                schedule,
                repository,
                config: {
                  featureStates: ['kibana'],
                  includeGlobalState: true,
                },
                retention: {
                  ...retention,
                  expireAfterUnit: TIME_UNITS.DAY, // default value
                  expireAfterValue: Number(EXPIRE_AFTER_VALUE),
                },
                isManagedPolicy,
              }),
            })
          );
        });
      });
    });
  });
});
