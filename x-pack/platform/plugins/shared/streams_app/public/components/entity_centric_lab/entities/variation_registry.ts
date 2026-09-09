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

export type DataVariation = 'default' | 'full' | 'degraded' | 'overflow';

/** Maximum number of entities surfaced in the UI at once. */
export const MAX_VISIBLE_ENTITIES = 10_000;

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
    {
      id: 'overflow',
      label: '10k+',
      description: 'More than 10,000 resources — tests truncation banner',
    },
  ],
};

export type DetailVariation = 'flyout' | 'largeFlyout' | 'flyoutExpandable' | 'fullPage';

export const DETAIL_DIMENSION: VariationDimension = {
  id: 'detail',
  label: 'Detail view',
  defaultOption: 'flyout',
  options: [
    { id: 'flyout', label: 'Flyout', description: 'Side flyout (current, size M)' },
    { id: 'largeFlyout', label: 'Large flyout', description: 'Wider flyout (size L)' },
    {
      id: 'flyoutExpandable',
      label: 'Expandable flyout',
      description: 'Flyout with expand-to-full-page button',
    },
    { id: 'fullPage', label: 'Full page', description: 'Dedicated detail page' },
  ],
};

export type PhaseVariation = 'phase1' | 'phase3';

export const PHASE_DIMENSION: VariationDimension = {
  id: 'phase',
  label: 'Phase',
  defaultOption: 'phase3',
  options: [
    {
      id: 'phase1',
      label: 'Phase 1',
      description: 'Alerts-first — no health concept, alert count badges',
    },
    {
      id: 'phase3',
      label: 'Phase 3',
      description: 'Current — health + alerts side by side',
    },
  ],
};

export type TableStyleVariation = 'default' | 'security';

export const TABLE_STYLE_DIMENSION: VariationDimension = {
  id: 'tableStyle',
  label: 'Table style',
  defaultOption: 'default',
  options: [
    { id: 'default', label: 'Default', description: 'Current panel-based table layout' },
    {
      id: 'security',
      label: 'Security approach',
      description: 'Accordion-style grouping (à la Security Entity Analytics)',
    },
  ],
};

/** All registered dimensions, in display order. */
export const VARIATION_DIMENSIONS: readonly VariationDimension[] = [
  PHASE_DIMENSION,
  DATA_DIMENSION,
  DETAIL_DIMENSION,
  TABLE_STYLE_DIMENSION,
];
