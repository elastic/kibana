/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { TemplateFormPage } from './template_form_page';
import { renderWithTestingProviders } from '../../../common/mock';

jest.mock('../../../common/navigation/hooks', () => ({
  ...jest.requireActual('../../../common/navigation/hooks'),
  useTemplateViewParams: jest.fn(),
}));

import { useTemplateViewParams } from '../../../common/navigation/hooks';

const useTemplateViewParamsMock = useTemplateViewParams as jest.Mock;

describe('TemplateFormPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders in create mode when no templateId is provided', async () => {
    useTemplateViewParamsMock.mockReturnValue({ templateId: undefined });

    renderWithTestingProviders(<TemplateFormPage />);

    expect(await screen.findByTestId('template-form-page')).toBeInTheDocument();
    expect(screen.getByTestId('create-template-content')).toBeInTheDocument();
    expect(screen.getByText('Create template')).toBeInTheDocument();
  });

  it('renders in edit mode when templateId is provided', async () => {
    useTemplateViewParamsMock.mockReturnValue({ templateId: 'template-123' });

    renderWithTestingProviders(<TemplateFormPage />);

    expect(await screen.findByTestId('template-form-page')).toBeInTheDocument();
    expect(screen.getByTestId('edit-template-content')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Editing template: template-123')).toBeInTheDocument();
  });
});
