/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';

import { renderWithTestingProviders } from '../../common/mock';
import { basicCase } from '../../containers/mock';
import { ApplyTemplateModal } from './apply_template_modal';

const mockChangeAppliedTemplate = jest.fn();
jest.mock('../case_view/use_change_applied_template', () => ({
  useChangeAppliedTemplate: () => ({
    mutate: mockChangeAppliedTemplate,
    isLoading: false,
  }),
}));

const mockUseGetTemplates = jest.fn();
jest.mock('../templates_v2/hooks/use_get_templates', () => ({
  useGetTemplates: (...args: unknown[]) => mockUseGetTemplates(...args),
}));

const mockUseGetTemplate = jest.fn();
jest.mock('../templates_v2/hooks/use_get_template', () => ({
  useGetTemplate: (...args: unknown[]) => mockUseGetTemplate(...args),
}));

const mockOnClose = jest.fn();

const mockTemplatesData = {
  templates: [
    { templateId: 'tmpl-1', name: 'Security Template', templateVersion: 3 },
    { templateId: 'tmpl-2', name: 'Observability Template', templateVersion: 1 },
  ],
};

const mockParsedTemplate = {
  templateId: 'tmpl-1',
  name: 'Security Template',
  templateVersion: 3,
  owner: 'securitySolution',
  deletedAt: null,
  isLatest: true,
  latestVersion: 3,
  definition: {
    name: 'Security Template',
    fields: [
      { name: 'priority', type: 'keyword', control: 'INPUT_TEXT', metadata: { default: 'low' } },
    ],
    connector: {
      type: '.jira',
      id: 'jira-1',
      fields: { issueType: '10006', priority: null, parent: null },
    },
    settings: { syncAlerts: true },
  },
};

const defaultProps = {
  caseData: basicCase,
  onClose: mockOnClose,
};

describe('ApplyTemplateModal', () => {
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
    mockUseGetTemplate.mockReturnValue({ data: undefined, isFetching: false });
  });

  it('renders the modal title', () => {
    renderWithTestingProviders(<ApplyTemplateModal {...defaultProps} />);

    expect(screen.getByText('Apply template')).toBeInTheDocument();
  });

  it('renders the template selector', () => {
    renderWithTestingProviders(<ApplyTemplateModal {...defaultProps} />);

    expect(screen.getByTestId('apply-template-modal-select')).toBeInTheDocument();
  });

  it('renders a loading skeleton while template list is loading', () => {
    mockUseGetTemplates.mockReturnValue({ data: undefined, isLoading: true });

    renderWithTestingProviders(<ApplyTemplateModal {...defaultProps} />);

    expect(screen.queryByTestId('apply-template-modal-select')).not.toBeInTheDocument();
  });

  it('Apply button is disabled when no template is selected', () => {
    renderWithTestingProviders(<ApplyTemplateModal {...defaultProps} />);

    expect(screen.getByTestId('apply-template-modal-apply')).toBeDisabled();
  });

  it('Apply button is disabled while fetching the template definition', () => {
    // Pre-select via caseData so selectedTemplateId is already set,
    // then simulate the definition still loading.
    const caseWithTemplate = { ...basicCase, template: { id: 'tmpl-1', version: 3 } };
    mockUseGetTemplate.mockReturnValue({ data: undefined, isFetching: true });

    renderWithTestingProviders(
      <ApplyTemplateModal {...defaultProps} caseData={caseWithTemplate} />
    );

    expect(screen.getByTestId('apply-template-modal-apply')).toBeDisabled();
  });

  it('Apply button is enabled when a template is selected and its definition is loaded', async () => {
    mockUseGetTemplate.mockReturnValue({ data: mockParsedTemplate, isFetching: false });

    renderWithTestingProviders(<ApplyTemplateModal {...defaultProps} />);

    const combobox = screen.getByTestId('apply-template-modal-select');
    const input = within(combobox).getByRole('combobox');
    await user.click(input);

    await waitFor(() => {
      expect(screen.getByText('Security Template')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Security Template'));

    expect(screen.getByTestId('apply-template-modal-apply')).not.toBeDisabled();
  });

  it('renders a notice that the connector will not be changed', () => {
    renderWithTestingProviders(<ApplyTemplateModal {...defaultProps} />);

    expect(screen.getByTestId('apply-template-modal-connector-notice')).toBeInTheDocument();
    expect(
      screen.getByText("Applying a template does not change this case's connector.")
    ).toBeInTheDocument();
  });

  it('calls changeAppliedTemplate without a connector when Apply is clicked', async () => {
    mockUseGetTemplate.mockReturnValue({ data: mockParsedTemplate, isFetching: false });

    renderWithTestingProviders(<ApplyTemplateModal {...defaultProps} />);

    const combobox = screen.getByTestId('apply-template-modal-select');
    const input = within(combobox).getByRole('combobox');
    await user.click(input);

    await waitFor(() => {
      expect(screen.getByText('Security Template')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Security Template'));
    await user.click(screen.getByTestId('apply-template-modal-apply'));

    expect(mockChangeAppliedTemplate).toHaveBeenCalledWith(
      {
        caseData: basicCase,
        newTemplate: {
          id: 'tmpl-1',
          version: 3,
          fields: mockParsedTemplate.definition.fields,
          settings: mockParsedTemplate.definition.settings,
        },
      },
      expect.objectContaining({ onSuccess: mockOnClose })
    );
    // Applying a template must never reassign the case's connector.
    expect(mockChangeAppliedTemplate.mock.calls[0][0].newTemplate).not.toHaveProperty('connector');
  });

  it('calls onClose when Cancel is clicked', async () => {
    renderWithTestingProviders(<ApplyTemplateModal {...defaultProps} />);

    await user.click(screen.getByTestId('apply-template-modal-cancel'));

    expect(mockOnClose).toHaveBeenCalled();
  });

  describe('pre-selection', () => {
    it('pre-selects the currently applied template', () => {
      const caseWithTemplate = {
        ...basicCase,
        template: { id: 'tmpl-1', version: 3 },
      };

      mockUseGetTemplate.mockReturnValue({ data: mockParsedTemplate, isFetching: false });

      renderWithTestingProviders(
        <ApplyTemplateModal {...defaultProps} caseData={caseWithTemplate} />
      );

      expect(mockUseGetTemplate).toHaveBeenCalledWith('tmpl-1');
    });

    it('does not pre-select a template when none is applied', () => {
      renderWithTestingProviders(<ApplyTemplateModal {...defaultProps} />);

      expect(mockUseGetTemplate).toHaveBeenCalledWith(undefined);
    });
  });
});
