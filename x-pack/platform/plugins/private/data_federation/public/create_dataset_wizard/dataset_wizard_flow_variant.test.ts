/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildCloneDatasetWizardPath,
  buildCreateDatasetWizardPath,
  buildEditDatasetWizardPath,
  DATASET_WIZARD_FLOW_VARIANT_1,
  DATASET_WIZARD_FLOW_VARIANT_2,
  DATASET_WIZARD_FLOW_VARIANT_3,
  DATASET_WIZARD_FLOW_VARIANT_3_9_6,
  isDatasetWizardFlow3,
  parseWizardFlowVariantFromSearch,
  resolveWizardFlowVariant,
} from './dataset_wizard_flow_variant';

describe('dataset_wizard_flow_variant', () => {
  it('builds create paths with flow query params', () => {
    expect(buildCreateDatasetWizardPath(DATASET_WIZARD_FLOW_VARIANT_1)).toBe('/create?flow=flow_1');
    expect(buildCreateDatasetWizardPath(DATASET_WIZARD_FLOW_VARIANT_2)).toBe('/create?flow=flow_2');
    expect(buildCreateDatasetWizardPath(DATASET_WIZARD_FLOW_VARIANT_3)).toBe('/create?flow=flow_3');
    expect(buildCreateDatasetWizardPath(DATASET_WIZARD_FLOW_VARIANT_3_9_6)).toBe(
      '/create?flow=flow_3_9_6'
    );
    expect(buildCloneDatasetWizardPath('my-dataset')).toBe('/clone/my-dataset?flow=flow_3');
    expect(buildEditDatasetWizardPath('my-dataset')).toBe('/edit/my-dataset?flow=flow_3');
  });

  it('parses valid flow variants from search params', () => {
    expect(parseWizardFlowVariantFromSearch('?flow=flow_1')).toBe(DATASET_WIZARD_FLOW_VARIANT_1);
    expect(parseWizardFlowVariantFromSearch('?flow=flow_2&step=2')).toBe(
      DATASET_WIZARD_FLOW_VARIANT_2
    );
    expect(parseWizardFlowVariantFromSearch('?flow=flow_3&step=2')).toBe(
      DATASET_WIZARD_FLOW_VARIANT_3
    );
    expect(parseWizardFlowVariantFromSearch('?flow=flow_3_9_6')).toBe(
      DATASET_WIZARD_FLOW_VARIANT_3_9_6
    );
  });

  it('returns undefined for missing or invalid flow variants', () => {
    expect(parseWizardFlowVariantFromSearch('')).toBeUndefined();
    expect(parseWizardFlowVariantFromSearch('?flow=unknown')).toBeUndefined();
    expect(parseWizardFlowVariantFromSearch('?flow=flow_3a')).toBeUndefined();
    expect(parseWizardFlowVariantFromSearch('?flow=flow_3b')).toBeUndefined();
  });

  it('defaults to flow 1 when the flow query param is missing or invalid', () => {
    expect(resolveWizardFlowVariant('')).toBe(DATASET_WIZARD_FLOW_VARIANT_1);
    expect(resolveWizardFlowVariant('?step=2')).toBe(DATASET_WIZARD_FLOW_VARIANT_1);
    expect(resolveWizardFlowVariant('?flow=unknown')).toBe(DATASET_WIZARD_FLOW_VARIANT_1);
    expect(resolveWizardFlowVariant('?flow=flow_2')).toBe(DATASET_WIZARD_FLOW_VARIANT_2);
    expect(resolveWizardFlowVariant('?flow=flow_3')).toBe(DATASET_WIZARD_FLOW_VARIANT_3);
    expect(resolveWizardFlowVariant('?flow=flow_3_9_6')).toBe(DATASET_WIZARD_FLOW_VARIANT_3_9_6);
    expect(resolveWizardFlowVariant('', DATASET_WIZARD_FLOW_VARIANT_3)).toBe(
      DATASET_WIZARD_FLOW_VARIANT_3
    );
  });

  it('identifies flow 3', () => {
    expect(isDatasetWizardFlow3(DATASET_WIZARD_FLOW_VARIANT_3)).toBe(true);
    expect(isDatasetWizardFlow3(DATASET_WIZARD_FLOW_VARIANT_3_9_6)).toBe(true);
    expect(isDatasetWizardFlow3(DATASET_WIZARD_FLOW_VARIANT_1)).toBe(false);
    expect(isDatasetWizardFlow3(DATASET_WIZARD_FLOW_VARIANT_2)).toBe(false);
  });
});
