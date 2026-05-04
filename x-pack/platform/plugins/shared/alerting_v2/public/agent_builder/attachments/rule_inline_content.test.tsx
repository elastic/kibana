/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RuleInlineContent } from './rule_inline_content';

const createAttachment = (overrides: { origin?: string; enabled?: boolean } = {}) => ({
  id: 'att-1',
  type: 'rule' as const,
  versions: [],
  current_version: 1,
  origin: overrides.origin,
  data: {
    kind: 'signal' as const,
    metadata: { name: 'My Rule', tags: ['tag1', 'tag2'], description: 'A test rule' },
    schedule: { every: '5m' },
    time_field: '@timestamp',
    evaluation: { query: { kql: 'host.name: *' } },
    state_transition: null,
    enabled: overrides.enabled,
  } as any,
});

describe('RuleInlineContent', () => {
  it('does not render the rule name in the body', () => {
    const { queryByText } = render(
      <RuleInlineContent attachment={createAttachment()} isSidebar={false} />
    );
    expect(queryByText('My Rule')).toBeNull();
  });

  it('renders the kind badge', () => {
    const { getByText } = render(
      <RuleInlineContent attachment={createAttachment()} isSidebar={false} />
    );
    expect(getByText('signal')).toBeDefined();
  });

  it('shows proposed status when no origin', () => {
    const { getByText } = render(
      <RuleInlineContent attachment={createAttachment()} isSidebar={false} />
    );
    expect(getByText('proposed')).toBeDefined();
  });

  it('shows enabled status when origin is set and enabled is undefined (server default)', () => {
    const { getByText } = render(
      <RuleInlineContent attachment={createAttachment({ origin: 'rule-123' })} isSidebar={false} />
    );
    expect(getByText('enabled')).toBeDefined();
  });

  it('shows enabled status when origin is set and enabled is true', () => {
    const { getByText } = render(
      <RuleInlineContent
        attachment={createAttachment({ origin: 'rule-123', enabled: true })}
        isSidebar={false}
      />
    );
    expect(getByText('enabled')).toBeDefined();
  });

  it('shows disabled status when origin is set and enabled is false', () => {
    const { getByText } = render(
      <RuleInlineContent
        attachment={createAttachment({ origin: 'rule-123', enabled: false })}
        isSidebar={false}
      />
    );
    expect(getByText('disabled')).toBeDefined();
  });

  it('shows the schedule interval', () => {
    const { getByText } = render(
      <RuleInlineContent attachment={createAttachment()} isSidebar={false} />
    );
    expect(getByText('Every 5m')).toBeDefined();
  });

  it('shows the description', () => {
    const { getByText } = render(
      <RuleInlineContent attachment={createAttachment()} isSidebar={false} />
    );
    expect(getByText('A test rule')).toBeDefined();
  });

  it('renders tags', () => {
    const { getByText } = render(
      <RuleInlineContent attachment={createAttachment()} isSidebar={false} />
    );
    expect(getByText('tag1')).toBeDefined();
    expect(getByText('tag2')).toBeDefined();
  });

  it('does not render tags section when tags are empty', () => {
    const attachment = createAttachment();
    attachment.data.metadata.tags = [];
    const { queryByText } = render(<RuleInlineContent attachment={attachment} isSidebar={false} />);
    expect(queryByText('tag1')).toBeNull();
  });

  it('does not render description when absent', () => {
    const attachment = createAttachment();
    attachment.data.metadata.description = undefined;
    const { queryByText } = render(<RuleInlineContent attachment={attachment} isSidebar={false} />);
    expect(queryByText('A test rule')).toBeNull();
  });

  it('does not render schedule when absent', () => {
    const attachment = createAttachment();
    attachment.data.schedule = undefined;
    const { queryByText } = render(<RuleInlineContent attachment={attachment} isSidebar={false} />);
    expect(queryByText('Every 5m')).toBeNull();
  });
});
