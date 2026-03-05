/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { EuiStepsHorizontalProps } from '@elastic/eui';
import { TemplateFlyoutHeader } from './template_flyout_header';

describe('TemplateFlyoutHeader', () => {
  const mockSteps: EuiStepsHorizontalProps['steps'] = [
    { title: 'Upload', status: 'complete' },
    { title: 'Select', status: 'current' },
  ];

  it('renders the header with title', () => {
    render(<TemplateFlyoutHeader steps={mockSteps} />);

    expect(screen.getByTestId('template-flyout-header')).toBeInTheDocument();
    expect(screen.getByText('Import template')).toBeInTheDocument();
  });

  it('renders the description text', () => {
    render(<TemplateFlyoutHeader steps={mockSteps} />);

    expect(screen.getByText('Requires YAML format upload')).toBeInTheDocument();
  });

  it('renders the horizontal steps', () => {
    render(<TemplateFlyoutHeader steps={mockSteps} />);

    expect(screen.getByTestId('template-flyout-steps')).toBeInTheDocument();
  });

  it('renders with empty steps array', () => {
    render(<TemplateFlyoutHeader steps={[]} />);

    expect(screen.getByTestId('template-flyout-header')).toBeInTheDocument();
    expect(screen.getByTestId('template-flyout-steps')).toBeInTheDocument();
  });

  it('renders with multiple steps', () => {
    const multipleSteps: EuiStepsHorizontalProps['steps'] = [
      { title: 'Step 1', status: 'complete' },
      { title: 'Step 2', status: 'current' },
      { title: 'Step 3', status: 'incomplete' },
    ];

    render(<TemplateFlyoutHeader steps={multipleSteps} />);

    expect(screen.getByTestId('template-flyout-steps')).toBeInTheDocument();
  });
});
