/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DATASET_WIZARD_FLOW_VARIANT_SEARCH_PARAM = 'flow';

/** Frozen flow — do not change wizard behavior without explicit approval. */
export const DATASET_WIZARD_FLOW_VARIANT_1 = 'flow_1';
/** Frozen flow — do not change wizard behavior without explicit approval. */
export const DATASET_WIZARD_FLOW_VARIANT_2 = 'flow_2';
/** Frozen flow — do not change wizard behavior without explicit approval. */
export const DATASET_WIZARD_FLOW_VARIANT_3 = 'flow_3';
/** Active development flow — new wizard work belongs here. */
export const DATASET_WIZARD_FLOW_VARIANT_3_9_6 = 'flow_3_9_6';
/** Frozen flow — do not change wizard behavior without explicit approval. */
export const DATASET_WIZARD_FLOW_VARIANT_4 = 'flow_4';

export type DatasetWizardFlowVariant =
  | typeof DATASET_WIZARD_FLOW_VARIANT_1
  | typeof DATASET_WIZARD_FLOW_VARIANT_2
  | typeof DATASET_WIZARD_FLOW_VARIANT_3
  | typeof DATASET_WIZARD_FLOW_VARIANT_3_9_6
  | typeof DATASET_WIZARD_FLOW_VARIANT_4;

export const DATASET_WIZARD_FLOW_VARIANTS: DatasetWizardFlowVariant[] = [
  DATASET_WIZARD_FLOW_VARIANT_1,
  DATASET_WIZARD_FLOW_VARIANT_2,
  DATASET_WIZARD_FLOW_VARIANT_3,
  DATASET_WIZARD_FLOW_VARIANT_3_9_6,
  DATASET_WIZARD_FLOW_VARIANT_4,
];

export const isDatasetWizardFlowVariant = (value: string): value is DatasetWizardFlowVariant =>
  DATASET_WIZARD_FLOW_VARIANTS.includes(value as DatasetWizardFlowVariant);

export const isDatasetWizardFlow3 = (flowVariant: DatasetWizardFlowVariant): boolean =>
  flowVariant === DATASET_WIZARD_FLOW_VARIANT_3 ||
  flowVariant === DATASET_WIZARD_FLOW_VARIANT_3_9_6 ||
  flowVariant === DATASET_WIZARD_FLOW_VARIANT_4;

/** True only for the active Flow 3 9.6 variant (`flow_3_9_6`), not classic Flow 3 or Flow 4. */
export const isDatasetWizardFlow396 = (flowVariant: DatasetWizardFlowVariant): boolean =>
  flowVariant === DATASET_WIZARD_FLOW_VARIANT_3_9_6;

export const isDatasetWizardFlow4 = (flowVariant: DatasetWizardFlowVariant): boolean =>
  flowVariant === DATASET_WIZARD_FLOW_VARIANT_4;

export const hasDatasetWizardPreviewResultsStep = (
  flowVariant: DatasetWizardFlowVariant
): boolean => isDatasetWizardFlow3(flowVariant) && !isDatasetWizardFlow396(flowVariant);

/**
 * Flow 3 9.6 relies on the region Elasticsearch resolves from the resource, and
 * flow 4 detects it from the bucket on its data source step, so neither asks
 * the user for one.
 */
export const hasDatasetWizardRegionField = (flowVariant: DatasetWizardFlowVariant): boolean =>
  !isDatasetWizardFlow396(flowVariant) && !isDatasetWizardFlow4(flowVariant);

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

export const resolveWizardFlowVariant = (
  search: string,
  defaultFlow: DatasetWizardFlowVariant = DATASET_WIZARD_FLOW_VARIANT_1
): DatasetWizardFlowVariant => parseWizardFlowVariantFromSearch(search) ?? defaultFlow;

const buildNamedDatasetWizardPath = (action: 'edit' | 'clone', datasetName: string): string => {
  const params = new URLSearchParams();
  params.set(DATASET_WIZARD_FLOW_VARIANT_SEARCH_PARAM, DATASET_WIZARD_FLOW_VARIANT_3_9_6);

  return `/${action}/${encodeURIComponent(datasetName)}?${params.toString()}`;
};

export const buildEditDatasetWizardPath = (datasetName: string): string =>
  buildNamedDatasetWizardPath('edit', datasetName);

export const buildCloneDatasetWizardPath = (datasetName: string): string =>
  buildNamedDatasetWizardPath('clone', datasetName);
