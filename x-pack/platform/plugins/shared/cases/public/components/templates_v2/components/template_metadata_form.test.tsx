/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTestingProviders } from '../../../common/mock';
import { TemplateMetadataForm } from './template_metadata_form';
import type { TemplateMetadata } from '../utils/template_metadata';

jest.mock('../hooks/use_get_template_tags', () => ({
  useGetTemplateTags: () => ({ data: ['existing-tag'] }),
}));

describe('TemplateMetadataForm', () => {
  const baseMetadata: TemplateMetadata = {
    name: 'My template',
    description: 'A description',
    tags: ['t1'],
  };

  const defaultProps = {
    metadata: baseMetadata,
    errors: {},
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the description and tags inputs with the current values', () => {
    renderWithTestingProviders(<TemplateMetadataForm {...defaultProps} />);

    expect(screen.getByTestId('templateMetadataForm')).toBeInTheDocument();
    expect(screen.getByTestId('templateMetadataDescriptionInput')).toHaveValue('A description');
  });

  it('does not render a name input — the name is edited in the page title', () => {
    renderWithTestingProviders(
      <TemplateMetadataForm
        {...defaultProps}
        metadata={{ ...baseMetadata, name: '' }}
        errors={{ name: 'Template name is required.' }}
      />
    );

    // The name and its error belong to the header's editable title now, so neither should be
    // duplicated here — two places to fix one field is how the original tab-hidden problem started.
    expect(screen.queryByTestId('templateMetadataNameInput')).not.toBeInTheDocument();
    expect(screen.queryByText('Template name is required.')).not.toBeInTheDocument();
  });

  it('adds a newly created tag to the metadata', async () => {
    const onChange = jest.fn();
    renderWithTestingProviders(<TemplateMetadataForm {...defaultProps} onChange={onChange} />);

    const tagsInput = screen.getByTestId('comboBoxSearchInput');
    await userEvent.type(tagsInput, 'new-tag');
    await userEvent.keyboard('{enter}');

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ tags: ['t1', 'new-tag'] }));
  });
});
