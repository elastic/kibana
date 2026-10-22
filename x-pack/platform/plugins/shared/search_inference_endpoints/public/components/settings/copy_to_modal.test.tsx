/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isCopyTargetDisabled } from './copy_to_modal';

describe('isCopyTargetDisabled', () => {
  const target = {
    featureId: 'alertzero_frontier',
    taskType: 'chat_completion' as const,
  };

  it('allows a messages row to copy onto another messages row', () => {
    expect(
      isCopyTargetDisabled({
        allowTemplateRequiredModels: false,
        currentFeatureId: 'alertzero_efficient',
        feature: target,
        taskType: 'chat_completion',
      })
    ).toBe(false);
  });

  it('blocks copying a template-only row onto a messages row', () => {
    expect(
      isCopyTargetDisabled({
        allowTemplateRequiredModels: true,
        currentFeatureId: 'alertzero_template_models',
        feature: target,
        taskType: 'chat_completion',
      })
    ).toBe(true);
  });

  it('blocks copying a messages row onto a template-only row', () => {
    expect(
      isCopyTargetDisabled({
        allowTemplateRequiredModels: false,
        currentFeatureId: 'alertzero_frontier',
        feature: {
          ...target,
          featureId: 'alertzero_template_models',
          allowTemplateRequiredModels: true,
        },
        taskType: 'chat_completion',
      })
    ).toBe(true);
  });

  it('allows a template-only row to copy onto another template-only row', () => {
    expect(
      isCopyTargetDisabled({
        allowTemplateRequiredModels: true,
        currentFeatureId: 'alertzero_template_models',
        feature: {
          featureId: 'other_template_row',
          taskType: 'chat_completion',
          allowTemplateRequiredModels: true,
        },
        taskType: 'chat_completion',
      })
    ).toBe(false);
  });
});
