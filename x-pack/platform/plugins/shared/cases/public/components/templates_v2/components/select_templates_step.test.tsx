/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelectTemplatesStep } from './select_templates_step';
import type { ParsedTemplateEntry, ParseYamlError } from '../hooks/use_parse_yaml';

describe('SelectTemplatesStep', () => {
  const mockOnSelectionChange = jest.fn();
  const mockOnRowClick = jest.fn();

  const mockNewTemplate: ParsedTemplateEntry = {
    name: 'New Template',
    description: 'A new template description',
    category: 'Security',
    tags: ['tag1', 'tag2'],
    severity: 'high',
    sourceFileName: 'template1.yaml',
    documentIndex: 0,
    existsOnServer: false,
    definition: {
      fields: [
        { name: 'field1', control: 'INPUT_TEXT', type: 'keyword' },
        { name: 'field2', control: 'INPUT_TEXT', type: 'keyword' },
      ],
    },
  };

  const mockOverlappingTemplate: ParsedTemplateEntry = {
    name: 'Overlapping Template',
    description: 'An overlapping template',
    category: 'Operations',
    tags: ['tag3'],
    severity: 'medium',
    sourceFileName: 'template2.yaml',
    documentIndex: 0,
    existsOnServer: true,
    definition: {
      fields: [{ name: 'field3', control: 'INPUT_TEXT', type: 'keyword' }],
    },
  };

  const mockError: ParseYamlError = {
    fileName: 'error.yaml',
    documentIndex: 0,
    message: 'Failed to parse YAML',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no templates and no errors', () => {
    render(
      <SelectTemplatesStep
        templates={[]}
        errors={[]}
        onSelectionChange={mockOnSelectionChange}
        onRowClick={mockOnRowClick}
      />
    );

    expect(screen.getByTestId('template-flyout-no-templates')).toBeInTheDocument();
  });

  it('renders parse errors when present', () => {
    render(
      <SelectTemplatesStep
        templates={[]}
        errors={[mockError]}
        onSelectionChange={mockOnSelectionChange}
        onRowClick={mockOnRowClick}
      />
    );

    expect(screen.getByTestId('template-flyout-parse-errors')).toBeInTheDocument();
    expect(screen.getByText('Failed to parse YAML')).toBeInTheDocument();
  });

  it('renders new templates accordion when new templates exist', () => {
    render(
      <SelectTemplatesStep
        templates={[mockNewTemplate]}
        errors={[]}
        onSelectionChange={mockOnSelectionChange}
        onRowClick={mockOnRowClick}
      />
    );

    expect(screen.getByTestId('template-flyout-new-templates')).toBeInTheDocument();
    expect(screen.getByText('New Template')).toBeInTheDocument();
  });

  it('renders overlapping templates accordion when overlapping templates exist', () => {
    render(
      <SelectTemplatesStep
        templates={[mockOverlappingTemplate]}
        errors={[]}
        onSelectionChange={mockOnSelectionChange}
        onRowClick={mockOnRowClick}
      />
    );

    expect(screen.getByTestId('template-flyout-overlapping-templates')).toBeInTheDocument();
    expect(screen.getByText('Overlapping Template')).toBeInTheDocument();
  });

  it('renders both accordions when both new and overlapping templates exist', () => {
    render(
      <SelectTemplatesStep
        templates={[mockNewTemplate, mockOverlappingTemplate]}
        errors={[]}
        onSelectionChange={mockOnSelectionChange}
        onRowClick={mockOnRowClick}
      />
    );

    expect(screen.getByTestId('template-flyout-new-templates')).toBeInTheDocument();
    expect(screen.getByTestId('template-flyout-overlapping-templates')).toBeInTheDocument();
  });

  it('displays template details in columns', () => {
    render(
      <SelectTemplatesStep
        templates={[mockNewTemplate]}
        errors={[]}
        onSelectionChange={mockOnSelectionChange}
        onRowClick={mockOnRowClick}
      />
    );

    expect(screen.getByText('New Template')).toBeInTheDocument();
    expect(screen.getByText('A new template description')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
  });

  it('truncates long template names with tooltip', () => {
    const longNameTemplate = {
      ...mockNewTemplate,
      name: 'This is a very long template name that should be truncated',
    };

    render(
      <SelectTemplatesStep
        templates={[longNameTemplate]}
        errors={[]}
        onSelectionChange={mockOnSelectionChange}
        onRowClick={mockOnRowClick}
      />
    );

    expect(screen.getByText(/This is a very long template name that/)).toBeInTheDocument();
  });

  it('truncates long descriptions with tooltip', () => {
    const longDescTemplate = {
      ...mockNewTemplate,
      description:
        'This is a very long description that should be truncated after fifty characters',
    };

    render(
      <SelectTemplatesStep
        templates={[longDescTemplate]}
        errors={[]}
        onSelectionChange={mockOnSelectionChange}
        onRowClick={mockOnRowClick}
      />
    );

    expect(screen.getByText(/This is a very long description that should be/)).toBeInTheDocument();
  });

  it('displays field count with tooltip showing field names', () => {
    render(
      <SelectTemplatesStep
        templates={[mockNewTemplate]}
        errors={[]}
        onSelectionChange={mockOnSelectionChange}
        onRowClick={mockOnRowClick}
      />
    );

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('displays tags with +N badge when more than 3 tags', () => {
    const manyTagsTemplate = {
      ...mockNewTemplate,
      tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
    };

    render(
      <SelectTemplatesStep
        templates={[manyTagsTemplate]}
        errors={[]}
        onSelectionChange={mockOnSelectionChange}
        onRowClick={mockOnRowClick}
      />
    );

    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
    expect(screen.getByText('tag3')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('calls onRowClick when template name is clicked', async () => {
    render(
      <SelectTemplatesStep
        templates={[mockNewTemplate]}
        errors={[]}
        onSelectionChange={mockOnSelectionChange}
        onRowClick={mockOnRowClick}
      />
    );

    await userEvent.click(screen.getByText('New Template'));

    expect(mockOnRowClick).toHaveBeenCalledWith(mockNewTemplate);
  });

  it('calls onSelectionChange when templates are selected', async () => {
    render(
      <SelectTemplatesStep
        templates={[mockNewTemplate]}
        errors={[]}
        onSelectionChange={mockOnSelectionChange}
        onRowClick={mockOnRowClick}
      />
    );

    const checkbox = screen.getAllByRole('checkbox')[1];
    await userEvent.click(checkbox);

    expect(mockOnSelectionChange).toHaveBeenCalled();
  });

  it('handles templates without optional fields', () => {
    const minimalTemplate: ParsedTemplateEntry = {
      name: 'Minimal',
      sourceFileName: 'minimal.yaml',
      documentIndex: 0,
      existsOnServer: false,
    };

    render(
      <SelectTemplatesStep
        templates={[minimalTemplate]}
        errors={[]}
        onSelectionChange={mockOnSelectionChange}
        onRowClick={mockOnRowClick}
      />
    );

    expect(screen.getByText('Minimal')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('combines selections from both new and overlapping templates', async () => {
    render(
      <SelectTemplatesStep
        templates={[mockNewTemplate, mockOverlappingTemplate]}
        errors={[]}
        onSelectionChange={mockOnSelectionChange}
        onRowClick={mockOnRowClick}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[1]);

    expect(mockOnSelectionChange).toHaveBeenCalled();
  });

  it('renders without crashing when callbacks are not provided', () => {
    render(<SelectTemplatesStep templates={[mockNewTemplate]} errors={[]} />);

    expect(screen.getByText('New Template')).toBeInTheDocument();
  });
});
