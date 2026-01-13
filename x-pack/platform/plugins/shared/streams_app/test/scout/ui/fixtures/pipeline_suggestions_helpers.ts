/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangDSL } from '@kbn/streamlang';

// Test IDs for pipeline suggestion components
export const PIPELINE_SUGGESTION_TEST_IDS = {
  panel: 'streamsAppSuggestPipelinePanel',
  callout: 'streamsAppPipelineSuggestionCallout',
  acceptButton: 'streamsAppPipelineSuggestionAcceptButton',
  rejectButton: 'streamsAppPipelineSuggestionRejectButton',
  loadingPrompt: 'streamsAppPipelineSuggestionLoadingPrompt',
  cancelButton: 'streamsAppPipelineSuggestionCancelButton',
  generateButton: 'streamsAppGenerateSuggestionButton',
} as const;

// Sample mock pipeline response for testing
export const MOCK_GROK_PIPELINE: StreamlangDSL = {
  steps: [
    {
      action: 'grok',
      from: 'message',
      patterns: ['%{TIMESTAMP_ISO8601:@timestamp} %{WORD:log.level} %{GREEDYDATA:message}'],
    },
  ],
};
