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
  WorkflowDestinationLink: ({ id }: { id: string }) => (
    <span data-test-subj="mockWorkflowLink">{id}</span>
  ),
}));

describe('DestinationRow', () => {
  it('renders a workflow destination with WorkflowDestinationLink', () => {
    render(<DestinationRow destination={{ type: 'workflow', id: 'wf-1' }} />);

    expect(screen.getByText('wf-1')).toBeDefined();
    expect(screen.getByTestId('mockWorkflowLink')).toBeDefined();
  });

  it('returns null for unknown destination types', () => {
    const { container } = render(
      <DestinationRow destination={{ type: 'unknown' as any, id: 'x' }} />
    );

    expect(container.innerHTML).toBe('');
  });
});
