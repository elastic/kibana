/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './helpers/mocks';

import { fireEvent, screen, waitFor, within } from '@testing-library/react';

import * as fixtures from '../../test/fixtures';
import { API_BASE_PATH } from '../../common';
import { DEFAULT_POLICY_SCHEDULE } from '../../public/application/constants';
import { FEATURE_STATES_NONE_OPTION } from '../../common/constants';
import { getRandomString } from '@kbn/test-jest-helpers';
import { setupEnvironment } from './helpers/setup_environment';
import { renderApp } from './helpers/render_app';

const POLICY_NAME = 'my_policy';
const SNAPSHOT_NAME = 'my_snapshot';
const MIN_COUNT = '5';
const MAX_COUNT = '10';
const EXPIRE_AFTER_VALUE = '30';
const repository = fixtures.getRepository({ name: `a${getRandomString()}`, type: 'fs' });

describe('<PolicyAdd />', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  const setupPage = async ({
    indices = ['my_index'],
    dataStreams = ['my_data_stream', 'my_other_data_stream'],
  }: { indices?: string[]; dataStreams?: string[] } = {}) => {
    httpRequestsMockHelpers.setLoadRepositoriesResponse({ repositories: [repository] });
    httpRequestsMockHelpers.setLoadIndicesResponse({ indices, dataStreams });
    httpRequestsMockHelpers.setLoadFeaturesResponse({
      features: [{ name: 'kibana' }, { name: 'tasks' }],
    });

    const { history } = renderApp(httpSetup, { initialEntries: ['/add_policy'] });
    // Prevent route transitions during submit (not under test here).
    jest.spyOn(history, 'push').mockImplementation(() => {});

    // Wait for initial mount-time requests/effects to settle to avoid act warnings.
    await screen.findByTestId('nameInput');
  };

  const fillStep1AndGoNext = async () => {
    await screen.findByTestId('nameInput');
    fireEvent.change(screen.getByTestId('nameInput'), { target: { value: POLICY_NAME } });
    fireEvent.change(screen.getByTestId('snapshotNameInput'), { target: { value: SNAPSHOT_NAME } });
    fireEvent.blur(screen.getByTestId('snapshotNameInput'));

    await waitFor(() => expect(screen.getByTestId('nextButton')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('nextButton'));
    await screen.findByTestId('allIndicesToggle');
  };

  const goToReviewStep = async () => {
    // Step 2 -> Step 3
    await waitFor(() => expect(screen.getByTestId('nextButton')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('nextButton'));
    await screen.findByTestId('expireAfterValueInput');

    // Step 3 -> Step 4
    await waitFor(() => expect(screen.getByTestId('nextButton')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('nextButton'));

    await screen.findByTestId('submitButton');
  };

  describe('on component mount', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      await setupPage();
    });

    test('should set the correct page title', async () => {
      const title = await screen.findByTestId('pageTitle');
      expect(title).toHaveTextContent('Create policy');
    });

    test('should not let the user go to the next step if required fields are missing', async () => {
      const nextButton = await screen.findByTestId('nextButton');
      expect(nextButton).toBeDisabled();
    });

    test('should not show repository-not-found warning', async () => {
      await screen.findByTestId('nameInput');
      expect(screen.queryByTestId('repositoryNotFoundWarning')).not.toBeInTheDocument();
    });

    describe('form validation', () => {
      describe('logistics (step 1)', () => {
        test('should require a policy name', async () => {
          await screen.findByTestId('nameInput');

          fireEvent.change(screen.getByTestId('nameInput'), { target: { value: '' } });
          fireEvent.blur(screen.getByTestId('nameInput'));
          expect(screen.getAllByText('Policy name is required.').length).toBeGreaterThan(0);

          fireEvent.change(screen.getByTestId('nameInput'), { target: { value: POLICY_NAME } });
          fireEvent.blur(screen.getByTestId('nameInput'));
          expect(screen.queryByText('Policy name is required.')).not.toBeInTheDocument();
        });

        test('should require a snapshot name that is lowercase', async () => {
          await screen.findByTestId('snapshotNameInput');

          fireEvent.change(screen.getByTestId('snapshotNameInput'), { target: { value: '' } });
          fireEvent.blur(screen.getByTestId('snapshotNameInput'));
          expect(screen.getAllByText('Snapshot name is required.').length).toBeGreaterThan(0);

          fireEvent.change(screen.getByTestId('snapshotNameInput'), {
            target: { value: 'MY_SNAPSHOT' },
          });
          fireEvent.blur(screen.getByTestId('snapshotNameInput'));
          expect(
            screen.getAllByText('Snapshot name needs to be lowercase.').length
          ).toBeGreaterThan(0);

          fireEvent.change(screen.getByTestId('snapshotNameInput'), {
            target: { value: SNAPSHOT_NAME },
          });
          fireEvent.blur(screen.getByTestId('snapshotNameInput'));
          expect(screen.queryByText('Snapshot name is required.')).not.toBeInTheDocument();
          expect(
            screen.queryByText('Snapshot name needs to be lowercase.')
          ).not.toBeInTheDocument();
        });

        test('should require a schedule', async () => {
          await screen.findByTestId('showAdvancedCronLink');
          fireEvent.click(screen.getByTestId('showAdvancedCronLink'));

          await screen.findByTestId('advancedCronInput');
          fireEvent.change(screen.getByTestId('advancedCronInput'), { target: { value: '' } });
          fireEvent.blur(screen.getByTestId('advancedCronInput'));
          expect(screen.getAllByText('Schedule is required.').length).toBeGreaterThan(0);

          fireEvent.change(screen.getByTestId('advancedCronInput'), {
            target: { value: '0 30 1 * * ?' },
          });
          fireEvent.blur(screen.getByTestId('advancedCronInput'));
          expect(screen.queryByText('Schedule is required.')).not.toBeInTheDocument();
        });
      });

      describe('snapshot settings (step 2)', () => {
        beforeEach(async () => {
          await fillStep1AndGoNext();
        });

        test('should require at least one index if no data streams are provided', async () => {
          fireEvent.click(screen.getByTestId('allIndicesToggle'));
          await screen.findByTestId('deselectIndicesLink');

          fireEvent.click(screen.getByTestId('deselectIndicesLink'));
          expect(
            screen.getAllByText('You must select at least one data stream or index.').length
          ).toBeGreaterThan(0);
        });

        test('should correctly indicate data streams with a badge', async () => {
          fireEvent.click(screen.getByTestId('allIndicesToggle'));
          await waitFor(() => expect(screen.getAllByTestId('dataStreamBadge')).toHaveLength(2));
        });
      });

      describe('retention (step 3)', () => {
        beforeEach(async () => {
          await fillStep1AndGoNext();

          // Step 2 -> Step 3
          await waitFor(() => expect(screen.getByTestId('nextButton')).not.toBeDisabled());
          fireEvent.click(screen.getByTestId('nextButton'));
          await screen.findByTestId('expireAfterValueInput');
        });

        test('should not allow the minimum count be greater than the maximum count', async () => {
          fireEvent.change(screen.getByTestId('minCountInput'), {
            target: { value: `${Number(MAX_COUNT) + 1}` },
          });
          fireEvent.blur(screen.getByTestId('minCountInput'));

          fireEvent.change(screen.getByTestId('maxCountInput'), { target: { value: MAX_COUNT } });
          fireEvent.blur(screen.getByTestId('maxCountInput'));

          expect(
            screen.getAllByText('Minimum count cannot be greater than maximum count.').length
          ).toBeGreaterThan(0);
        });

        test('should not allow negative values for the delete after, minimum and maximum counts', async () => {
          fireEvent.change(screen.getByTestId('expireAfterValueInput'), {
            target: { value: '-1' },
          });
          fireEvent.blur(screen.getByTestId('expireAfterValueInput'));

          fireEvent.change(screen.getByTestId('minCountInput'), { target: { value: '-1' } });
          fireEvent.blur(screen.getByTestId('minCountInput'));

          fireEvent.change(screen.getByTestId('maxCountInput'), { target: { value: '-1' } });
          fireEvent.blur(screen.getByTestId('maxCountInput'));

          expect(screen.getAllByText('Delete after cannot be negative.').length).toBeGreaterThan(0);
          expect(screen.getAllByText('Minimum count cannot be negative.').length).toBeGreaterThan(
            0
          );
          expect(screen.getAllByText('Maximum count cannot be negative.').length).toBeGreaterThan(
            0
          );
        });
      });
    });

    describe('feature states', () => {
      beforeEach(async () => {
        await fillStep1AndGoNext();
      });

      test('Enabling include global state enables include feature state', async () => {
        await screen.findByTestId('globalStateToggle');

        // Include global state is enabled by default; toggle twice to exercise enablement.
        fireEvent.click(screen.getByTestId('globalStateToggle'));
        fireEvent.click(screen.getByTestId('globalStateToggle'));

        expect(screen.getByTestId('featureStatesToggle')).not.toBeDisabled();
      });

      test('feature states dropdown is only shown when include feature states is enabled', async () => {
        await screen.findByTestId('featureStatesToggle');

        // By default the toggle is enabled
        expect(screen.getByTestId('featureStatesDropdown')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('featureStatesToggle'));
        expect(screen.queryByTestId('featureStatesDropdown')).not.toBeInTheDocument();
      });

      test('include all features by default', async () => {
        await goToReviewStep();

        fireEvent.click(screen.getByTestId('submitButton'));

        await waitFor(() => {
          expect(httpSetup.post).toHaveBeenCalled();
        });

        const lastCall = httpSetup.post.mock.calls.at(-1);
        if (!lastCall) {
          throw new Error('Expected httpSetup.post to have been called');
        }
        const [requestUrl, requestOptions] = lastCall as unknown as [string, { body: string }];
        const parsedReqBody = JSON.parse(requestOptions.body);

        expect(requestUrl).toBe(`${API_BASE_PATH}policies`);
        expect(parsedReqBody.config).toEqual({
          includeGlobalState: true,
          featureStates: [],
        });
      });

      test('include some features', async () => {
        const combo = await screen.findByTestId('featureStatesDropdown');
        const input = within(combo).getByRole('combobox');

        fireEvent.change(input, { target: { value: 'kibana' } });
        fireEvent.click(await screen.findByText('kibana'));

        await goToReviewStep();
        fireEvent.click(screen.getByTestId('submitButton'));

        await waitFor(() => {
          expect(httpSetup.post).toHaveBeenCalled();
        });

        const lastCall = httpSetup.post.mock.calls.at(-1);
        if (!lastCall) {
          throw new Error('Expected httpSetup.post to have been called');
        }
        const [requestUrl, requestOptions] = lastCall as unknown as [string, { body: string }];
        const parsedReqBody = JSON.parse(requestOptions.body);

        expect(requestUrl).toBe(`${API_BASE_PATH}policies`);
        expect(parsedReqBody.config).toEqual({
          includeGlobalState: true,
          featureStates: ['kibana'],
        });
      });

      test('include no features', async () => {
        await screen.findByTestId('featureStatesToggle');

        // Disable all features
        fireEvent.click(screen.getByTestId('featureStatesToggle'));

        await goToReviewStep();
        fireEvent.click(screen.getByTestId('submitButton'));

        await waitFor(() => {
          expect(httpSetup.post).toHaveBeenCalled();
        });

        const lastCall = httpSetup.post.mock.calls.at(-1);
        if (!lastCall) {
          throw new Error('Expected httpSetup.post to have been called');
        }
        const [requestUrl, requestOptions] = lastCall as unknown as [string, { body: string }];
        const parsedReqBody = JSON.parse(requestOptions.body);

        expect(requestUrl).toBe(`${API_BASE_PATH}policies`);
        expect(parsedReqBody.config).toEqual({
          includeGlobalState: true,
          featureStates: [FEATURE_STATES_NONE_OPTION],
        });
      });
    });

    describe('form payload & api errors', () => {
      beforeEach(async () => {
        await fillStep1AndGoNext();

        // Step 2 -> Step 3
        await waitFor(() => expect(screen.getByTestId('nextButton')).not.toBeDisabled());
        fireEvent.click(screen.getByTestId('nextButton'));
        await screen.findByTestId('expireAfterValueInput');

        fireEvent.change(screen.getByTestId('expireAfterValueInput'), {
          target: { value: EXPIRE_AFTER_VALUE },
        });
        fireEvent.change(screen.getByTestId('minCountInput'), { target: { value: MIN_COUNT } });
        fireEvent.change(screen.getByTestId('maxCountInput'), { target: { value: MAX_COUNT } });

        // Step 3 -> Step 4
        await waitFor(() => expect(screen.getByTestId('nextButton')).not.toBeDisabled());
        fireEvent.click(screen.getByTestId('nextButton'));
        await screen.findByTestId('submitButton');
      });

      test('should send the correct payload', async () => {
        fireEvent.click(screen.getByTestId('submitButton'));

        await waitFor(() => {
          expect(httpSetup.post).toHaveBeenLastCalledWith(
            `${API_BASE_PATH}policies`,
            expect.objectContaining({
              body: JSON.stringify({
                name: POLICY_NAME,
                snapshotName: SNAPSHOT_NAME,
                schedule: DEFAULT_POLICY_SCHEDULE,
                repository: repository.name,
                config: { featureStates: [], includeGlobalState: true },
                retention: {
                  expireAfterValue: Number(EXPIRE_AFTER_VALUE),
                  expireAfterUnit: 'd',
                  maxCount: Number(MAX_COUNT),
                  minCount: Number(MIN_COUNT),
                },
                isManagedPolicy: false,
              }),
            })
          );
        });
      });

      test('should surface the API errors from the put HTTP request', async () => {
        const error = {
          statusCode: 409,
          error: 'Conflict',
          message: `There is already a policy with name '${POLICY_NAME}'`,
        };

        httpRequestsMockHelpers.setAddPolicyResponse(undefined, error);

        fireEvent.click(screen.getByTestId('submitButton'));

        const callout = await screen.findByTestId('savePolicyApiError');
        expect(callout).toHaveTextContent(error.message);
      });
    });
  });
});
