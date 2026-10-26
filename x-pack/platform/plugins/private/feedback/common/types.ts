/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface FeedbackQuestion {
  id: string;
  question: string;
  answer: string;
}

/** App-specific context recorded with the feedback payload. */
export type FeedbackContext = Record<string, string | boolean | number>;

/** Optional UI overrides applied when collecting feedback for the current app. */
export interface FeedbackContextOptions {
  /** Fully replaces the derived app title shown in the feedback form. */
  title?: string;
}

export type SetFeedbackContext = (
  appId: string,
  context: FeedbackContext,
  options?: FeedbackContextOptions
) => () => void;

export interface FeedbackSubmittedData {
  app_id: string;
  solution: string;
  allow_email_contact: boolean;
  url: string;
  user_email?: string;
  csat_score?: number;
  questions?: FeedbackQuestion[];
  organization_id?: string;
  context?: FeedbackContext;
}

export type FeedbackFormData = Omit<FeedbackSubmittedData, 'solution' | 'organization_id'>;
