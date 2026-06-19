/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { WHY_V2_DEFAULT_MARKDOWN } from '../content/why_v2_default_markdown';

export type WhyV2MarkdownSource = 'bundled' | 'dynamic';

export interface UseWhyV2MarkdownResult {
  markdown: string;
  source: WhyV2MarkdownSource;
  isLoading: boolean;
}

/**
 * Placeholder hook for dynamic markdown content (release notes, roadmap, enablement guide).
 *
 * TODO: fetch from HTTP or saved object when content pipeline is available, e.g.:
 * `http.get<{ markdown: string }>('/internal/alerting/v2/why-markdown')`
 */
export const useWhyV2Markdown = (): UseWhyV2MarkdownResult => {
  return useMemo(
    () => ({
      markdown: WHY_V2_DEFAULT_MARKDOWN,
      source: 'bundled',
      isLoading: false,
    }),
    []
  );
};
