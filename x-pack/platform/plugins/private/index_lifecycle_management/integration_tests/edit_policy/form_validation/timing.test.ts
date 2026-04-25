/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent } from '@testing-library/react';
import { i18nTexts } from '../../../public/application/sections/edit_policy/i18n_texts';

import type { PhaseWithTiming } from '../../../common/types';
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

describe('<EditPolicy /> timing validation', () => {
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
    httpRequestsMockHelpers.setDefaultResponses();
    httpRequestsMockHelpers.setLoadPolicies([]);

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
  });

  const testCases = [
    {
      name: `doesn't allow empty timing`,
      value: '',
      error: [i18nTexts.editPolicy.errors.numberRequired],
    },
    {
      name: `allows 0 for timing`,
      value: '0',
      error: [],
    },
    {
      name: `doesn't allow -1 for timing`,
      value: '-1',
      error: [i18nTexts.editPolicy.errors.nonNegativeNumberRequired],
    },
    {
      name: `doesn't allow decimals for timing (with dot)`,
      value: '5.5',
      error: [i18nTexts.editPolicy.errors.integerRequired],
    },
    {
      name: `doesn't allow decimals for timing (with comma)`,
      value: '5,5',
      error: [i18nTexts.editPolicy.errors.numberRequired],
    },
  ];

  const phases: PhaseWithTiming[] = ['warm', 'cold', 'delete', 'frozen'];

  test.each(
    phases.flatMap((phase) =>
      testCases.map((testCase) => ({
        phase,
        ...testCase,
      }))
    )
  )(
    '$phase: $name',
    async ({ phase, value, error }) => {
      await actions.togglePhase(phase);
      // 1. We first set as dummy value to have a starting min_age value
      await actions[phase].setMinAgeValue('111');
      // 2. At this point we are sure there will be a change of value and that any validation
      // will be displayed under the field.
      await actions[phase].setMinAgeValue(value);

      await expectErrorMessages(error);
    },
    10000
  );

  describe('cross-phase min_age validation', () => {
    test('should validate that each phase min_age is >= previous phase', async () => {
      await actions.togglePhase('warm');
      await actions.togglePhase('cold');
      await actions.togglePhase('frozen');

      await actions.warm.setMinAgeValue('10');

      // Cold phase validation
      await actions.cold.setMinAgeValue('9');
      await expectErrorMessages(
        ['Must be greater or equal than the warm phase value (10d)'],
        'cold'
      );

      // Frozen phase validation
      await actions.frozen.setMinAgeValue('8');
      await expectErrorMessages(
        ['Must be greater or equal than the cold phase value (9d)'],
        'frozen'
      );
    }, 15000);

    test('should validate delete phase min_age against frozen phase', async () => {
      await actions.togglePhase('frozen');
      await actions.togglePhase('delete');

      await actions.frozen.setMinAgeValue('8');

      await actions.delete.setMinAgeValue('7');
      await expectErrorMessages(
        ['Must be greater or equal than the frozen phase value (8d)'],
        'delete'
      );

      // Fix the validation error
      await actions.delete.setMinAgeValue('9');
      await expectErrorMessages([], 'delete');
    }, 10000);

    test('should recalculate validation when previous phase is disabled', async () => {
      await actions.togglePhase('warm');
      await actions.togglePhase('cold');

      await actions.warm.setMinAgeValue('10');
      await actions.cold.setMinAgeValue('9');

      // Cold has error because warm is 10d
      await expectErrorMessages(
        ['Must be greater or equal than the warm phase value (10d)'],
        'cold'
      );

      // Disable warm phase
      await actions.togglePhase('warm');

      // Cold error should clear
      await expectErrorMessages([], 'cold');
    }, 10000);

    test('should consider unit conversion in cross-phase validation', async () => {
      await actions.togglePhase('cold');
      await actions.togglePhase('frozen');
      await actions.togglePhase('delete');

      // Set cold to 9 days, frozen to 8 days, delete to 7 days
      await actions.cold.setMinAgeValue('9');
      await actions.frozen.setMinAgeValue('8');
      await actions.delete.setMinAgeValue('7');

      // Frozen and delete should have errors
      await expectErrorMessages(
        ['Must be greater or equal than the cold phase value (9d)'],
        'frozen'
      );
      await expectErrorMessages(
        ['Must be greater or equal than the frozen phase value (8d)'],
        'delete'
      );

      // Change cold to hours (9h < 8d, so frozen error clears)
      await actions.cold.setMinAgeUnits('h');

      // Frozen error clears because 8d > 9h
      await expectErrorMessages([], 'frozen');
      // Delete still has error because 7d < 8d
      await expectErrorMessages(
        ['Must be greater or equal than the frozen phase value (8d)'],
        'delete'
      );
    }, 15000);
  });
});
