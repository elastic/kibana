/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConversationOriginType } from '@kbn/agent-builder-common';
import { RoundAuthorHeader } from './round_author_header';

describe('RoundAuthorHeader', () => {
  const startedAt = '2026-01-01T13:00:00.000Z';

  it('renders the user author and Slack origin', () => {
    render(
      <RoundAuthorHeader
        actor="user"
        startedAt={startedAt}
        author={{ id: 'user-1', full_name: 'Jane Doe', username: 'jdoe' }}
        origin={{ type: ConversationOriginType.Slack }}
      />
    );

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('via Slack')).toBeInTheDocument();
  });

  it('falls back to Me for user-authored rounds without a name', () => {
    render(<RoundAuthorHeader actor="user" startedAt={startedAt} />);

    expect(screen.getByText('Me')).toBeInTheDocument();
  });

  it('renders the agent label', () => {
    render(<RoundAuthorHeader actor="agent" startedAt={startedAt} />);

    expect(screen.getByText('Elastic AI Agent')).toBeInTheDocument();
  });
});
