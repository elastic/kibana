/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getQuickCreateUrl,
  setQuickCreateStackName,
  setQuickCreateStackParams,
} from './cloud_formation_urls';

describe('setQuickCreateStackName', () => {
  it('adds the stack name when absent', () => {
    expect(setQuickCreateStackName('https://console/qc?templateURL=x', 'my stack')).toBe(
      'https://console/qc?templateURL=x&stackName=my%20stack'
    );
  });

  it('replaces the stack name when present', () => {
    expect(setQuickCreateStackName('https://console/qc?stackName=old&templateURL=x', 'new')).toBe(
      'https://console/qc?stackName=new&templateURL=x'
    );
  });

  it('leaves param_* values intact', () => {
    expect(
      setQuickCreateStackName('https://console/qc?param_stackName=keep&templateURL=x', 'new')
    ).toBe('https://console/qc?param_stackName=keep&templateURL=x&stackName=new');
  });

  it('composes with the quick-create builders', () => {
    expect(
      setQuickCreateStackParams(
        setQuickCreateStackName(
          getQuickCreateUrl('https://bucket/x?sig=1'),
          'elastic-bootstrap-onboarding'
        ),
        { ManagementMode: 'fully-managed' }
      )
    ).toBe(
      'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https%3A%2F%2Fbucket%2Fx%3Fsig%3D1&stackName=elastic-bootstrap-onboarding&param_ManagementMode=fully-managed'
    );
  });
});
