/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface FeedbackPayload {
  roundId: string;
  vote: 'up' | 'down';
  chips: string[];
  comment: string;
}

// TODO: replace with OTel event emit + Elasticsearch upsert
export const submitFeedback = async (payload: FeedbackPayload): Promise<void> => {
  // eslint-disable-next-line no-console
  console.log('[FeedbackControls POC] submitFeedback', payload);
  await new Promise<void>((resolve) => setTimeout(resolve, 400));
};
