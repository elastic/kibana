/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { screen } from '@testing-library/react';
import { setupEnvironment } from '../../../helpers';
import type { CloudNodeAllocationTestBed } from './cloud_aware_behavior.helpers';
import { setupCloudNodeAllocation } from './cloud_aware_behavior.helpers';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';

describe('<EditPolicy /> node allocation cloud-aware behavior', () => {
  let testBed: CloudNodeAllocationTestBed;
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const setup = async (isOnCloud?: boolean) => {
    await act(async () => {
      if (Boolean(isOnCloud)) {
        testBed = await setupCloudNodeAllocation(httpSetup, {
          appServicesContext: { cloud: { ...cloudMock.createSetup(), isCloudEnabled: true } },
        });
      } else {
        testBed = await setupCloudNodeAllocation(httpSetup);
      }
    });
  };

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

      await setup();
      const { actions } = testBed;

      await actions.togglePhase('warm');

      // Wait for async operations to complete
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });

      // Verify loading is complete (matching original Enzyme test)
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

      // Assert that default, custom and 'none' options exist
      // openNodeAttributesSection already waits for dropdown to open
      await actions.warm.openNodeAttributesSection();

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
        await setup(true);
        const { actions } = testBed;

        await actions.togglePhase('warm');

        // Wait for async operations to complete
        await act(async () => {
          await jest.runOnlyPendingTimersAsync();
        });

        // Verify loading is complete (matching original Enzyme test)
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

        // openNodeAttributesSection already waits for dropdown to open
        await actions.warm.openNodeAttributesSection();

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
        await setup(true);

        const { actions } = testBed;
        await actions.togglePhase('warm');

        // Wait for async operations to complete
        await act(async () => {
          await jest.runOnlyPendingTimersAsync();
        });

        // Verify loading is complete (matching original Enzyme test)
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

        // openNodeAttributesSection already waits for dropdown to open
        await actions.warm.openNodeAttributesSection();

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
        await setup(true);

        const { actions } = testBed;
        await actions.togglePhase('warm');

        // Wait for async operations to complete
        await act(async () => {
          await jest.runOnlyPendingTimersAsync();
        });

        await actions.togglePhase('cold');

        // Wait for async operations to complete
        await act(async () => {
          await jest.runOnlyPendingTimersAsync();
        });

        expect(screen.queryByTestId('cloudDataTierCallout')).not.toBeInTheDocument();
        expect(
          actions.warm.hasWillUseFallbackTierNotice() || actions.cold.hasWillUseFallbackTierNotice()
        ).toBeFalsy();
        expect(
          actions.warm.hasNoTiersAvailableNotice() || actions.cold.hasNoTiersAvailableNotice()
        ).toBeFalsy();
      });
    });
  });
});
