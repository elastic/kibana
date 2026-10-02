/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTemplateActionPolicyId, getTemplateWorkflowId } from './ids';
import { ACTION_POLICY_TEMPLATE_KEYS } from './templates';

const WORKFLOW_ID_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const MIN_WORKFLOW_ID_LENGTH = 3;
const MAX_WORKFLOW_ID_LENGTH = 255;

describe('getTemplateActionPolicyId', () => {
  it('is stable for the same space and template', () => {
    expect(getTemplateActionPolicyId('default', ACTION_POLICY_TEMPLATE_KEYS.allAlerts)).toBe(
      getTemplateActionPolicyId('default', ACTION_POLICY_TEMPLATE_KEYS.allAlerts)
    );
  });

  it('differs across spaces', () => {
    expect(getTemplateActionPolicyId('default', ACTION_POLICY_TEMPLATE_KEYS.allAlerts)).not.toBe(
      getTemplateActionPolicyId('other-space', ACTION_POLICY_TEMPLATE_KEYS.allAlerts)
    );
  });

  it('differs across templates', () => {
    const ids = Object.values(ACTION_POLICY_TEMPLATE_KEYS).map((key) =>
      getTemplateActionPolicyId('default', key)
    );

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getTemplateWorkflowId', () => {
  it('is stable for the same space', () => {
    expect(getTemplateWorkflowId('default')).toBe(getTemplateWorkflowId('default'));
  });

  it('differs across spaces because workflow ids are global', () => {
    expect(getTemplateWorkflowId('default')).not.toBe(getTemplateWorkflowId('other-space'));
  });

  it('is a valid workflow id', () => {
    const id = getTemplateWorkflowId('default');

    expect(id).toMatch(WORKFLOW_ID_PATTERN);
    expect(id.length).toBeGreaterThanOrEqual(MIN_WORKFLOW_ID_LENGTH);
    expect(id.length).toBeLessThanOrEqual(MAX_WORKFLOW_ID_LENGTH);
  });
});
