/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PersistableStateAttachmentState } from '../../../../common/types/domain';

export interface PageAttachmentPersistedState extends PersistableStateAttachmentState {
  /**
   * The type of page or page asset, e.g., 'dashboard', 'synthetics-test-run', 'slo-history', etc
   */
  type: string;
  url: {
    /**
     * The URL to the page or page asset, excluding the base path.
     */
    pathAndQuery: string;
    /**
     * The icon representing the page type, displayed in the comment and action
     */
    iconType: string;
    /**
     * The label to render in the "Go to" action, example "View in Dashboard" for the asset
     */
    actionLabel: string;
    /**
     * The label to render in the comment for the page or page asset
     */
    label: string;
  };
  /**
   * Optional screen context for the page. A plain text description that
   * can be provided to an LLM to generate a summary or perform analysis
   */
  screenContext: Array<{ screenDescription: string }> | null;
}
