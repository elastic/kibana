/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexAutomation } from '../../../common/http_api/ai_indices';
import { getVisibleAutomations, getVisibleWorkflowIds } from './visible_automations';

const custom: AiIndexAutomation = { type: 'workflow', value: 'wf-custom' };
const dreaming: AiIndexAutomation = {
  type: 'workflow',
  value: 'system-context-engine-dreaming-my-index',
};
const automations = [custom, dreaming];

describe('visible automations', () => {
  it('shows every automation while memory is on', () => {
    expect(getVisibleAutomations(automations, true)).toEqual([custom, dreaming]);
    expect(getVisibleWorkflowIds(automations, true)).toEqual(['wf-custom', dreaming.value]);
  });

  it('hides dreaming automations while memory is off', () => {
    expect(getVisibleAutomations(automations, false)).toEqual([custom]);
    expect(getVisibleWorkflowIds(automations, false)).toEqual(['wf-custom']);
  });
});
