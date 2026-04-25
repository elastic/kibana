/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent } from '@testing-library/react';
import { i18nTexts } from '../../../public/application/sections/edit_policy/i18n_texts';

import type { PhaseWithDownsample } from '../../../common/types';
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

describe('<EditPolicy /> downsample interval validation', () => {
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

  [
    {
      name: `doesn't allow empty interval`,
      value: '',
      error: [i18nTexts.editPolicy.errors.numberRequired],
    },
    {
      name: `doesn't allow 0 for interval`,
      value: '0',
      error: [i18nTexts.editPolicy.errors.numberGreatThan0Required],
    },
    {
      name: `doesn't allow -1 for interval`,
      value: '-1',
      error: [i18nTexts.editPolicy.errors.numberGreatThan0Required],
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
  ].forEach((testConfig: { name: string; value: string; error: string[] }) => {
    (['hot', 'warm', 'cold'] as PhaseWithDownsample[]).forEach((phase: PhaseWithDownsample) => {
      const { name, value, error } = testConfig;
      test(`${phase}: ${name}`, async () => {
        if (phase !== 'hot') {
          await actions.togglePhase(phase);
        }

        actions[phase].downsample.toggle();

        // 1. We first set as dummy value to have a starting min_age value
        await actions[phase].downsample.setDownsampleInterval('111');
        // 2. At this point we are sure there will be a change of value and that any validation
        // will be displayed under the field.
        await actions[phase].downsample.setDownsampleInterval(value);

        await expectErrorMessages(error);
      }, 10000);
    });
  });

  test('should validate an interval is greater or multiple than previous phase interval', async () => {
    await actions.togglePhase('warm');
    await actions.togglePhase('cold');

    actions.hot.downsample.toggle();
    await actions.hot.downsample.setDownsampleInterval('60', 'm');

    actions.warm.downsample.toggle();
    await actions.warm.downsample.setDownsampleInterval('1', 'h');

    await expectErrorMessages(
      ['Must be greater than and a multiple of the hot phase value (60m)'],
      'warm'
    );

    actions.cold.downsample.toggle();
    await actions.cold.downsample.setDownsampleInterval('90', 'm');
    await expectErrorMessages(
      ['Must be greater than and a multiple of the warm phase value (1h)'],
      'cold'
    );

    // disable warm phase, check that we now get an error because of the hot phase;
    await actions.togglePhase('warm');
    await expectErrorMessages(
      ['Must be greater than and a multiple of the hot phase value (60m)'],
      'cold'
    );
    await actions.cold.downsample.setDownsampleInterval('120', 'm');
    await expectErrorMessages([], 'cold');

    await actions.cold.downsample.setDownsampleInterval('90', 'm');
    await expectErrorMessages(
      ['Must be greater than and a multiple of the hot phase value (60m)'],
      'cold'
    );
  }, 15000);
});
