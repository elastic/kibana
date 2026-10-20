/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CUSTOM_CONTENT_MAX_HEIGHT,
  CUSTOM_CONTENT_MAX_TEMPLATE_BYTES,
  CUSTOM_CONTENT_MIN_HEIGHT,
  CUSTOM_CONTENT_SCRIPT_PATTERN,
} from '@kbn/custom-content-common';
import { describeMissingPanel } from '../custom_content_output';
import type { CustomContentEvaluator } from '../types';

export const CUSTOM_CONTENT_TEMPLATE_EVALUATOR_NAME = 'Custom Content Template';

/** The stored template is usable: present, script-free, within the size and height limits. */
export const createTemplateValidityEvaluator = (): CustomContentEvaluator => ({
  name: CUSTOM_CONTENT_TEMPLATE_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const panel = output.after;
    if (!panel) {
      return {
        score: 0,
        label: 'no-panel',
        explanation: describeMissingPanel(output),
      };
    }

    const { template, height } = panel;
    const checks: Array<{ name: string; passed: boolean }> = [
      {
        name: 'has a template',
        passed: typeof template === 'string' && template.trim().length > 0,
      },
      {
        name: 'has no script tag',
        passed: !CUSTOM_CONTENT_SCRIPT_PATTERN.test(template ?? ''),
      },
      {
        name: 'is within the size limit',
        passed: Buffer.byteLength(template ?? '', 'utf8') <= CUSTOM_CONTENT_MAX_TEMPLATE_BYTES,
      },
      {
        name: 'declares a height within bounds',
        passed:
          height === undefined ||
          (height >= CUSTOM_CONTENT_MIN_HEIGHT && height <= CUSTOM_CONTENT_MAX_HEIGHT),
      },
    ];
    const failed = checks.filter(({ passed }) => !passed).map(({ name }) => name);
    const score = (checks.length - failed.length) / checks.length;

    return {
      score,
      label: failed.length === 0 ? 'valid' : 'invalid',
      explanation:
        failed.length === 0
          ? 'The template passed every check.'
          : `Template failed: ${failed.join(', ')}.`,
      metadata: { height },
    };
  },
});
