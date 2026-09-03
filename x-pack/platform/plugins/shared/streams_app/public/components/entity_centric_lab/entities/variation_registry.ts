/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Registry of prototype variation dimensions.
 *
 * Each dimension is an independent axis the prototype can be switched along
 * (data profile, UI alternative, …). Dimensions are declared here once and
 * consumed by the {@link VariationProvider} (URL persistence) and the
 * {@link VariationSwitcher} popover (UI controls).
 */

export interface VariationOption {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
}

export interface VariationDimension {
  /** Short slug used as the URL param key (prefixed with `v_`). */
  readonly id: string;
  /** Human-readable label shown in the switcher popover. */
  readonly label: string;
  readonly options: readonly VariationOption[];
  /** Must match one of the option ids. */
  readonly defaultOption: string;
}

// ---------------------------------------------------------------------------
// Starter dimensions
// ---------------------------------------------------------------------------

export type DataVariation = 'default' | 'full' | 'degraded';

export const DATA_DIMENSION: VariationDimension = {
  id: 'data',
  label: 'Data profile',
  defaultOption: 'default',
  options: [
    { id: 'default', label: 'Default', description: 'Standard demo dataset' },
    { id: 'full', label: 'Full', description: 'High entity counts across all categories' },
    {
      id: 'degraded',
      label: 'Degraded',
      description: 'Most entities unhealthy with active alerts',
    },
  ],
};

export type DetailVariation = 'flyout' | 'fullPage';

export const DETAIL_DIMENSION: VariationDimension = {
  id: 'detail',
  label: 'Detail view',
  defaultOption: 'flyout',
  options: [
    { id: 'flyout', label: 'Flyout', description: 'Side flyout (current)' },
    { id: 'fullPage', label: 'Full page', description: 'Dedicated detail page (coming soon)' },
  ],
};

/** All registered dimensions, in display order. */
export const VARIATION_DIMENSIONS: readonly VariationDimension[] = [
  DATA_DIMENSION,
  DETAIL_DIMENSION,
];
