/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NotificationPolicyDestinationBadge } from './notification_policy_destination_badge';

describe('NotificationPolicyDestinationBadge', () => {
  it('renders a workflow destination badge with the destination id', () => {
    render(
      <NotificationPolicyDestinationBadge
        destination={{ type: 'workflow', id: 'my-workflow-id' }}
      />
    );

    expect(screen.getByText('my-workflow-id')).toBeInTheDocument();
  });

  it('renders the badge with primary color and workflow icon', () => {
    const { container } = render(
      <NotificationPolicyDestinationBadge destination={{ type: 'workflow', id: 'test-id' }} />
    );

    const badge = container.querySelector('.euiBadge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('test-id');
  });

  it('renders nothing for an unknown destination type', () => {
    render(
      <NotificationPolicyDestinationBadge
        destination={{ type: 'unknown' as never, id: 'test-id' }}
      />
    );
    expect(screen.queryByText('test-id')).not.toBeInTheDocument();
  });
});
