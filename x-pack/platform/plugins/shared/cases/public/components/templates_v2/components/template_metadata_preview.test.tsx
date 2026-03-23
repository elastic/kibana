/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { TemplateMetadataPreviewProps } from './template_metadata_preview';
import { TemplateMetadataPreview } from './template_metadata_preview';

jest.mock('../../severity/config', () => ({
  SeverityHealth: ({ severity }: { severity: string }) => (
    <span data-test-subj="severity-health">{severity}</span>
  ),
}));

const defaultProps: TemplateMetadataPreviewProps = {
  parsedTemplate: {
    name: 'Test Template',
    fields: [],
  },
};

const renderComponent = (props: Partial<TemplateMetadataPreviewProps> = {}) =>
  render(<TemplateMetadataPreview {...defaultProps} {...props} />);

describe('TemplateMetadataPreview', () => {
  it('renders the template name', () => {
    renderComponent();

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Test Template')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    renderComponent({
      parsedTemplate: {
        name: 'Test',
        description: 'A test description',
        fields: [],
      },
    });

    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('A test description')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    renderComponent();

    expect(screen.queryByText('Description')).not.toBeInTheDocument();
  });

  it('renders severity when provided', () => {
    renderComponent({
      parsedTemplate: {
        name: 'Test',
        severity: 'high',
        fields: [],
      },
    });

    expect(screen.getByText('Severity')).toBeInTheDocument();
    expect(screen.getByTestId('severity-health')).toHaveTextContent('high');
  });

  it('does not render severity when not provided', () => {
    renderComponent();

    expect(screen.queryByText('Severity')).not.toBeInTheDocument();
  });

  it('renders category when provided', () => {
    renderComponent({
      parsedTemplate: {
        name: 'Test',
        category: 'Security',
        fields: [],
      },
    });

    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  it('does not render category when not provided', () => {
    renderComponent();

    expect(screen.queryByText('Category')).not.toBeInTheDocument();
  });

  it('renders tags when provided', () => {
    renderComponent({
      parsedTemplate: {
        name: 'Test',
        tags: ['tag-one', 'tag-two'],
        fields: [],
      },
    });

    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByTestId('template-column-tag-tag-one')).toHaveTextContent('tag-one');
    expect(screen.getByTestId('template-column-tag-tag-two')).toHaveTextContent('tag-two');
  });

  it('does not render tags when the array is empty', () => {
    renderComponent({
      parsedTemplate: {
        name: 'Test',
        tags: [],
        fields: [],
      },
    });

    expect(screen.queryByText('Tags')).not.toBeInTheDocument();
  });

  it('does not render tags when not provided', () => {
    renderComponent();

    expect(screen.queryByText('Tags')).not.toBeInTheDocument();
  });

  it('renders all metadata fields together', () => {
    renderComponent({
      parsedTemplate: {
        name: 'Full Template',
        description: 'Complete description',
        severity: 'critical',
        category: 'Observability',
        tags: ['alpha', 'beta'],
        fields: [],
      },
    });

    expect(screen.getByText('Full Template')).toBeInTheDocument();
    expect(screen.getByText('Complete description')).toBeInTheDocument();
    expect(screen.getByTestId('severity-health')).toHaveTextContent('critical');
    expect(screen.getByText('Observability')).toBeInTheDocument();
    expect(screen.getByTestId('template-column-tag-alpha')).toBeInTheDocument();
    expect(screen.getByTestId('template-column-tag-beta')).toBeInTheDocument();
  });
});
