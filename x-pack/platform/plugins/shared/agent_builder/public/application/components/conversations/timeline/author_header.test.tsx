/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConversationOriginType } from '@kbn/agent-builder-common';
import { AuthorHeader } from './author_header';

describe('AuthorHeader', () => {
  const startedAt = '2026-01-01T13:00:00.000Z';

  it('renders the author name and Slack origin', () => {
    const { container } = render(
      <AuthorHeader
        startedAt={startedAt}
        name="Jane Doe"
        origin={{ type: ConversationOriginType.Slack }}
      />
    );

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('via Slack')).toBeInTheDocument();
    expect(container).toHaveTextContent('·');
  });

  it('does not render author attribution when no name is available', () => {
    const { container } = render(<AuthorHeader startedAt={startedAt} />);

    expect(container.querySelector('strong')).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent('·');
  });

  it('does not render a leading separator before Slack origin when there is no author name', () => {
    const { container } = render(
      <AuthorHeader startedAt={startedAt} origin={{ type: ConversationOriginType.Slack }} />
    );

    expect(container.textContent?.trim().startsWith('·')).toBe(false);
    expect(screen.getByText('via Slack')).toBeInTheDocument();
    expect(container).toHaveTextContent('·');
  });

  it('renders the agent badge alongside the agent name', () => {
    render(<AuthorHeader startedAt={startedAt} name="Custom Agent" showAgentBadge />);

    expect(screen.getByText('Custom Agent')).toBeInTheDocument();
    expect(screen.getByText('Agent')).toBeInTheDocument();
  });

  it('renders the origin for agent messages', () => {
    render(
      <AuthorHeader
        startedAt={startedAt}
        name="Custom Agent"
        showAgentBadge
        origin={{ type: ConversationOriginType.Slack }}
      />
    );

    expect(screen.getByText('Custom Agent')).toBeInTheDocument();
    expect(screen.getByText('Agent')).toBeInTheDocument();
    expect(screen.getByText('via Slack')).toBeInTheDocument();
  });

  it('renders the label between the name and the time', () => {
    const { container } = render(
      <AuthorHeader startedAt={startedAt} name="Jane Doe" label="Text Note" />
    );

    expect(screen.getByText('Text Note')).toBeInTheDocument();
    expect(container.textContent).toMatch(/^Jane Doe·Text Note·/);
  });

  it('does not render the agent badge for user authors', () => {
    render(<AuthorHeader startedAt={startedAt} name="Jane Doe" />);

    expect(screen.queryByText('Agent')).not.toBeInTheDocument();
  });
});
