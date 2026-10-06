/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ACTION_POLICY_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import { ActionPolicyInlineContent } from './action_policy_inline_content';

const createAttachment = (overrides: { origin?: string; enabled?: boolean } = {}) => ({
  id: 'att-1',
  type: ACTION_POLICY_ATTACHMENT_TYPE,
  versions: [],
  current_version: 1,
  origin: overrides.origin,
  data: {
    name: 'My Policy',
    description: 'A test policy',
    destinations: [{ type: 'workflow' as const, id: 'wf-1' }],
    matcher: { tags: ['production', 'sre'], expression: 'episode_status: "active"' },
    grouping_mode: 'per_alert' as const,
    throttle: { strategy: 'on_status_change' as const },
    enabled: overrides.enabled,
  } as any,
});

describe('ActionPolicyInlineContent', () => {
  it('shows draft status when no origin', () => {
    render(<ActionPolicyInlineContent attachment={createAttachment()} isSidebar={false} />);
    expect(screen.getByText('Draft')).toBeDefined();
  });

  it('shows enabled status when origin is set and enabled is undefined', () => {
    render(
      <ActionPolicyInlineContent
        attachment={createAttachment({ origin: 'policy-123' })}
        isSidebar={false}
      />
    );
    expect(screen.getByText('Enabled')).toBeDefined();
  });

  it('shows disabled status when origin is set and enabled is false', () => {
    render(
      <ActionPolicyInlineContent
        attachment={createAttachment({ origin: 'policy-123', enabled: false })}
        isSidebar={false}
      />
    );
    expect(screen.getByText('Disabled')).toBeDefined();
  });

  it('renders the rule tags of the matcher', () => {
    render(<ActionPolicyInlineContent attachment={createAttachment()} isSidebar={false} />);
    expect(screen.getByText('Rule tags:')).toBeDefined();
    expect(screen.getByText('production')).toBeDefined();
    expect(screen.getByText('sre')).toBeDefined();
  });

  it('renders the advanced matching query', () => {
    render(<ActionPolicyInlineContent attachment={createAttachment()} isSidebar={false} />);
    expect(screen.getByText('Advanced matching query:')).toBeDefined();
    expect(screen.getByText('episode_status: "active"')).toBeDefined();
  });

  it('omits rule tags and query rows when the matcher has neither', () => {
    const attachment = createAttachment();
    attachment.data.matcher = { tags: [], expression: '  ' };
    render(<ActionPolicyInlineContent attachment={attachment} isSidebar={false} />);
    expect(screen.queryByText('Rule tags:')).toBeNull();
    expect(screen.queryByText('Advanced matching query:')).toBeNull();
  });

  it('renders only the policy scope title when matcher is null', () => {
    const attachment = createAttachment();
    attachment.data.matcher = null;
    render(<ActionPolicyInlineContent attachment={attachment} isSidebar={false} />);
    expect(screen.getByText('Policy scope')).toBeDefined();
    expect(screen.queryByText('Rule tags:')).toBeNull();
    expect(screen.queryByText('Advanced matching query:')).toBeNull();
  });

  it('renders the info bar with dispatch mode, frequency and destination count', () => {
    render(<ActionPolicyInlineContent attachment={createAttachment()} isSidebar={false} />);
    expect(screen.getByTestId('actionPolicyInlineDispatchPer')).toHaveTextContent('Alert');
    expect(screen.getByTestId('actionPolicyInlineFrequency')).toHaveTextContent(
      'On status change'
    );
    expect(screen.getByTestId('actionPolicyInlineDestination')).toHaveTextContent('1 workflow');
  });

  it('pluralizes the destination count', () => {
    const attachment = createAttachment();
    attachment.data.destinations = [
      { type: 'workflow', id: 'wf-1' },
      { type: 'workflow', id: 'wf-2' },
    ];
    render(<ActionPolicyInlineContent attachment={attachment} isSidebar={false} />);
    expect(screen.getByTestId('actionPolicyInlineDestination')).toHaveTextContent('2 workflows');
  });
});
