/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithTestingProviders } from '../../common/mock';
import { WorkflowTags } from './workflow_tags';

describe('WorkflowTags', () => {
  it('renders configured tags', () => {
    renderWithTestingProviders(
      <WorkflowTags disabled={false} workflowTags={['Cases']} onChange={jest.fn()} />
    );

    expect(screen.getByTestId('cases-workflow-tags')).toHaveTextContent('Cases');
  });

  it('adds a trimmed, case-sensitive workflow tag', () => {
    const onChange = jest.fn();
    renderWithTestingProviders(
      <WorkflowTags disabled={false} workflowTags={['Cases']} onChange={onChange} />
    );

    const input = screen.getByTestId('comboBoxSearchInput');
    fireEvent.change(input, { target: { value: ' Operations ' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(['Cases', 'Operations']);
  });

  it('does not add duplicate tags', () => {
    const onChange = jest.fn();
    renderWithTestingProviders(
      <WorkflowTags disabled={false} workflowTags={['Cases']} onChange={onChange} />
    );

    const input = screen.getByTestId('comboBoxSearchInput');
    fireEvent.change(input, { target: { value: 'Cases' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
  });
});
