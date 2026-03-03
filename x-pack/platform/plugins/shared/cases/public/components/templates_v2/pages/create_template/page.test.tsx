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
  TemplateYamlEditor: () => <div data-test-subj="template-yaml-editor" />,
}));

jest.mock('../../components/template_preview', () => ({
  TemplatePreview: () => <div data-test-subj="create-template-preview" />,
}));

jest.mock('../../hooks/use_create_template', () => ({
  useCreateTemplate: () => ({ mutateAsync: jest.fn(), isLoading: false }),
}));

describe('CreateTemplatePage', () => {
  it('renders the layout with header and sections', () => {
    render(
      <TestProviders>
        <CreateTemplatePage />
      </TestProviders>
    );

    expect(screen.getByText(i18n.ADD_TEMPLATE_TITLE)).toBeInTheDocument();
    expect(screen.getByText(i18n.BACK_TO_TEMPLATES)).toBeInTheDocument();
    expect(screen.getByTestId('saveTemplateHeaderButton')).toBeInTheDocument();
    expect(screen.getByTestId('template-yaml-editor')).toBeInTheDocument();
    expect(screen.getByTestId('create-template-preview')).toBeInTheDocument();
  });
});
