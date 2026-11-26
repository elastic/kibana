/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SetupWizardProgress } from '../../../../utils/setup_wizard_view';
import { testAiIndex } from '../test_utils';
import { connectStep } from './connect_step';
import { dreamingStep } from './dreaming_step';

const progress: SetupWizardProgress = {
  aiIndex: testAiIndex,
  dreaming: undefined,
  memoryCount: 0,
  isMemoryEnabled: true,
};

describe('dreamingStep', () => {
  it('is shown only with memory', () => {
    expect(dreamingStep.isAvailable?.(progress)).toBe(true);
    expect(dreamingStep.isAvailable?.({ ...progress, isMemoryEnabled: false })).toBe(false);
  });

  it('is done once dreaming is set up', () => {
    expect(dreamingStep.isDone(progress)).toBe(false);
    expect(dreamingStep.isDone({ ...progress, dreaming: { enabled: true } })).toBe(true);
  });
});

describe('connectStep', () => {
  it('is optional and done once an agent saved a memory', () => {
    expect(connectStep.isOptional).toBe(true);
    expect(connectStep.isDone(progress)).toBe(false);
    expect(connectStep.isDone({ ...progress, memoryCount: 1 })).toBe(true);
  });
});
