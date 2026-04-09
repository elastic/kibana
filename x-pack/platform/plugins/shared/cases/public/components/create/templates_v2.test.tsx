/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';

import { TemplateSelectorComponent } from './templates_v2';
import { renderWithTestingProviders } from '../../common/mock';

const mockSetFieldValue = jest.fn();
jest.mock('@kbn/es-ui-shared-plugin/static/forms/hook_form_lib', () => ({
  ...jest.requireActual('@kbn/es-ui-shared-plugin/static/forms/hook_form_lib'),
  useFormContext: () => ({ setFieldValue: mockSetFieldValue }),
  UseField: ({ path }: { path: string }) => (
    <input type="hidden" data-test-subj={`field-${path}`} />
  ),
}));

const mockUseGetTemplates = jest.fn();
jest.mock('../templates_v2/hooks/use_get_templates', () => ({
  useGetTemplates: (...args: unknown[]) => mockUseGetTemplates(...args),
}));

const mockTemplatesData = {
  templates: [
    { templateId: 'tmpl-1', name: 'Security Template', templateVersion: 3 },
    { templateId: 'tmpl-2', name: 'Observability Template', templateVersion: 1 },
  ],
  page: 1,
  perPage: 10000,
  total: 2,
};

describe('TemplateSelectorComponent', () => {
  let user: UserEvent;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime, pointerEventsCheck: 0 });
    mockUseGetTemplates.mockReturnValue({ data: mockTemplatesData, isLoading: false });
  });

  it('renders the template label and help text', () => {
    renderWithTestingProviders(<TemplateSelectorComponent isLoading={false} />);

    expect(screen.getByText('Template name')).toBeInTheDocument();
    expect(
      screen.getByText('Select a template to use its default field values.')
    ).toBeInTheDocument();
  });

  it('renders a combobox with template options including None', () => {
    renderWithTestingProviders(<TemplateSelectorComponent isLoading={false} />);

    expect(screen.getByTestId('create-case-template-select')).toBeInTheDocument();
  });

  it('renders a loading skeleton when templates are loading', () => {
    mockUseGetTemplates.mockReturnValue({ data: undefined, isLoading: true });

    renderWithTestingProviders(<TemplateSelectorComponent isLoading={false} />);

    expect(screen.queryByTestId('create-case-template-select')).not.toBeInTheDocument();
  });

  it('sets templateId and templateVersion on the form when a template is selected', async () => {
    renderWithTestingProviders(<TemplateSelectorComponent isLoading={false} />);

    const combobox = screen.getByTestId('create-case-template-select');
    const input = within(combobox).getByRole('combobox');
    await user.click(input);

    await waitFor(() => {
      expect(screen.getByText('Security Template')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Security Template'));

    expect(mockSetFieldValue).toHaveBeenCalledWith('templateId', 'tmpl-1');
    expect(mockSetFieldValue).toHaveBeenCalledWith('templateVersion', 3);
  });

  it('clears templateId and templateVersion when None is selected', async () => {
    renderWithTestingProviders(<TemplateSelectorComponent isLoading={false} />);

    const combobox = screen.getByTestId('create-case-template-select');
    const input = within(combobox).getByRole('combobox');
    await user.click(input);

    await waitFor(() => {
      expect(screen.getByText('None')).toBeInTheDocument();
    });

    await user.click(screen.getByText('None'));

    expect(mockSetFieldValue).toHaveBeenCalledWith('templateId', '');
    expect(mockSetFieldValue).toHaveBeenCalledWith('templateVersion', '');
  });

  it('renders hidden fields for templateId and templateVersion', () => {
    renderWithTestingProviders(<TemplateSelectorComponent isLoading={false} />);

    expect(screen.getByTestId('field-templateId')).toBeInTheDocument();
    expect(screen.getByTestId('field-templateVersion')).toBeInTheDocument();
  });

  it('adds euiComboBox-isDisabled class when isLoading is true', () => {
    renderWithTestingProviders(<TemplateSelectorComponent isLoading />);

    const combobox = screen.getByTestId('create-case-template-select');
    expect(combobox).toHaveClass('euiComboBox-isDisabled');
  });

  it('adds euiComboBox-isDisabled class when isDisabled is true', () => {
    renderWithTestingProviders(<TemplateSelectorComponent isLoading={false} isDisabled />);

    const combobox = screen.getByTestId('create-case-template-select');
    expect(combobox).toHaveClass('euiComboBox-isDisabled');
  });
});
