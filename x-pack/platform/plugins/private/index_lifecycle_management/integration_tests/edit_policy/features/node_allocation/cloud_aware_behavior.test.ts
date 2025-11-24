/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import { setupEnvironment } from '../../../helpers/setup_environment';
import { renderEditPolicy } from '../../../helpers/render_edit_policy';
import { createTogglePhaseAction } from '../../../helpers/actions/toggle_phase_action';
import { createNodeAllocationActions } from '../../../helpers/actions/node_allocation_actions';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';

describe('<EditPolicy /> node allocation cloud-aware behavior', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    httpRequestsMockHelpers.setLoadPolicies([]);
    httpRequestsMockHelpers.setNodesDetails('attribute:true', [
      { nodeId: 'testNodeId', stats: { name: 'testNodeName', host: 'testHost' } },
    ]);
  });

  describe('when not on cloud', () => {
    test('shows all allocation options, even if using legacy config', async () => {
      httpRequestsMockHelpers.setListNodes({
        nodesByAttributes: { test: ['123'] },
        nodesByRoles: { data: ['test'], data_hot: ['test'], data_warm: ['test'] },
        isUsingDeprecatedDataRoleConfig: true,
      });

      renderEditPolicy(httpSetup);
      await screen.findByTestId('savePolicyButton');

      const togglePhase = createTogglePhaseAction();
      await togglePhase('warm');

      await screen.findByTestId('warm-phase');

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

      // Assert that default, custom and 'none' options exist
      const actions = createNodeAllocationActions('warm');
      await actions.openNodeAttributesSection();

      expect(screen.getByTestId('defaultDataAllocationOption')).toBeInTheDocument();
      expect(screen.getByTestId('customDataAllocationOption')).toBeInTheDocument();
      expect(screen.getByTestId('noneDataAllocationOption')).toBeInTheDocument();
    });
  });

  describe('when on cloud', () => {
    describe('using legacy data role config', () => {
      test('should hide data tier option on cloud', async () => {
        httpRequestsMockHelpers.setListNodes({
          nodesByAttributes: { test: ['123'] },
          // On cloud, if using legacy config there will not be any "data_*" roles set.
          nodesByRoles: { data: ['test'] },
          isUsingDeprecatedDataRoleConfig: true,
        });

        renderEditPolicy(httpSetup, {
          appServicesContext: { cloud: { ...cloudMock.createSetup(), isCloudEnabled: true } },
        });
        await screen.findByTestId('savePolicyButton');

        const togglePhase = createTogglePhaseAction();
        await togglePhase('warm');

        await screen.findByTestId('warm-phase');

        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

        const actions = createNodeAllocationActions('warm');
        await actions.openNodeAttributesSection();

        expect(screen.queryByTestId('defaultDataAllocationOption')).not.toBeInTheDocument();
        expect(screen.getByTestId('customDataAllocationOption')).toBeInTheDocument();
        expect(screen.getByTestId('noneDataAllocationOption')).toBeInTheDocument();
        // Show the call-to-action for users to migrate their cluster to use node roles
        expect(screen.getByTestId('cloudDataTierCallout')).toBeInTheDocument();
      });
    });

    describe('using node role config', () => {
      test('shows recommended, custom and "off" options on cloud with data roles', async () => {
        httpRequestsMockHelpers.setListNodes({
          nodesByAttributes: { test: ['123'] },
          nodesByRoles: { data: ['test'], data_hot: ['test'], data_warm: ['test'] },
          isUsingDeprecatedDataRoleConfig: false,
        });

        renderEditPolicy(httpSetup, {
          appServicesContext: { cloud: { ...cloudMock.createSetup(), isCloudEnabled: true } },
        });
        await screen.findByTestId('savePolicyButton');

        const togglePhase = createTogglePhaseAction();
        await togglePhase('warm');

        await screen.findByTestId('warm-phase');

        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

        const actions = createNodeAllocationActions('warm');
        await actions.openNodeAttributesSection();

        expect(screen.getByTestId('defaultDataAllocationOption')).toBeInTheDocument();
        expect(screen.getByTestId('customDataAllocationOption')).toBeInTheDocument();
        expect(screen.getByTestId('noneDataAllocationOption')).toBeInTheDocument();
        // Do not show the call-to-action for users to migrate their cluster to use node roles
        expect(screen.queryByTestId('cloudDataTierCallout')).not.toBeInTheDocument();
      });

      test('do not show node allocation specific warnings on cloud', async () => {
        httpRequestsMockHelpers.setListNodes({
          nodesByAttributes: { test: ['123'] },
          // No nodes with node roles like "data_hot" or "data_warm"
          nodesByRoles: {},
          isUsingDeprecatedDataRoleConfig: false,
        });

        renderEditPolicy(httpSetup, {
          appServicesContext: { cloud: { ...cloudMock.createSetup(), isCloudEnabled: true } },
        });
        await screen.findByTestId('savePolicyButton');

        const togglePhase = createTogglePhaseAction();
        await togglePhase('warm');

        await screen.findByTestId('warm-phase');

        await togglePhase('cold');

        await screen.findByTestId('cold-phase');

        const warmActions = createNodeAllocationActions('warm');
        const coldActions = createNodeAllocationActions('cold');

        expect(screen.queryByTestId('cloudDataTierCallout')).not.toBeInTheDocument();
        expect(
          warmActions.hasWillUseFallbackTierNotice() || coldActions.hasWillUseFallbackTierNotice()
        ).toBeFalsy();
        expect(
          warmActions.hasNoTiersAvailableNotice() || coldActions.hasNoTiersAvailableNotice()
        ).toBeFalsy();
      });
    });
  });
});
