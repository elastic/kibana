/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DATASET_WIZARD_FLOW_VARIANT_SEARCH_PARAM = 'flow';

export const DATASET_WIZARD_FLOW_VARIANT_1 = 'flow_1';
export const DATASET_WIZARD_FLOW_VARIANT_2 = 'flow_2';

export type DatasetWizardFlowVariant =
  | typeof DATASET_WIZARD_FLOW_VARIANT_1
  | typeof DATASET_WIZARD_FLOW_VARIANT_2;

export const DATASET_WIZARD_FLOW_VARIANTS: DatasetWizardFlowVariant[] = [
  DATASET_WIZARD_FLOW_VARIANT_1,
  DATASET_WIZARD_FLOW_VARIANT_2,
];

export const isDatasetWizardFlowVariant = (value: string): value is DatasetWizardFlowVariant =>
  DATASET_WIZARD_FLOW_VARIANTS.includes(value as DatasetWizardFlowVariant);

export const parseWizardFlowVariantFromSearch = (
  search: string
): DatasetWizardFlowVariant | undefined => {
  const params = new URLSearchParams(search);
  const rawFlow = params.get(DATASET_WIZARD_FLOW_VARIANT_SEARCH_PARAM);

  if (!rawFlow || !isDatasetWizardFlowVariant(rawFlow)) {
    return undefined;
  }

  return rawFlow;
};

export const buildCreateDatasetWizardPath = (flowVariant: DatasetWizardFlowVariant): string => {
  const params = new URLSearchParams();
  params.set(DATASET_WIZARD_FLOW_VARIANT_SEARCH_PARAM, flowVariant);

  return `/create?${params.toString()}`;
};

export const resolveWizardFlowVariant = (search: string): DatasetWizardFlowVariant =>
  parseWizardFlowVariantFromSearch(search) ?? DATASET_WIZARD_FLOW_VARIANT_1;
