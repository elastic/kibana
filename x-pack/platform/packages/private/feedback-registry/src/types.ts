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

/**
 * Definition of a feedback question entry in the feedback registry.
 */
export interface FeedbackRegistryEntry {
  /**
   * Unique identifier for the feedback entry.
   */
  id: string;
  /**
   * Sort order for displaying the feedback entry. The lower the number, the higher it appears in the UI.
   */
  order: number;
  /**
   * The question text to be submitted with telemetry.
   */
  question: string;
  /**
   * The question text which appears in the UI.
   */
  label?: {
    i18nId: string;
    defaultMessage: string;
  };
  /**
   * Optional placeholder to show in the UI.
   */
  placeholder?: {
    i18nId: string;
    defaultMessage: string;
  };
  /**
   * Optional aria-label.
   */
  ariaLabel?: {
    i18nId: string;
    defaultMessage: string;
  };
}

/**
 * List of feedback plugin questions for a given application.
 */
export type FeedbackRegistry = Map<FeedbackRegistryEntryId, FeedbackRegistryEntry[]>;
