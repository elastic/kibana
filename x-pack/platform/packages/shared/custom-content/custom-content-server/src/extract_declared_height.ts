/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CUSTOM_CONTENT_DEFAULT_HEIGHT,
  CUSTOM_CONTENT_MIN_HEIGHT,
  CUSTOM_CONTENT_MAX_HEIGHT,
} from '@kbn/custom-content-common';

/**
 * Reads and strips the `<!-- cc-height: N -->` declaration the model emits as its first line,
 * so the stored template is exactly the markup the panel renders. Missing or unparseable falls
 * back to the default rather than failing a template that is otherwise fine.
 */
export const extractDeclaredHeight = (
  rawTemplate: string
): { template: string; height: number } => {
  // The model is asked to show its arithmetic after the number; only the leading number is read.
  const match = rawTemplate.match(/^\s*<!--\s*cc-height:\s*(\d+)[^>]*-->\s*/i);
  if (!match) {
    return { template: rawTemplate, height: CUSTOM_CONTENT_DEFAULT_HEIGHT };
  }

  const declared = Number.parseInt(match[1], 10);
  const height = Number.isFinite(declared)
    ? Math.min(CUSTOM_CONTENT_MAX_HEIGHT, Math.max(CUSTOM_CONTENT_MIN_HEIGHT, declared))
    : CUSTOM_CONTENT_DEFAULT_HEIGHT;

  return { template: rawTemplate.slice(match[0].length), height };
};
