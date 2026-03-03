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

describe('<EditPolicy /> node allocation in the warm phase', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    httpRequestsMockHelpers.setLoadPolicies([]);
    httpRequestsMockHelpers.setListNodes({
      nodesByRoles: { data: ['node1'] },
      nodesByAttributes: { 'attribute:true': ['node1'] },
      isUsingDeprecatedDataRoleConfig: true,
    });
    httpRequestsMockHelpers.setNodesDetails('attribute:true', [
      { nodeId: 'testNodeId', stats: { name: 'testNodeName', host: 'testHost' } },
    ]);
  });

  test(`doesn't offer allocation guidance when node with deprecated "data" role exists`, async () => {
    httpRequestsMockHelpers.setListNodes({
      nodesByAttributes: {},
      nodesByRoles: { data: ['test'] },
      isUsingDeprecatedDataRoleConfig: false,
    });

    renderEditPolicy(httpSetup);
    await screen.findByTestId('savePolicyButton');

    const togglePhase = createTogglePhaseAction();
    await togglePhase('warm');

    await screen.findByTestId('warm-phase');

    const actions = createNodeAllocationActions('warm');
    expect(actions.isAllocationLoading()).toBeFalsy();
    expect(actions.hasDefaultAllocationBehaviorNotice()).toBeFalsy();
  });

  describe('when using node attributes', () => {
    test('shows spinner for node attributes input when loading', async () => {
      renderEditPolicy(httpSetup);
      await screen.findByTestId('savePolicyButton');

      const togglePhase = createTogglePhaseAction();
      const actions = createNodeAllocationActions('warm');

      // Override HTTP mock to freeze the node details request
      httpSetup.get.mockImplementationOnce(() => new Promise(() => {}));

      await togglePhase('warm');

      expect(actions.isAllocationLoading()).toBeTruthy();
      expect(actions.hasDataTierAllocationControls()).toBeTruthy();
      expect(actions.hasNodeAttributesSelect()).toBeFalsy();

      expect(actions.hasDefaultToDataTiersNotice()).toBeFalsy();
      expect(actions.hasWillUseFallbackTierUsingNodeAttributesNotice()).toBeFalsy();
      expect(actions.hasDefaultToDataNodesNotice()).toBeFalsy();
      expect(actions.hasNoTiersAvailableUsingNodeAttributesNotice()).toBeFalsy();
    });

    describe('and some are defined', () => {
      test('shows the node attributes input', async () => {
        renderEditPolicy(httpSetup);
        await screen.findByTestId('savePolicyButton');

        const togglePhase = createTogglePhaseAction();
        await togglePhase('warm');

        await screen.findByTestId('warm-phase');

        const actions = createNodeAllocationActions('warm');
        expect(actions.isAllocationLoading()).toBeFalsy();
        await actions.setDataAllocation('node_attrs');
        expect(actions.hasDefaultAllocationBehaviorNotice()).toBeFalsy();
        expect(actions.hasNodeAttributesSelect()).toBeTruthy();
        expect(actions.getNodeAttributesSelectOptions().length).toBe(2);
      });

      test('shows view node attributes link when an attribute is selected and shows flyout when clicked', async () => {
        renderEditPolicy(httpSetup);
        await screen.findByTestId('savePolicyButton');

        const togglePhase = createTogglePhaseAction();
        await togglePhase('warm');

        await screen.findByTestId('warm-phase');

        const actions = createNodeAllocationActions('warm');
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
        renderEditPolicy(httpSetup);
        await screen.findByTestId('savePolicyButton');

        const togglePhase = createTogglePhaseAction();
        await togglePhase('warm');

        await screen.findByTestId('warm-phase');

        const actions = createNodeAllocationActions('warm');
        expect(actions.isAllocationLoading()).toBeFalsy();
        await actions.setDataAllocation('node_attrs');
        expect(actions.hasNodeAttributesSelect()).toBeFalsy();
        return actions;
      };

      test('and data tiers are available, shows DefaultToDataTiersNotice', async () => {
        httpRequestsMockHelpers.setListNodes({
          nodesByAttributes: {},
          nodesByRoles: { data: ['node1'] },
          isUsingDeprecatedDataRoleConfig: false,
        });

        const actions = await commonSetupAndBaselineAssertions();
        expect(actions.hasDefaultToDataTiersNotice()).toBeTruthy();
      });

      test('and data tiers are available, but not for the warm phase, shows WillUseFallbackTierUsingNodeAttributesNotice', async () => {
        httpRequestsMockHelpers.setListNodes({
          nodesByAttributes: {},
          nodesByRoles: { data_hot: ['node1'] },
          isUsingDeprecatedDataRoleConfig: false,
        });

        const actions = await commonSetupAndBaselineAssertions();
        expect(actions.hasWillUseFallbackTierUsingNodeAttributesNotice()).toBeTruthy();
      });

      test('when data nodes are in use, shows DefaultToDataNodesNotice', async () => {
        httpRequestsMockHelpers.setListNodes({
          nodesByAttributes: {},
          nodesByRoles: {},
          isUsingDeprecatedDataRoleConfig: true,
        });

        const actions = await commonSetupAndBaselineAssertions();
        expect(actions.hasDefaultToDataNodesNotice()).toBeTruthy();
      });

      test('when no data tier node roles are defined, shows NoTiersAvailableUsingNodeAttributesNotice', async () => {
        httpRequestsMockHelpers.setListNodes({
          nodesByAttributes: {},
          // data_content is a node role so they're technically in use, but it's not a data tier node role.
          nodesByRoles: { data_content: ['node1'] },
          isUsingDeprecatedDataRoleConfig: false,
        });

        const actions = await commonSetupAndBaselineAssertions();
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

      renderEditPolicy(httpSetup);
      await screen.findByTestId('savePolicyButton');

      const togglePhase = createTogglePhaseAction();
      await togglePhase('warm');

      await screen.findByTestId('warm-phase');

      const actions = createNodeAllocationActions('warm');
      expect(actions.isAllocationLoading()).toBeFalsy();
      expect(actions.hasNoTiersAvailableNotice()).toBeTruthy();
    });

    test('when allocation will fallback to the hot tier, shows WillUseFallbackTierNotice and defines the fallback tier', async () => {
      httpRequestsMockHelpers.setListNodes({
        nodesByAttributes: {},
        nodesByRoles: { data_hot: ['test'], data_cold: ['test'] },
        isUsingDeprecatedDataRoleConfig: false,
      });

      renderEditPolicy(httpSetup);
      await screen.findByTestId('savePolicyButton');

      const togglePhase = createTogglePhaseAction();
      await togglePhase('warm');

      await screen.findByTestId('warm-phase');

      const actions = createNodeAllocationActions('warm');
      expect(actions.isAllocationLoading()).toBeFalsy();
      expect(actions.hasWillUseFallbackTierNotice()).toBeTruthy();
      expect(actions.getWillUseFallbackTierNoticeText()).toContain(
        `No nodes assigned to the warm tierIf no warm nodes are available, data is stored in the hot tier.`
      );
    });
  });
});
