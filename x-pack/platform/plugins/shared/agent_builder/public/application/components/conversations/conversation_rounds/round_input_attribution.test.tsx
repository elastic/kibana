/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConversationOriginType } from '@kbn/agent-builder-common';
import { RoundInputAttribution } from './round_input_attribution';

const slackOrigin = { type: ConversationOriginType.Slack };

describe('RoundInputAttribution', () => {
  it('renders nothing for a round that originated in Kibana', () => {
    const { container } = render(<RoundInputAttribution />);

    expect(container).toBeEmptyDOMElement();
  });

  it('prefers the author full name', () => {
    render(
      <RoundInputAttribution
        origin={slackOrigin}
        author={{ id: 'U1', username: 'cvasquez', full_name: 'Clint Vasquez' }}
      />
    );

    expect(screen.getByText('Clint Vasquez via Slack')).toBeInTheDocument();
  });

  it('falls back to the username when there is no full name', () => {
    render(
      <RoundInputAttribution origin={slackOrigin} author={{ id: 'U1', username: 'cvasquez' }} />
    );

    expect(screen.getByText('cvasquez via Slack')).toBeInTheDocument();
  });

  it('still names the surface when the author is unknown', () => {
    render(<RoundInputAttribution origin={slackOrigin} />);

    expect(screen.getByText('via Slack')).toBeInTheDocument();
  });

  it('names the surface when the author carries only an id', () => {
    // A bare id is a Slack user id like `U0123`, which means nothing to a reader.
    render(<RoundInputAttribution origin={slackOrigin} author={{ id: 'U0123' }} />);

    expect(screen.getByText('via Slack')).toBeInTheDocument();
    expect(screen.queryByText(/U0123/)).not.toBeInTheDocument();
  });
});
