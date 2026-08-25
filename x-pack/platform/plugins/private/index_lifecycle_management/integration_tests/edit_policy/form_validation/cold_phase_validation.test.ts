/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent } from '@testing-library/react';
import { i18nTexts } from '../../../public/application/sections/edit_policy/i18n_texts';
import { setupEnvironment } from '../../helpers/setup_environment';
import {
  createColdPhaseActions,
  createDeletePhaseActions,
  createFrozenPhaseActions,
  createHotPhaseActions,
  createWarmPhaseActions,
} from '../../helpers/actions/phases';
import { expectErrorMessages } from '../../helpers/actions/errors_actions';
import { createFormSetValueAction } from '../../helpers/actions/form_set_value_action';
import { createRolloverActions } from '../../helpers/actions/rollover_actions';
import { createTogglePhaseAction } from '../../helpers/actions/toggle_phase_action';
import { renderEditPolicy } from '../../helpers/render_edit_policy';

describe('<EditPolicy /> cold phase validation', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();
  let actions: {
    togglePhase: ReturnType<typeof createTogglePhaseAction>;
    setPolicyName: ReturnType<typeof createFormSetValueAction>;
    toggleSaveAsNewPolicy: () => void;
    savePolicy: () => void;
  } & ReturnType<typeof createRolloverActions> &
    ReturnType<typeof createHotPhaseActions> &
    ReturnType<typeof createWarmPhaseActions> &
    ReturnType<typeof createColdPhaseActions> &
    ReturnType<typeof createFrozenPhaseActions> &
    ReturnType<typeof createDeletePhaseActions>;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

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

    renderEditPolicy(httpSetup, {
      initialEntries: ['/policies/edit'],
    });

    await screen.findByTestId('savePolicyButton');

    actions = {
      togglePhase: createTogglePhaseAction(),
      setPolicyName: createFormSetValueAction('policyNameField'),
      savePolicy: () => fireEvent.click(screen.getByTestId('savePolicyButton')),
      toggleSaveAsNewPolicy: () => fireEvent.click(screen.getByTestId('saveAsNewSwitch')),
      ...createRolloverActions(),
      ...createHotPhaseActions(),
      ...createWarmPhaseActions(),
      ...createColdPhaseActions(),
      ...createFrozenPhaseActions(),
      ...createDeletePhaseActions(),
    };

    await actions.setPolicyName('mypolicy');
    await actions.togglePhase('cold');
  });

  describe('replicas', () => {
    test(`doesn't allow -1 for replicas`, async () => {
      await actions.cold.setReplicas('-1');

      await expectErrorMessages([i18nTexts.editPolicy.errors.nonNegativeNumberRequired]);
    });

    test(`allows 0 for replicas`, async () => {
      await actions.cold.setReplicas('0');

      await expectErrorMessages([]);
    });
  });

  describe('index priority', () => {
    test(`doesn't allow -1 for index priority`, async () => {
      await actions.cold.setIndexPriority('-1');

      await expectErrorMessages([i18nTexts.editPolicy.errors.nonNegativeNumberRequired]);
    });

    test(`allows 0 for index priority`, async () => {
      await actions.cold.setIndexPriority('0');

      await expectErrorMessages([]);
    });
  });
});
