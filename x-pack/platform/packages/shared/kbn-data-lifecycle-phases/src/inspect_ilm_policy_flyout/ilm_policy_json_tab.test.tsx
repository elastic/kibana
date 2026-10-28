/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import type { SerializedPolicy } from '@kbn/index-lifecycle-management-common-shared';
import { IlmPolicyJsonTab } from './ilm_policy_json_tab';

const getCodeBlockText = (container: HTMLElement) => {
  const pre = container.querySelector('pre');
  if (!pre?.textContent) throw new Error('Expected EuiCodeBlock to render a <pre> with text');
  return pre.textContent;
};

describe('IlmPolicyJsonTab', () => {
  it('renders a copyable PUT request and removes policy name from the body', () => {
    const policyName = 'my-policy';
    const policy: SerializedPolicy = {
      name: 'name-should-not-appear-in-body',
      phases: {
        hot: {
          min_age: '0ms',
          actions: {
            rollover: { max_age: '30d' },
          },
        },
      },
      _meta: { managed: true },
    };

    const { container } = render(<IlmPolicyJsonTab policyName={policyName} policy={policy} />, {
      wrapper: EuiThemeProvider,
    });

    expect(screen.getByTestId('ilmPolicyJsonTab')).toBeTruthy();
    expect(screen.getByTestId('ilmPolicyJsonTabCodeBlock')).toBeTruthy();
    const text = getCodeBlockText(container);

    expect(text.startsWith(`PUT _ilm/policy/${policyName}\n`)).toBe(true);
    expect(text).toContain('{\n  "policy": {');
    expect(text).toContain('"phases"');
    expect(text).toContain('"_meta"');
    expect(text).not.toContain('"name"');
  });
});
