/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSampleActionPolicyId, getSampleWorkflowId } from './ids';
import { ACTION_POLICY_SAMPLE_KEYS } from './samples';

const WORKFLOW_ID_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const MIN_WORKFLOW_ID_LENGTH = 3;
const MAX_WORKFLOW_ID_LENGTH = 255;

describe('getSampleActionPolicyId', () => {
  it('is stable for the same space and sample', () => {
    expect(getSampleActionPolicyId('default', ACTION_POLICY_SAMPLE_KEYS.allAlerts)).toBe(
      getSampleActionPolicyId('default', ACTION_POLICY_SAMPLE_KEYS.allAlerts)
    );
  });

  it('differs across spaces', () => {
    expect(getSampleActionPolicyId('default', ACTION_POLICY_SAMPLE_KEYS.allAlerts)).not.toBe(
      getSampleActionPolicyId('other-space', ACTION_POLICY_SAMPLE_KEYS.allAlerts)
    );
  });

  it('differs across samples', () => {
    const ids = Object.values(ACTION_POLICY_SAMPLE_KEYS).map((key) =>
      getSampleActionPolicyId('default', key)
    );

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getSampleWorkflowId', () => {
  it('is stable for the same space', () => {
    expect(getSampleWorkflowId('default')).toBe(getSampleWorkflowId('default'));
  });

  it('differs across spaces because workflow ids are global', () => {
    expect(getSampleWorkflowId('default')).not.toBe(getSampleWorkflowId('other-space'));
  });

  it('is a valid workflow id', () => {
    const id = getSampleWorkflowId('default');

    expect(id).toMatch(WORKFLOW_ID_PATTERN);
    expect(id.length).toBeGreaterThanOrEqual(MIN_WORKFLOW_ID_LENGTH);
    expect(id.length).toBeLessThanOrEqual(MAX_WORKFLOW_ID_LENGTH);
  });
});
