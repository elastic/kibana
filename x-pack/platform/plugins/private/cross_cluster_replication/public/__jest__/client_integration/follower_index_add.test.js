/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ILLEGAL_CHARACTERS_VISIBLE } from '@kbn/data-views-plugin/public';
import { fireEvent, screen, act } from '@testing-library/react';
import './mocks';
import { setupEnvironment, pageHelpers } from './helpers';

const { setup } = pageHelpers.followerIndexAdd;

describe('Create Follower index', () => {
  let httpSetup;
  let httpRequestsMockHelpers;
  let user;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;
    httpRequestsMockHelpers.setLoadRemoteClustersResponse();
  });

  describe('on component mount', () => {
    beforeEach(() => {
      // Override HTTP mocks to return never-resolving promises
      // This keeps the component in LOADING state without triggering act warnings
      httpSetup.get.mockImplementation(() => new Promise(() => {}));

      ({ user } = setup());
    });

    test('should display a "loading remote clusters" indicator', () => {
      expect(screen.getByTestId('sectionLoading')).toBeInTheDocument();
      expect(screen.getByTestId('sectionLoading').textContent).toBe('Loading remote clusters…');
    });
  });

  describe('when remote clusters are loaded', () => {
    beforeEach(async () => {
      ({ user } = setup());
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    });

    test('should have a link to the documentation', () => {
      expect(screen.getByTestId('docsButton')).toBeInTheDocument();
    });

    test('should display the Follower index form', () => {
      expect(screen.getByTestId('followerIndexForm')).toBeInTheDocument();
    });

    test('should display errors and disable the save button when clicking "save" without filling the form', async () => {
      expect(screen.queryByTestId('formError')).not.toBeInTheDocument();
      expect(screen.getByTestId('submitButton')).not.toBeDisabled();

      const saveButton = screen.getByTestId('submitButton');
      await user.click(saveButton);

      expect(screen.getByTestId('formError')).toBeInTheDocument();
      const errors = screen.queryAllByText(/Leader index is required|Name is required/);
      expect(errors.length).toBeGreaterThanOrEqual(2);
      expect(screen.getByTestId('submitButton')).toBeDisabled();
    });
  });

  describe('form validation', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRemoteClustersResponse([
        { name: 'cluster-1', isConnected: true },
      ]);
      ({ user } = setup());
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    });

    describe('remote cluster', () => {
      test('should use the same <RemoteClustersFormField /> component as the <AutoFollowPatternAdd /> section', () => {
        expect(screen.getByTestId('remoteClusterFormField')).toBeInTheDocument();
      });
    });

    describe('leader index', () => {
      test('should not allow spaces', () => {
        const leaderInput = screen.getByTestId('leaderIndexInput');
        fireEvent.change(leaderInput, { target: { value: 'with space' } });
        fireEvent.blur(leaderInput);

        const saveButton = screen.getByTestId('submitButton');
        fireEvent.click(saveButton);

        expect(screen.getByText('Spaces are not allowed in the leader index.')).toBeInTheDocument();
      });

      test('should not allow invalid characters', () => {
        const leaderInput = screen.getByTestId('leaderIndexInput');
        const saveButton = screen.getByTestId('submitButton');

        fireEvent.click(saveButton); // make erros visible

        // Test a few representative illegal characters
        const testChars = ILLEGAL_CHARACTERS_VISIBLE.slice(0, 3);
        for (const char of testChars) {
          fireEvent.change(leaderInput, { target: { value: `with${char}` } });
          fireEvent.blur(leaderInput);

          const errors = screen.queryAllByText(/Remove the character|not allowed/);
          expect(errors.length).toBeGreaterThan(0);
        }
      });
    });

    describe('follower index', () => {
      test('should not allow spaces', () => {
        const followerInput = screen.getByTestId('followerIndexInput');
        fireEvent.change(followerInput, { target: { value: 'with space' } });
        fireEvent.blur(followerInput);

        const saveButton = screen.getByTestId('submitButton');
        fireEvent.click(saveButton);

        expect(screen.getByText('Spaces are not allowed in the name.')).toBeInTheDocument();
      });

      test('should not allow a "." (period) as first character', () => {
        const followerInput = screen.getByTestId('followerIndexInput');
        fireEvent.change(followerInput, { target: { value: '.withDot' } });
        fireEvent.blur(followerInput);

        const saveButton = screen.getByTestId('submitButton');
        fireEvent.click(saveButton);

        expect(screen.getByText(`Name can't begin with a period.`)).toBeInTheDocument();
      });

      test('should not allow invalid characters', () => {
        const followerInput = screen.getByTestId('followerIndexInput');
        const saveButton = screen.getByTestId('submitButton');

        fireEvent.click(saveButton); // make erros visible

        // Test a few representative illegal characters
        const testChars = ILLEGAL_CHARACTERS_VISIBLE.slice(0, 3);
        for (const char of testChars) {
          fireEvent.change(followerInput, { target: { value: `with${char}` } });
          fireEvent.blur(followerInput);

          const errors = screen.queryAllByText(/Remove the character|not allowed/);
          expect(errors.length).toBeGreaterThan(0);
        }
      });

      describe('ES index name validation', () => {
        test('should make a request to check if the index name is available in ES', async () => {
          httpRequestsMockHelpers.setGetClusterIndicesResponse([]);

          const followerInput = screen.getByTestId('followerIndexInput');
          fireEvent.change(followerInput, { target: { value: 'index-name' } });
          fireEvent.blur(followerInput);

          // Wait for debounced validation (500ms)
          await act(async () => {
            await jest.advanceTimersByTimeAsync(550);
          });

          expect(httpSetup.get).toHaveBeenCalledWith(
            `/api/index_management/indices`,
            expect.anything()
          );
        });

        test('should display an error if the index already exists', async () => {
          const indexName = 'index-name';
          httpRequestsMockHelpers.setGetClusterIndicesResponse([{ name: indexName }]);

          const followerInput = screen.getByTestId('followerIndexInput');
          fireEvent.change(followerInput, { target: { value: indexName } });
          fireEvent.blur(followerInput);

          // Wait for debounced validation
          await act(async () => {
            await jest.advanceTimersByTimeAsync(550);
          });

          expect(
            screen.getByText('An index with the same name already exists.')
          ).toBeInTheDocument();
        });
      });
    });

    describe('advanced settings', () => {
      const advancedSettingsInputFields = {
        maxReadRequestOperationCountInput: { default: 5120, type: 'number' },
        maxOutstandingReadRequestsInput: { default: 12, type: 'number' },
        maxReadRequestSizeInput: { default: '32mb', type: 'string' },
        maxWriteRequestOperationCountInput: { default: 5120, type: 'number' },
        maxWriteRequestSizeInput: { default: '9223372036854775807b', type: 'string' },
        maxOutstandingWriteRequestsInput: { default: 9, type: 'number' },
        maxWriteBufferCountInput: { default: 2147483647, type: 'number' },
        maxWriteBufferSizeInput: { default: '512mb', type: 'string' },
        maxRetryDelayInput: { default: '500ms', type: 'string' },
        readPollTimeoutInput: { default: '1m', type: 'string' },
      };

      test('should have a toggle to activate advanced settings', async () => {
        // Initially advanced settings should not be visible
        Object.keys(advancedSettingsInputFields).forEach((testSubj) => {
          expect(screen.queryByTestId(testSubj)).not.toBeInTheDocument();
        });

        const toggle = await screen.findByTestId('advancedSettingsToggle');
        await user.click(toggle);

        // After toggle, all should be visible
        Object.keys(advancedSettingsInputFields).forEach((testSubj) => {
          expect(screen.getByTestId(testSubj)).toBeInTheDocument();
        });
      });

      test('should set the correct default value for each advanced setting', async () => {
        const toggle = await screen.findByTestId('advancedSettingsToggle');
        await user.click(toggle);

        Object.entries(advancedSettingsInputFields).forEach(([testSubj, data]) => {
          const input = screen.getByTestId(testSubj);
          expect(input).toHaveValue(data.default);
        });
      });

      test('should set number input field for numeric advanced settings', async () => {
        const toggle = await screen.findByTestId('advancedSettingsToggle');
        await user.click(toggle);

        Object.entries(advancedSettingsInputFields).forEach(([testSubj, data]) => {
          const input = screen.getByTestId(testSubj);
          if (data.type === 'number') {
            expect(input.type).toBe('number');
          }
        });
      });
    });
  });
});
