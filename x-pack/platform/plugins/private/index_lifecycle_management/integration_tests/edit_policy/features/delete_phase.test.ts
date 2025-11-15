/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { API_BASE_PATH } from '../../../common/constants';
import { setupEnvironment } from '../../helpers';
import {
  DELETE_PHASE_POLICY,
  getDefaultHotPhasePolicy,
  NEW_SNAPSHOT_POLICY_NAME,
  SNAPSHOT_POLICY_NAME,
} from '../constants';
import { initTestBed } from '../init_test_bed';

describe('<EditPolicy /> delete phase', () => {
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ({ httpRequestsMockHelpers, httpSetup } = setupEnvironment());
  });

  describe('when delete phase is disabled', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadPolicies([getDefaultHotPhasePolicy()]);
      httpRequestsMockHelpers.setLoadSnapshotPolicies([
        SNAPSHOT_POLICY_NAME,
        NEW_SNAPSHOT_POLICY_NAME,
      ]);

      initTestBed(httpSetup);

      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
    });

    test('is hidden', () => {
      expect(screen.queryByTestId('delete-phase')).not.toBeInTheDocument();
    });

    // TODO: Add test for enabling phase - need to understand the UI for enabling disabled phases
  });

  describe('when delete phase is enabled', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadPolicies([DELETE_PHASE_POLICY]);
      httpRequestsMockHelpers.setLoadSnapshotPolicies([
        SNAPSHOT_POLICY_NAME,
        NEW_SNAPSHOT_POLICY_NAME,
      ]);

      initTestBed(httpSetup);

      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });

      // Wait for the delete phase to be visible (policy loaded and rendered)
      await waitFor(() => {
        expect(screen.getByTestId('delete-phase')).toBeInTheDocument();
      });
    });

    test('shows delete phase', () => {
      expect(screen.getByTestId('delete-phase')).toBeInTheDocument();
    });

    describe('wait for snapshot', () => {
      test('shows snapshot policy name', async () => {
        const expectedPolicyName =
          DELETE_PHASE_POLICY.policy.phases.delete?.actions.wait_for_snapshot?.policy;

        // Check the input value directly
        const input = screen.getByTestId('snapshotPolicyCombobox') as HTMLInputElement;

        await waitFor(() => {
          expect(input.value).toBe(expectedPolicyName);
        });
      });

      test('updates snapshot policy name', async () => {
        const input = screen.getByTestId('snapshotPolicyCombobox') as HTMLInputElement;

        // Wait for initial value to be populated
        await waitFor(() => {
          expect(input.value).toBe(SNAPSHOT_POLICY_NAME);
        });

        // Clear and type new policy name
        fireEvent.change(input, { target: { value: '' } });
        fireEvent.change(input, { target: { value: NEW_SNAPSHOT_POLICY_NAME } });
        // Trigger onCreateOption by pressing Enter
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 13 });

        // Save policy
        // Use getAllByTestId()[0] to handle duplicate test IDs (main-2co Pattern 6)
        const saveButton = screen.getAllByTestId('savePolicyButton')[0];
        fireEvent.click(saveButton);

        await act(async () => {
          await jest.runOnlyPendingTimersAsync();
        });

        const expected = {
          phases: {
            ...DELETE_PHASE_POLICY.policy.phases,
            delete: {
              ...DELETE_PHASE_POLICY.policy.phases.delete,
              actions: {
                ...DELETE_PHASE_POLICY.policy.phases.delete?.actions,
                wait_for_snapshot: {
                  policy: NEW_SNAPSHOT_POLICY_NAME,
                },
              },
            },
          },
          name: DELETE_PHASE_POLICY.name,
        };

        expect(httpSetup.post).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/policies`,
          expect.objectContaining({ body: JSON.stringify(expected) })
        );
      });

      test('shows a callout when the input is not an existing policy', async () => {
        const input = screen.getByTestId('snapshotPolicyCombobox') as HTMLInputElement;

        // Wait for initial value to be populated
        await waitFor(() => {
          expect(input.value).toBe(SNAPSHOT_POLICY_NAME);
        });

        // Clear and type custom policy name
        fireEvent.change(input, { target: { value: '' } });
        fireEvent.change(input, { target: { value: 'my_custom_policy' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 13 });

        await waitFor(() => {
          expect(screen.getByTestId('customPolicyCallout')).toBeInTheDocument();
        });

        expect(screen.queryByTestId('noPoliciesCallout')).not.toBeInTheDocument();
        expect(screen.queryByTestId('policiesErrorCallout')).not.toBeInTheDocument();
      });

      test('removes the action if field is empty', async () => {
        const input = screen.getByTestId('snapshotPolicyCombobox') as HTMLInputElement;

        // Wait for initial value to be populated
        await waitFor(() => {
          expect(input.value).toBe(SNAPSHOT_POLICY_NAME);
        });

        // Clear the input
        fireEvent.change(input, { target: { value: '' } });
        fireEvent.blur(input);

        // Save policy
        // Use getAllByTestId()[0] to handle duplicate test IDs (main-2co Pattern 6)
        const saveButton = screen.getAllByTestId('savePolicyButton')[0];
        fireEvent.click(saveButton);

        await act(async () => {
          await jest.runOnlyPendingTimersAsync();
        });

        const expected = {
          phases: {
            ...DELETE_PHASE_POLICY.policy.phases,
            delete: {
              ...DELETE_PHASE_POLICY.policy.phases.delete,
              actions: {
                ...DELETE_PHASE_POLICY.policy.phases.delete?.actions,
              },
            },
          },
          name: DELETE_PHASE_POLICY.name,
        };

        delete expected.phases.delete.actions.wait_for_snapshot;

        expect(httpSetup.post).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/policies`,
          expect.objectContaining({ body: JSON.stringify(expected) })
        );
      });

      test('shows a callout when there are no snapshot policies', async () => {
        httpRequestsMockHelpers.setLoadSnapshotPolicies([]);

        initTestBed(httpSetup);

        await act(async () => {
          await jest.runOnlyPendingTimersAsync();
        });

        expect(screen.queryByTestId('customPolicyCallout')).not.toBeInTheDocument();
        expect(screen.queryByTestId('policiesErrorCallout')).not.toBeInTheDocument();
        expect(screen.getByTestId('noPoliciesCallout')).toBeInTheDocument();
      });

      test('shows a callout when there is an error loading snapshot policies', async () => {
        httpRequestsMockHelpers.setLoadSnapshotPolicies([], {
          statusCode: 500,
          message: 'error',
        });

        initTestBed(httpSetup);

        await act(async () => {
          await jest.runOnlyPendingTimersAsync();
        });

        expect(screen.queryByTestId('customPolicyCallout')).not.toBeInTheDocument();
        expect(screen.queryByTestId('noPoliciesCallout')).not.toBeInTheDocument();
        expect(screen.getByTestId('policiesErrorCallout')).toBeInTheDocument();
      });
    });

    describe('delete searchable snapshot', () => {
      test('correctly updates the value', async () => {
        const toggle = screen.getByTestId('deleteSearchableSnapshotSwitch');
        fireEvent.click(toggle);

        // Save policy
        // Use getAllByTestId()[0] to handle duplicate test IDs (main-2co Pattern 6)
        const saveButton = screen.getAllByTestId('savePolicyButton')[0];
        fireEvent.click(saveButton);

        await act(async () => {
          await jest.runOnlyPendingTimersAsync();
        });

        const expected = {
          phases: {
            ...DELETE_PHASE_POLICY.policy.phases,
            delete: {
              ...DELETE_PHASE_POLICY.policy.phases.delete,
              actions: {
                ...DELETE_PHASE_POLICY.policy.phases.delete?.actions,
                delete: {
                  delete_searchable_snapshot: false,
                },
              },
            },
          },
          name: DELETE_PHASE_POLICY.name,
        };

        expect(httpSetup.post).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/policies`,
          expect.objectContaining({ body: JSON.stringify(expected) })
        );
      });
    });
  });
});
