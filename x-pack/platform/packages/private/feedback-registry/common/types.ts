/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The id of the application associated with this feedback entry, e.g. 'dashboard', 'discover'
 * or in case of deep links, the deep link id e.g. 'ml:dataVisualizer'.
 */
export type FeedbackRegistryEntryId = string;

export interface FeedbackRegistryEntry {
  /**
   * Unique identifier for the feedback entry.
   */
  id: string;
  /**
   * Represents the label shown above the feedback text area. Equivalent to the question asked.
   */
  label?: {
    i18nId: string;
    defaultMessage: string;
  };
  /**
   * Optional placeholder for the feedback text area.
   */
  placeholder?: {
    i18nId: string;
    defaultMessage: string;
  };
  /**
   * Optional aria-label for the feedback text area.
   */
  ariaLabel?: {
    i18nId: string;
    defaultMessage: string;
  };
}

export type FeedbackRegistry = Map<FeedbackRegistryEntryId, FeedbackRegistryEntry[]>;
