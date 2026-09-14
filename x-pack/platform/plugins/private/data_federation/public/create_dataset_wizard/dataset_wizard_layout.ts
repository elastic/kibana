/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

import { datasetSettingsFieldsWidthCss } from '../create_dataset_flyout/dataset_settings_fields_layout';
import type { DatasetWizardFlowVariant } from './dataset_wizard_flow_variant';
import { isDatasetWizardFlow3, isDatasetWizardFlow396 } from './dataset_wizard_flow_variant';

const wizardFullWidthColumnCss = css`
  width: 100%;
  max-width: 100%;
  min-width: 0;
`;

/** Classic flow 3 keeps the narrower field column; flow 3 9.6 uses the full wizard width. */
export const shouldUseDatasetSettingsFieldsWidth = (
  flowVariant: DatasetWizardFlowVariant
): boolean => isDatasetWizardFlow3(flowVariant) && !isDatasetWizardFlow396(flowVariant);

export const getDatasetWizardContentColumnCss = (flowVariant: DatasetWizardFlowVariant) =>
  shouldUseDatasetSettingsFieldsWidth(flowVariant)
    ? datasetSettingsFieldsWidthCss
    : wizardFullWidthColumnCss;

/** Bleed on each side so the stepper spans wider than the form and balances centered step titles. */
export const DATASET_WIZARD_STEPS_HORIZONTAL_BLEED = '7%';

export const getDatasetWizardStepsOuterCss = (flowVariant: DatasetWizardFlowVariant) => {
  if (shouldUseDatasetSettingsFieldsWidth(flowVariant)) {
    return css`
      width: 100%;
      max-width: 100%;
      min-width: 0;
    `;
  }

  const bleed = DATASET_WIZARD_STEPS_HORIZONTAL_BLEED;

  return css`
    width: calc(100% + 2 * ${bleed});
    max-width: none;
    margin-inline: calc(-1 * ${bleed});
    min-width: 0;
  `;
};

export const datasetWizardStepsHorizontalFillCss = css`
  width: 100%;
  min-width: 100%;
  align-self: stretch;
`;
