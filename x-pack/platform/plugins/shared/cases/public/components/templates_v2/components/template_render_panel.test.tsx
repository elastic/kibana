/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateRenderPanel } from './template_render_panel';

const mockTemplatePreview = jest.fn((_props?: unknown) => <div data-test-subj="mock-preview" />);

jest.mock('./template_preview', () => ({
  TemplatePreview: (props: unknown) => mockTemplatePreview(props),
}));
jest.mock('./template_settings_form', () => ({
  TemplateSettingsForm: () => <div data-test-subj="mock-settings" />,
}));
jest.mock('./template_metadata_form', () => ({
  TemplateMetadataForm: () => <div data-test-subj="mock-metadata-form" />,
}));

describe('TemplateRenderPanel', () => {
  const props = {
    onSettingsChange: jest.fn(),
    onConnectorChange: jest.fn(),
    metadata: { name: 'Template metadata', description: '', tags: [] },
    metadataErrors: {},
    onMetadataChange: jest.fn(),
    onCaseDefaultChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all accordion sections', () => {
    render(<TemplateRenderPanel {...props} />);

    expect(screen.getByTestId('templateRenderMetadataAccordion')).toBeInTheDocument();
    expect(screen.getByTestId('templateRenderFieldsAccordion')).toBeInTheDocument();
    expect(screen.getByTestId('templateRenderSettingsAccordion')).toBeInTheDocument();
    expect(screen.getByTestId('mock-preview')).toBeInTheDocument();
    expect(screen.getByTestId('mock-settings')).toBeInTheDocument();
  });

  it('renders metadata form inside a collapsible accordion', async () => {
    const user = userEvent.setup();
    render(<TemplateRenderPanel {...props} />);

    const accordionButton = screen.getByRole('button', { name: 'Template details' });
    expect(screen.getByTestId('mock-metadata-form')).toBeInTheDocument();
    expect(accordionButton).toHaveAttribute('aria-expanded', 'true');

    await user.click(accordionButton);
    expect(accordionButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders fields and settings accordions expanded by default', () => {
    render(<TemplateRenderPanel {...props} />);

    expect(screen.getByRole('button', { name: 'Fields' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Settings' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('passes case-default change handler to the preview tab', () => {
    render(<TemplateRenderPanel {...props} />);

    expect(mockTemplatePreview).toHaveBeenCalledWith(
      expect.objectContaining({
        onCaseDefaultChange: props.onCaseDefaultChange,
      })
    );
  });
});
