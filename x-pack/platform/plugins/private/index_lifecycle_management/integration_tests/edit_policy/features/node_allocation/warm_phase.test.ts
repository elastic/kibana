/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setupEnvironment } from '../../../helpers';
import { NodeAllocationTestBed, setupWarmPhaseNodeAllocation } from './warm_phase.helpers';

describe('<EditPolicy /> node allocation in the warm phase', () => {
  let testBed: NodeAllocationTestBed;
  const { httpSetup, setDelayResponse, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const setup = async () => {
    await act(async () => {
      testBed = await setupWarmPhaseNodeAllocation(httpSetup);
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

  test(`doesn't offer allocation guidance when node with deprecated "data" role exists`, async () => {
    httpRequestsMockHelpers.setListNodes({
      nodesByAttributes: {},
      nodesByRoles: { data: ['test'] },
      isUsingDeprecatedDataRoleConfig: false,
    });
    await setup();
    const { actions, component } = testBed;

    component.update();
    await actions.togglePhase();

    expect(actions.isAllocationLoading()).toBeFalsy();
    expect(actions.hasDefaultAllocationBehaviorNotice()).toBeFalsy();
  });

  describe('when using node attributes', () => {
    test('shows spinner for node attributes input when loading', async () => {
      // We don't want the request to resolve immediately.
      setDelayResponse(true);

      const { actions } = testBed;
      await actions.togglePhase();

      expect(actions.isAllocationLoading()).toBeTruthy();
      expect(actions.hasDataTierAllocationControls()).toBeTruthy();
      expect(actions.hasNodeAttributesSelect()).toBeFalsy();

      // No notices will be shown.
      expect(actions.hasDefaultToDataTiersNotice()).toBeFalsy();
      expect(actions.hasWillUseFallbackTierUsingNodeAttributesNotice()).toBeFalsy();
      expect(actions.hasDefaultToDataNodesNotice()).toBeFalsy();
      expect(actions.hasNoTiersAvailableUsingNodeAttributesNotice()).toBeFalsy();

      // Reset delayed response status
      setDelayResponse(false);
    });

    describe('and some are defined', () => {
      test('shows the node attributes input', async () => {
        const { actions } = testBed;
        await actions.togglePhase();

        expect(actions.isAllocationLoading()).toBeFalsy();
        await actions.setDataAllocation('node_attrs');
        expect(actions.hasDefaultAllocationBehaviorNotice()).toBeFalsy();
        expect(actions.hasNodeAttributesSelect()).toBeTruthy();
        expect(actions.getNodeAttributesSelectOptions().length).toBe(2);
      });

      test('shows view node attributes link when an attribute is selected and shows flyout when clicked', async () => {
        const { actions } = testBed;
        await actions.togglePhase();

        expect(actions.isAllocationLoading()).toBeFalsy();
        await actions.setDataAllocation('node_attrs');
        expect(actions.hasDefaultAllocationBehaviorNotice()).toBeFalsy();
        expect(actions.hasNodeAttributesSelect()).toBeTruthy();

        expect(actions.hasNodeDetailsFlyout()).toBeFalsy();
        expect(actions.getNodeAttributesSelectOptions().length).toBe(2);
        await actions.setSelectedNodeAttribute('attribute:true');

        await actions.openNodeDetailsFlyout();
        expect(actions.hasNodeDetailsFlyout()).toBeTruthy();
      });
    });

    describe('and none are defined', () => {
      const commonSetupAndBaselineAssertions = async () => {
        await setup();
        const { actions, component } = testBed;
        component.update();
        await actions.togglePhase();

        expect(actions.isAllocationLoading()).toBeFalsy();
        await actions.setDataAllocation('node_attrs');
        expect(actions.hasNodeAttributesSelect()).toBeFalsy();
      };

      test('and data tiers are available, shows DefaultToDataTiersNotice', async () => {
        httpRequestsMockHelpers.setListNodes({
          nodesByAttributes: {},
          nodesByRoles: { data: ['node1'] },
          isUsingDeprecatedDataRoleConfig: false,
        });

        await commonSetupAndBaselineAssertions();
        const { actions } = testBed;
        expect(actions.hasDefaultToDataTiersNotice()).toBeTruthy();
      });

      test('and data tiers are available, but not for the warm phase, shows WillUseFallbackTierUsingNodeAttributesNotice', async () => {
        httpRequestsMockHelpers.setListNodes({
          nodesByAttributes: {},
          nodesByRoles: { data_hot: ['node1'] },
          isUsingDeprecatedDataRoleConfig: false,
        });

        await commonSetupAndBaselineAssertions();
        const { actions } = testBed;
        expect(actions.hasWillUseFallbackTierUsingNodeAttributesNotice()).toBeTruthy();
      });

      test('when data nodes are in use, shows DefaultToDataNodesNotice', async () => {
        httpRequestsMockHelpers.setListNodes({
          nodesByAttributes: {},
          nodesByRoles: {},
          isUsingDeprecatedDataRoleConfig: true,
        });

        await commonSetupAndBaselineAssertions();
        const { actions } = testBed;
        expect(actions.hasDefaultToDataNodesNotice()).toBeTruthy();
      });

      test('when no data tier node roles are defined, shows NoTiersAvailableUsingNodeAttributesNotice', async () => {
        httpRequestsMockHelpers.setListNodes({
          nodesByAttributes: {},
          // data_content is a node role so they're technically in use, but it's not a data tier node role.
          nodesByRoles: { data_content: ['node1'] },
          isUsingDeprecatedDataRoleConfig: false,
        });

        await commonSetupAndBaselineAssertions();
        const { actions } = testBed;
        expect(actions.hasNoTiersAvailableUsingNodeAttributesNotice()).toBeTruthy();
      });
    });
  });

  describe('when using node roles', () => {
    test('when no node roles are defined, shows NoTiersAvailableNotice', async () => {
      httpRequestsMockHelpers.setListNodes({
        nodesByAttributes: {},
        nodesByRoles: {},
        isUsingDeprecatedDataRoleConfig: false,
      });

      await setup();
      const { actions, component } = testBed;

      component.update();
      await actions.togglePhase();

      expect(actions.isAllocationLoading()).toBeFalsy();
      expect(actions.hasNoTiersAvailableNotice()).toBeTruthy();
    });

    test('when allocation will fallback to the hot tier, shows WillUseFallbackTierNotice and defines the fallback tier', async () => {
      httpRequestsMockHelpers.setListNodes({
        nodesByAttributes: {},
        nodesByRoles: { data_hot: ['test'], data_cold: ['test'] },
        isUsingDeprecatedDataRoleConfig: false,
      });

      await setup();
      const { actions, component } = testBed;

      component.update();
      await actions.togglePhase();

      expect(actions.isAllocationLoading()).toBeFalsy();
      expect(actions.hasWillUseFallbackTierNotice()).toBeTruthy();
      expect(actions.getWillUseFallbackTierNoticeText()).toContain(
        `No nodes assigned to the warm tierIf no warm nodes are available, data is stored in the hot tier.`
      );
    });
  });
});
