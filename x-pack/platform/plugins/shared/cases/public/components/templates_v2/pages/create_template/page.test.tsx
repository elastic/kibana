/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { CreateTemplatePage } from './page';
import { TestProviders } from '../../../../common/mock';
import * as i18n from '../../translations';

jest.mock('../../components/template_form', () => ({
  CreateTemplateForm: () => <div data-test-subj="create-template-form" />,
}));

jest.mock('../../components/template_preview', () => ({
  TemplatePreview: () => <div data-test-subj="create-template-preview" />,
}));

describe('CreateTemplatePage', () => {
  it('renders the layout copy and sections', () => {
    render(
      <TestProviders>
        <CreateTemplatePage />
      </TestProviders>
    );

    expect(screen.getByText(i18n.ADD_TEMPLATE_TITLE)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: i18n.YAML_EDITOR_TITLE })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: i18n.INTERACTIVE_EDITOR_TITLE })
    ).toBeInTheDocument();
    expect(screen.getByTestId('create-template-form')).toBeInTheDocument();
    expect(screen.getByTestId('create-template-preview')).toBeInTheDocument();
  });
});
