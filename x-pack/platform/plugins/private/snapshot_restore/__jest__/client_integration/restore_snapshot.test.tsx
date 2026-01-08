/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './helpers/mocks';

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FEATURE_STATES_NONE_OPTION } from '../../common/constants';
import * as fixtures from '../../test/fixtures';
import { RestoreSnapshotForm } from '../../public/application/components/restore_snapshot_form/restore_snapshot_form';
import { setupEnvironment, WithAppDependencies } from './helpers/setup_environment';

describe('<RestoreSnapshotForm />', () => {
  const setupPage = (snapshotDetails = fixtures.getSnapshot()) => {
    const { httpSetup } = setupEnvironment();
    const onSave = jest.fn();
    const clearSaveError = jest.fn();

    const RestoreSnapshotFormWithDeps = WithAppDependencies(RestoreSnapshotForm, httpSetup);
    render(
      <RestoreSnapshotFormWithDeps
        snapshotDetails={snapshotDetails}
        isSaving={false}
        clearSaveError={clearSaveError}
        onSave={onSave}
      />
    );

    return { onSave };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('wizard navigation', () => {
    it('does not allow navigation when the step is invalid', async () => {
      const user = userEvent.setup();
      setupPage();

      await screen.findByTestId('nextButton');
      await user.click(screen.getByTestId('nextButton'));

      // Step 2: by default, navigation is allowed.
      const backButton = await screen.findByTestId('backButton');
      expect(backButton).not.toBeDisabled();
      expect(screen.getByTestId('nextButton')).not.toBeDisabled();

      // Enabling "Modify index settings" sets indexSettings to '{}', which is invalid (needs at least one setting).
      await user.click(screen.getByTestId('modifyIndexSettingsSwitch'));

      await waitFor(() => {
        expect(screen.getByTestId('backButton')).toBeDisabled();
        expect(screen.getByTestId('nextButton')).toBeDisabled();
      });
    });
  });

  describe('with data streams', () => {
    test('shows the data streams warning when the snapshot has data streams', async () => {
      setupPage(fixtures.getSnapshot());

      const callout = await screen.findByTestId('dataStreamWarningCallOut');
      expect(callout).toBeInTheDocument();
    });
  });

  describe('without data streams', () => {
    test('hides the data streams warning when the snapshot has data streams', async () => {
      setupPage(fixtures.getSnapshot({ totalDataStreams: 0 }));

      await screen.findByTestId('snapshotRestoreStepLogistics');
      expect(screen.queryByTestId('dataStreamWarningCallOut')).not.toBeInTheDocument();
    });
  });

  describe('feature states', () => {
    test('when no feature states hide dropdown and show no features callout', async () => {
      const user = userEvent.setup();
      setupPage(fixtures.getSnapshot({ featureStates: [] }));

      await screen.findByTestId('includeGlobalStateSwitch');
      await user.click(screen.getByTestId('includeGlobalStateSwitch'));

      expect(screen.queryByTestId('systemIndicesInfoCallOut')).not.toBeInTheDocument();
      expect(screen.queryByTestId('featureStatesDropdown')).not.toBeInTheDocument();
      expect(screen.getByTestId('noFeatureStatesCallout')).toBeInTheDocument();
    });

    test('shows an extra info callout when includeFeatureState is enabled and we have featureStates present in snapshot', async () => {
      const user = userEvent.setup();
      setupPage(fixtures.getSnapshot({ featureStates: ['kibana'] }));

      await screen.findByTestId('includeFeatureStatesSwitch');

      expect(screen.queryByTestId('systemIndicesInfoCallOut')).not.toBeInTheDocument();

      await user.click(screen.getByTestId('includeFeatureStatesSwitch'));

      const callout = await screen.findByTestId('systemIndicesInfoCallOut');
      expect(callout).toBeInTheDocument();
    });
  });

  describe('include aliases', () => {
    test('is sent to the API', async () => {
      const user = userEvent.setup();
      const { onSave } = setupPage(fixtures.getSnapshot());

      await screen.findByTestId('includeAliasesSwitch');
      await user.click(screen.getByTestId('includeAliasesSwitch'));

      await user.click(screen.getByTestId('nextButton'));
      await screen.findByTestId('indexSettingsTitle');

      await user.click(screen.getByTestId('nextButton'));
      await screen.findByTestId('restoreButton');

      await user.click(screen.getByTestId('restoreButton'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            featureStates: [FEATURE_STATES_NONE_OPTION],
            includeAliases: false,
          })
        );
      });
    });
  });
});
