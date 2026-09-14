/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DATASET_WIZARD_FLOW_VARIANT_1,
  DATASET_WIZARD_FLOW_VARIANT_3,
  DATASET_WIZARD_FLOW_VARIANT_3_9_6,
} from './dataset_wizard_flow_variant';
import {
  DATASET_WIZARD_STEPS_HORIZONTAL_BLEED,
  getDatasetWizardStepsOuterCss,
  shouldUseDatasetSettingsFieldsWidth,
} from './dataset_wizard_layout';

describe('dataset_wizard_layout', () => {
  it('uses the narrower settings column only for classic flow 3', () => {
    expect(shouldUseDatasetSettingsFieldsWidth(DATASET_WIZARD_FLOW_VARIANT_3)).toBe(true);
    expect(shouldUseDatasetSettingsFieldsWidth(DATASET_WIZARD_FLOW_VARIANT_3_9_6)).toBe(false);
    expect(shouldUseDatasetSettingsFieldsWidth(DATASET_WIZARD_FLOW_VARIANT_1)).toBe(false);
  });

  it('uses a wider stepper track for full-width flows than for classic flow 3', () => {
    expect(getDatasetWizardStepsOuterCss(DATASET_WIZARD_FLOW_VARIANT_3_9_6)).not.toEqual(
      getDatasetWizardStepsOuterCss(DATASET_WIZARD_FLOW_VARIANT_3)
    );
    expect(DATASET_WIZARD_STEPS_HORIZONTAL_BLEED).toMatch(/^\d+%$/);
  });
});
