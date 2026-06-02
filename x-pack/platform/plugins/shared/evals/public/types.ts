/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ManagementSetup } from '@kbn/management-plugin/public';

export type EvalsPublicSetup = Record<string, never>;

export interface AddToDatasetInitialExample {
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
}

export interface AddToDatasetInitialSelectableExample extends AddToDatasetInitialExample {
  /**
   * Human-readable label shown in the selection list.
   */
  label: string;
  /**
   * Whether the example should be selected by default.
   *
   * Defaults to true.
   */
  selected?: boolean;
}

export interface AddToDatasetFlyoutOpenOptions {
  /**
   * The example JSON shown to the user for editing before submission.
   *
   * NOTE: This is intentionally generic to support multiple product surfaces.
   */
  initialExample?: AddToDatasetInitialExample;
  /**
   * When provided, the flyout lets the user select and submit multiple examples in one go.
   */
  initialExamples?: AddToDatasetInitialSelectableExample[];
  /**
   * Optional title shown in the flyout header.
   */
  title?: string;
}

export interface AddToDatasetActionConfig extends AddToDatasetFlyoutOpenOptions {
  /**
   * Text shown for button-style CTAs.
   *
   * Defaults to a generic "Add to dataset" label.
   */
  label?: string;
  /**
   * Accessible label for icon-only CTAs.
   *
   * Defaults to `label` (or the default label).
   */
  ariaLabel?: string;
  /**
   * Icon type for the CTA (defaults to `beaker`).
   */
  iconType?: string;
  /**
   * Whether to call `event.stopPropagation()` for click events.
   *
   * Useful when rendering within clickable containers (e.g. accordions).
   */
  stopPropagation?: boolean;
  /**
   * Optional callback invoked right before opening the flyout.
   */
  onBeforeOpen?: () => void;
}

export interface AddToDatasetAction {
  label: string;
  ariaLabel: string;
  iconType: string;
  onClick: (event?: { stopPropagation?: () => void }) => void;
}

export interface EvalsPublicStart {
  openAddToDatasetFlyout: (options: AddToDatasetFlyoutOpenOptions) => void;
  getAddToDatasetAction: (config: AddToDatasetActionConfig) => AddToDatasetAction | null;
  canAddToDataset: boolean;
}

export interface EvalsSetupDependencies {
  management?: ManagementSetup;
}

export type EvalsStartDependencies = Record<string, never>;
