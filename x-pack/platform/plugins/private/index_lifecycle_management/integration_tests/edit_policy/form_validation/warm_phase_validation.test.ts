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

describe('<EditPolicy /> warm phase validation', () => {
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ({ httpSetup, httpRequestsMockHelpers } = setupEnvironment());
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  const setupTest = async () => {
    httpRequestsMockHelpers.setDefaultResponses();
    httpRequestsMockHelpers.setLoadPolicies([]);

    const renderResult = renderEditPolicy(httpSetup, {
      initialEntries: ['/policies/edit'],
    });

    await screen.findByTestId('savePolicyButton');

    const actions = {
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

    // Auto-setup: configure policy and enable warm phase for validation tests
    await actions.setPolicyName('mypolicy');
    await actions.togglePhase('warm');

    return { ...renderResult, actions };
  };

  describe('replicas', () => {
    test(`doesn't allow -1 for replicas`, async () => {
      const { actions } = await setupTest();
      await actions.warm.setReplicas('-1');

      await expectErrorMessages([i18nTexts.editPolicy.errors.nonNegativeNumberRequired]);
    }, 10000);

    test(`allows 0 for replicas`, async () => {
      const { actions } = await setupTest();
      await actions.warm.setReplicas('0');

      await expectErrorMessages([]);
    }, 10000);
  });

  describe('shrink', () => {
    test(`doesn't allow 0 for shrink size`, async () => {
      const { actions } = await setupTest();
      await actions.warm.setShrinkSize('0');

      await expectErrorMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    }, 10000);
    test(`doesn't allow -1 for shrink size`, async () => {
      const { actions } = await setupTest();
      await actions.warm.setShrinkSize('-1');

      await expectErrorMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    }, 10000);
    test(`doesn't allow 0 for shrink count`, async () => {
      const { actions } = await setupTest();
      await actions.warm.setShrinkCount('0');

      await expectErrorMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    }, 10000);
    test(`doesn't allow -1 for shrink count`, async () => {
      const { actions } = await setupTest();
      await actions.warm.setShrinkCount('-1');

      await expectErrorMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    }, 10000);
  });

  describe('forcemerge', () => {
    test(`doesn't allow 0 for forcemerge`, async () => {
      const { actions } = await setupTest();
      actions.warm.toggleForceMerge();
      await actions.warm.setForcemergeSegmentsCount('0');

      await expectErrorMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    }, 10000);
    test(`doesn't allow -1 for forcemerge`, async () => {
      const { actions } = await setupTest();
      actions.warm.toggleForceMerge();
      await actions.warm.setForcemergeSegmentsCount('-1');

      await expectErrorMessages([i18nTexts.editPolicy.errors.numberGreatThan0Required]);
    }, 10000);
  });

  describe('index priority', () => {
    test(`doesn't allow -1 for index priority`, async () => {
      const { actions } = await setupTest();
      await actions.warm.setIndexPriority('-1');

      await expectErrorMessages([i18nTexts.editPolicy.errors.nonNegativeNumberRequired]);
    }, 10000);

    test(`allows 0 for index priority`, async () => {
      const { actions } = await setupTest();
      await actions.warm.setIndexPriority('0');

      await expectErrorMessages([]);
    }, 10000);
  });
});
