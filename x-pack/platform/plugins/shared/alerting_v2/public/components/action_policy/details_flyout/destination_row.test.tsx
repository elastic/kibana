/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DestinationRow } from './destination_row';

jest.mock('../workflow_destination_link', () => ({
  WorkflowDestinationLink: ({
    id,
    name,
    isDraft,
  }: {
    id: string;
    name?: string;
    isDraft?: boolean;
  }) => (
    <span data-test-subj="mockWorkflowLink">
      {name ?? id}
      {isDraft ? ' (draft)' : ''}
    </span>
  ),
}));

describe('DestinationRow', () => {
  it('renders a workflow destination with WorkflowDestinationLink', () => {
    render(
      <DestinationRow
        destination={{ type: 'workflow', id: 'wf-1' }}
        name="My Workflow"
      />
    );

    expect(screen.getByText('My Workflow')).toBeDefined();
    expect(screen.getByTestId('mockWorkflowLink')).toBeDefined();
  });

  it('passes isDraft to WorkflowDestinationLink', () => {
    render(
      <DestinationRow
        destination={{ type: 'workflow', id: 'wf-1' }}
        name="Draft Workflow"
        isDraft={true}
      />
    );

    expect(screen.getByText('Draft Workflow (draft)')).toBeDefined();
  });

  it('renders without name (falls back to id)', () => {
    render(
      <DestinationRow
        destination={{ type: 'workflow', id: 'wf-1' }}
      />
    );

    expect(screen.getByText('wf-1')).toBeDefined();
  });

  it('returns null for unknown destination types', () => {
    const { container } = render(
      <DestinationRow
        destination={{ type: 'unknown' as any, id: 'x' }}
      />
    );

    expect(container.innerHTML).toBe('');
  });
});
