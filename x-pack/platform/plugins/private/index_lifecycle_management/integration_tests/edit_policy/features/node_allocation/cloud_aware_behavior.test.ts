/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setupEnvironment } from '../../../helpers';
import {
  CloudNodeAllocationTestBed,
  setupCloudNodeAllocation,
} from './cloud_aware_behavior.helpers';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';

describe('<EditPolicy /> node allocation cloud-aware behavior', () => {
  let testBed: CloudNodeAllocationTestBed;
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
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

  beforeEach(async () => {
    httpRequestsMockHelpers.setLoadPolicies([]);
    httpRequestsMockHelpers.setListNodes({
      nodesByRoles: { data: ['node1'] },
      nodesByAttributes: { 'attribute:true': ['node1'] },
      isUsingDeprecatedDataRoleConfig: true,
    });
    httpRequestsMockHelpers.setNodesDetails('attribute:true', [
      { nodeId: 'testNodeId', stats: { name: 'testNodeName', host: 'testHost' } },
    ]);

    await setup();

    const { component } = testBed;
    component.update();
  });

  describe('when not on cloud', () => {
    test('shows all allocation options, even if using legacy config', async () => {
      httpRequestsMockHelpers.setListNodes({
        nodesByAttributes: { test: ['123'] },
        nodesByRoles: { data: ['test'], data_hot: ['test'], data_warm: ['test'] },
        isUsingDeprecatedDataRoleConfig: true,
      });

      await setup();
      const { actions, component, exists } = testBed;

      component.update();
      await actions.togglePhase('warm');
      expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();

      // Assert that default, custom and 'none' options exist
      await actions.warm.openNodeAttributesSection();
      expect(exists('defaultDataAllocationOption')).toBeTruthy();
      expect(exists('customDataAllocationOption')).toBeTruthy();
      expect(exists('noneDataAllocationOption')).toBeTruthy();
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
        const { actions, component, exists, find } = testBed;

        component.update();
        await actions.togglePhase('warm');
        expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();

        // Assert that custom and 'none' options exist
        await actions.warm.openNodeAttributesSection();
        expect(exists('defaultDataAllocationOption')).toBeFalsy();
        expect(exists('customDataAllocationOption')).toBeTruthy();
        expect(exists('noneDataAllocationOption')).toBeTruthy();
        // Show the call-to-action for users to migrate their cluster to use node roles
        expect(find('cloudDataTierCallout').exists()).toBeTruthy();
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
        testBed.component.update();

        const { actions, component, exists, find } = testBed;
        await actions.togglePhase('warm');
        expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();

        await actions.warm.openNodeAttributesSection();
        expect(exists('defaultDataAllocationOption')).toBeTruthy();
        expect(exists('customDataAllocationOption')).toBeTruthy();
        expect(exists('noneDataAllocationOption')).toBeTruthy();
        // Do not show the call-to-action for users to migrate their cluster to use node roles
        expect(find('cloudDataTierCallout').exists()).toBeFalsy();
      });

      test('do not show node allocation specific warnings on cloud', async () => {
        httpRequestsMockHelpers.setListNodes({
          nodesByAttributes: { test: ['123'] },
          // No nodes with node roles like "data_hot" or "data_warm"
          nodesByRoles: {},
          isUsingDeprecatedDataRoleConfig: false,
        });
        await setup(true);
        testBed.component.update();

        const { actions, component, exists } = testBed;
        await actions.togglePhase('warm');
        await actions.togglePhase('cold');
        expect(component.find('.euiLoadingSpinner').exists()).toBeFalsy();

        expect(exists('cloudDataTierCallout')).toBeFalsy();
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
