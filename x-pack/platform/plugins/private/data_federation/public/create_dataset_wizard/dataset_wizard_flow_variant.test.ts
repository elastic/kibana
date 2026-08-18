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
  DATASET_WIZARD_FLOW_VARIANT_3A,
  DATASET_WIZARD_FLOW_VARIANT_3B,
  isDatasetWizardFlow3,
  isDatasetWizardFlow3A,
  isDatasetWizardFlow3B,
  parseWizardFlowVariantFromSearch,
  resolveWizardFlowVariant,
} from './dataset_wizard_flow_variant';

describe('dataset_wizard_flow_variant', () => {
  it('builds create paths with flow query params', () => {
    expect(buildCreateDatasetWizardPath(DATASET_WIZARD_FLOW_VARIANT_1)).toBe('/create?flow=flow_1');
    expect(buildCreateDatasetWizardPath(DATASET_WIZARD_FLOW_VARIANT_2)).toBe('/create?flow=flow_2');
    expect(buildCreateDatasetWizardPath(DATASET_WIZARD_FLOW_VARIANT_3A)).toBe('/create?flow=flow_3a');
    expect(buildCreateDatasetWizardPath(DATASET_WIZARD_FLOW_VARIANT_3B)).toBe('/create?flow=flow_3b');
  });

  it('parses valid flow variants from search params', () => {
    expect(parseWizardFlowVariantFromSearch('?flow=flow_1')).toBe(DATASET_WIZARD_FLOW_VARIANT_1);
    expect(parseWizardFlowVariantFromSearch('?flow=flow_2&step=2')).toBe(
      DATASET_WIZARD_FLOW_VARIANT_2
    );
    expect(parseWizardFlowVariantFromSearch('?flow=flow_3a&step=2')).toBe(
      DATASET_WIZARD_FLOW_VARIANT_3A
    );
    expect(parseWizardFlowVariantFromSearch('?flow=flow_3b&step=2')).toBe(
      DATASET_WIZARD_FLOW_VARIANT_3B
    );
  });

  it('returns undefined for missing or invalid flow variants', () => {
    expect(parseWizardFlowVariantFromSearch('')).toBeUndefined();
    expect(parseWizardFlowVariantFromSearch('?flow=unknown')).toBeUndefined();
    expect(parseWizardFlowVariantFromSearch('?flow=flow_3')).toBeUndefined();
  });

  it('defaults to flow 1 when the flow query param is missing or invalid', () => {
    expect(resolveWizardFlowVariant('')).toBe(DATASET_WIZARD_FLOW_VARIANT_1);
    expect(resolveWizardFlowVariant('?step=2')).toBe(DATASET_WIZARD_FLOW_VARIANT_1);
    expect(resolveWizardFlowVariant('?flow=unknown')).toBe(DATASET_WIZARD_FLOW_VARIANT_1);
    expect(resolveWizardFlowVariant('?flow=flow_2')).toBe(DATASET_WIZARD_FLOW_VARIANT_2);
    expect(resolveWizardFlowVariant('?flow=flow_3a')).toBe(DATASET_WIZARD_FLOW_VARIANT_3A);
    expect(resolveWizardFlowVariant('?flow=flow_3b')).toBe(DATASET_WIZARD_FLOW_VARIANT_3B);
  });

  it('identifies flow 3 variants', () => {
    expect(isDatasetWizardFlow3A(DATASET_WIZARD_FLOW_VARIANT_3A)).toBe(true);
    expect(isDatasetWizardFlow3B(DATASET_WIZARD_FLOW_VARIANT_3B)).toBe(true);
    expect(isDatasetWizardFlow3(DATASET_WIZARD_FLOW_VARIANT_3A)).toBe(true);
    expect(isDatasetWizardFlow3(DATASET_WIZARD_FLOW_VARIANT_3B)).toBe(true);
    expect(isDatasetWizardFlow3(DATASET_WIZARD_FLOW_VARIANT_1)).toBe(false);
  });
});
