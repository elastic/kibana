/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ActionPolicyInlineContent } from './action_policy_inline_content';

const createAttachment = (overrides: { origin?: string; enabled?: boolean } = {}) => ({
  id: 'att-1',
  type: 'action_policy' as const,
  versions: [],
  current_version: 1,
  origin: overrides.origin,
  data: {
    name: 'My Policy',
    description: 'A test policy',
    destinations: [{ type: 'workflow' as const, id: 'wf-1' }],
    matcher: 'rule.id: "abc"',
    groupingMode: 'per_episode' as const,
    throttle: { strategy: 'on_status_change' as const },
    tags: ['ops', 'critical'],
    enabled: overrides.enabled,
  } as any,
});

describe('ActionPolicyInlineContent', () => {
  it('shows proposed status when no origin', () => {
    render(<ActionPolicyInlineContent attachment={createAttachment()} isSidebar={false} />);
    expect(screen.getByText('proposed')).toBeDefined();
  });

  it('shows enabled status when origin is set and enabled is undefined', () => {
    render(
      <ActionPolicyInlineContent
        attachment={createAttachment({ origin: 'policy-123' })}
        isSidebar={false}
      />
    );
    expect(screen.getByText('enabled')).toBeDefined();
  });

  it('shows disabled status when origin is set and enabled is false', () => {
    render(
      <ActionPolicyInlineContent
        attachment={createAttachment({ origin: 'policy-123', enabled: false })}
        isSidebar={false}
      />
    );
    expect(screen.getByText('disabled')).toBeDefined();
  });

  it('renders the matcher summary', () => {
    render(<ActionPolicyInlineContent attachment={createAttachment()} isSidebar={false} />);
    expect(screen.getByText(/rule\.id: "abc"/)).toBeDefined();
  });

  it('renders "matches all" when matcher is null', () => {
    const attachment = createAttachment();
    attachment.data.matcher = null;
    render(<ActionPolicyInlineContent attachment={attachment} isSidebar={false} />);
    expect(screen.getByText(/matches all/)).toBeDefined();
  });

  it('renders the destination count', () => {
    render(<ActionPolicyInlineContent attachment={createAttachment()} isSidebar={false} />);
    expect(screen.getByText('1 destination')).toBeDefined();
  });

  it('renders tags', () => {
    render(<ActionPolicyInlineContent attachment={createAttachment()} isSidebar={false} />);
    expect(screen.getByText('ops')).toBeDefined();
    expect(screen.getByText('critical')).toBeDefined();
  });

  it('does not render tags section when tags are empty', () => {
    const attachment = createAttachment();
    attachment.data.tags = [];
    render(<ActionPolicyInlineContent attachment={attachment} isSidebar={false} />);
    expect(screen.queryByText('ops')).toBeNull();
  });

  it('renders the throttle strategy badge', () => {
    render(<ActionPolicyInlineContent attachment={createAttachment()} isSidebar={false} />);
    expect(screen.getByText('on_status_change')).toBeDefined();
  });

  it('does not render throttle badge when strategy is absent', () => {
    const attachment = createAttachment();
    attachment.data.throttle = {};
    render(<ActionPolicyInlineContent attachment={attachment} isSidebar={false} />);
    expect(screen.queryByText('on_status_change')).toBeNull();
  });
});
