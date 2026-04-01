/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplatePreviewPanel } from './template_preview_panel';
import type { ParsedTemplateEntry } from '../hooks/use_parse_yaml';
import { TemplateFieldRenderer } from '../field_types/field_renderer';

jest.mock('../field_types/field_renderer', () => ({
  TemplateFieldRenderer: jest.fn(() => <div data-test-subj="template-field-renderer" />),
}));

describe('TemplatePreviewPanel', () => {
  const mockOnClose = jest.fn();
  let mockFlyoutRef: React.RefObject<HTMLDivElement>;

  const mockTemplate: ParsedTemplateEntry = {
    name: 'Test Template',
    description: 'Test description',
    category: 'Security',
    tags: ['tag1', 'tag2'],
    severity: 'high',
    owner: 'test-owner',
    sourceFileName: 'test.yaml',
    documentIndex: 0,
    existsOnServer: false,
    definition: {
      fields: [
        { name: 'field1', control: 'INPUT_TEXT', type: 'keyword' },
        { name: 'field2', control: 'INPUT_TEXT', type: 'keyword' },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const mockElement = document.createElement('div');
    mockElement.getBoundingClientRect = jest.fn(() => ({
      top: 100,
      left: 500,
      right: 800,
      bottom: 600,
      width: 300,
      height: 500,
      x: 500,
      y: 100,
      toJSON: () => ({}),
    }));
    mockFlyoutRef = { current: mockElement };
  });

  it('renders the preview panel', () => {
    render(
      <TemplatePreviewPanel
        template={mockTemplate}
        onClose={mockOnClose}
        flyoutRef={mockFlyoutRef}
      />
    );

    expect(screen.getByTestId('template-preview-panel')).toBeInTheDocument();
  });

  it('displays template name', () => {
    render(
      <TemplatePreviewPanel
        template={mockTemplate}
        onClose={mockOnClose}
        flyoutRef={mockFlyoutRef}
      />
    );

    expect(screen.getByText('Test Template')).toBeInTheDocument();
  });

  it('displays template tags', () => {
    render(
      <TemplatePreviewPanel
        template={mockTemplate}
        onClose={mockOnClose}
        flyoutRef={mockFlyoutRef}
      />
    );

    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
  });

  it('displays template metadata', () => {
    render(
      <TemplatePreviewPanel
        template={mockTemplate}
        onClose={mockOnClose}
        flyoutRef={mockFlyoutRef}
      />
    );

    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('test-owner')).toBeInTheDocument();
  });

  it('renders field renderer when fields are present', () => {
    render(
      <TemplatePreviewPanel
        template={mockTemplate}
        onClose={mockOnClose}
        flyoutRef={mockFlyoutRef}
      />
    );

    expect(screen.getByTestId('template-field-renderer')).toBeInTheDocument();
    expect(TemplateFieldRenderer).toHaveBeenCalledWith(
      expect.objectContaining({
        parsedTemplate: expect.objectContaining({
          name: 'Test Template',
          fields: expect.any(Array),
        }),
      }),
      expect.any(Object)
    );
  });

  it('does not render field renderer when no fields', () => {
    const templateWithoutFields = {
      ...mockTemplate,
      definition: undefined,
    };

    render(
      <TemplatePreviewPanel
        template={templateWithoutFields}
        onClose={mockOnClose}
        flyoutRef={mockFlyoutRef}
      />
    );

    expect(screen.queryByTestId('template-field-renderer')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    render(
      <TemplatePreviewPanel
        template={mockTemplate}
        onClose={mockOnClose}
        flyoutRef={mockFlyoutRef}
      />
    );

    await userEvent.click(screen.getByTestId('template-preview-close'));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('handles template without tags', () => {
    const templateWithoutTags = {
      ...mockTemplate,
      tags: undefined,
    };

    render(
      <TemplatePreviewPanel
        template={templateWithoutTags}
        onClose={mockOnClose}
        flyoutRef={mockFlyoutRef}
      />
    );

    expect(screen.getByText('Test Template')).toBeInTheDocument();
    expect(screen.queryByText('tag1')).not.toBeInTheDocument();
  });

  it('handles template with empty tags array', () => {
    const templateWithEmptyTags = {
      ...mockTemplate,
      tags: [],
    };

    render(
      <TemplatePreviewPanel
        template={templateWithEmptyTags}
        onClose={mockOnClose}
        flyoutRef={mockFlyoutRef}
      />
    );

    expect(screen.getByText('Test Template')).toBeInTheDocument();
    expect(screen.queryByText('tag1')).not.toBeInTheDocument();
  });

  it('handles template without optional metadata', () => {
    const minimalTemplate: ParsedTemplateEntry = {
      name: 'Minimal Template',
      sourceFileName: 'minimal.yaml',
      documentIndex: 0,
      existsOnServer: false,
    };

    render(
      <TemplatePreviewPanel
        template={minimalTemplate}
        onClose={mockOnClose}
        flyoutRef={mockFlyoutRef}
      />
    );

    expect(screen.getByText('Minimal Template')).toBeInTheDocument();
  });

  it('returns null when flyout rect is not available', () => {
    const emptyRef = { current: null };

    render(
      <TemplatePreviewPanel template={mockTemplate} onClose={mockOnClose} flyoutRef={emptyRef} />
    );

    expect(screen.queryByTestId('template-preview-panel')).not.toBeInTheDocument();
  });

  it('updates position on window resize', () => {
    render(
      <TemplatePreviewPanel
        template={mockTemplate}
        onClose={mockOnClose}
        flyoutRef={mockFlyoutRef}
      />
    );

    expect(screen.getByTestId('template-preview-panel')).toBeInTheDocument();

    window.dispatchEvent(new Event('resize'));

    expect(screen.getByTestId('template-preview-panel')).toBeInTheDocument();
  });
});
