/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent, waitFor } from '@testing-library/react';
import { API_BASE_PATH } from '../../../common/constants';
import { setupEnvironment } from '../../helpers/setup_environment';
import { renderEditPolicy } from '../../helpers/render_edit_policy';
import {
  DELETE_PHASE_POLICY,
  getDefaultHotPhasePolicy,
  NEW_SNAPSHOT_POLICY_NAME,
  SNAPSHOT_POLICY_NAME,
} from '../constants';

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

      renderEditPolicy(httpSetup);
      await screen.findByTestId('savePolicyButton');
    });

    test('is hidden', () => {
      expect(screen.queryByTestId('delete-phase')).not.toBeInTheDocument();
    });
  });

  describe('when delete phase is enabled', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadPolicies([DELETE_PHASE_POLICY]);
      httpRequestsMockHelpers.setLoadSnapshotPolicies([
        SNAPSHOT_POLICY_NAME,
        NEW_SNAPSHOT_POLICY_NAME,
      ]);

      renderEditPolicy(httpSetup);

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

        const input = screen.getByTestId('snapshotPolicyCombobox') as HTMLInputElement;

        await waitFor(() => {
          expect(input.value).toBe(expectedPolicyName);
        });
      });

      test('updates snapshot policy name', async () => {
        const input = screen.getByTestId('snapshotPolicyCombobox') as HTMLInputElement;

        await waitFor(() => {
          expect(input.value).toBe(SNAPSHOT_POLICY_NAME);
        });

        fireEvent.change(input, { target: { value: '' } });
        fireEvent.change(input, { target: { value: NEW_SNAPSHOT_POLICY_NAME } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 13 });

        const saveButton = screen.getByTestId('savePolicyButton');
        fireEvent.click(saveButton);

        await waitFor(() => expect(httpSetup.post).toHaveBeenCalled());

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

        await waitFor(() => {
          expect(input.value).toBe(SNAPSHOT_POLICY_NAME);
        });

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

        await waitFor(() => {
          expect(input.value).toBe(SNAPSHOT_POLICY_NAME);
        });

        fireEvent.change(input, { target: { value: '' } });
        fireEvent.blur(input);

        const saveButton = screen.getByTestId('savePolicyButton');
        fireEvent.click(saveButton);

        await waitFor(() => expect(httpSetup.post).toHaveBeenCalled());

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

        renderEditPolicy(httpSetup);

        await screen.findByTestId('delete-phase');

        await screen.findByTestId('noPoliciesCallout');

        expect(screen.queryByTestId('customPolicyCallout')).not.toBeInTheDocument();
        expect(screen.queryByTestId('policiesErrorCallout')).not.toBeInTheDocument();
      });

      test('shows a callout when there is an error loading snapshot policies', async () => {
        httpRequestsMockHelpers.setLoadSnapshotPolicies([], {
          statusCode: 500,
          message: 'error',
        });

        renderEditPolicy(httpSetup);

        await screen.findByTestId('delete-phase');

        await screen.findByTestId('policiesErrorCallout');

        expect(screen.queryByTestId('customPolicyCallout')).not.toBeInTheDocument();
        expect(screen.queryByTestId('noPoliciesCallout')).not.toBeInTheDocument();
      });
    });

    describe('delete searchable snapshot', () => {
      test('correctly updates the value', async () => {
        const toggle = screen.getByTestId('deleteSearchableSnapshotSwitch');
        fireEvent.click(toggle);

        const saveButton = screen.getByTestId('savePolicyButton');
        fireEvent.click(saveButton);

        await waitFor(() => expect(httpSetup.post).toHaveBeenCalled());

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
