/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildCreateDatasetWizardPath,
  DATASET_WIZARD_FLOW_VARIANT_1,
  DATASET_WIZARD_FLOW_VARIANT_2,
  parseWizardFlowVariantFromSearch,
  resolveWizardFlowVariant,
} from './dataset_wizard_flow_variant';

describe('dataset_wizard_flow_variant', () => {
  it('builds create paths with flow query params', () => {
    expect(buildCreateDatasetWizardPath(DATASET_WIZARD_FLOW_VARIANT_1)).toBe('/create?flow=flow_1');
    expect(buildCreateDatasetWizardPath(DATASET_WIZARD_FLOW_VARIANT_2)).toBe('/create?flow=flow_2');
  });

  it('parses valid flow variants from search params', () => {
    expect(parseWizardFlowVariantFromSearch('?flow=flow_1')).toBe(DATASET_WIZARD_FLOW_VARIANT_1);
    expect(parseWizardFlowVariantFromSearch('?flow=flow_2&step=2')).toBe(
      DATASET_WIZARD_FLOW_VARIANT_2
    );
  });

  it('returns undefined for missing or invalid flow variants', () => {
    expect(parseWizardFlowVariantFromSearch('')).toBeUndefined();
    expect(parseWizardFlowVariantFromSearch('?flow=unknown')).toBeUndefined();
  });

  it('defaults to flow 1 when the flow query param is missing or invalid', () => {
    expect(resolveWizardFlowVariant('')).toBe(DATASET_WIZARD_FLOW_VARIANT_1);
    expect(resolveWizardFlowVariant('?step=2')).toBe(DATASET_WIZARD_FLOW_VARIANT_1);
    expect(resolveWizardFlowVariant('?flow=unknown')).toBe(DATASET_WIZARD_FLOW_VARIANT_1);
    expect(resolveWizardFlowVariant('?flow=flow_2')).toBe(DATASET_WIZARD_FLOW_VARIANT_2);
  });
});
