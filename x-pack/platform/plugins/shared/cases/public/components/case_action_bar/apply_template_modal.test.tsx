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

const mockApplyTemplate = jest.fn();
const mockConfirmConnectorChange = jest.fn();
const mockCancelConnectorChange = jest.fn();
const mockGuard = jest.fn();
jest.mock('../case_view/use_apply_template_connector_guard', () => ({
  useApplyTemplateConnectorGuard: () => mockGuard(),
}));

const defaultGuardReturn = {
  applyTemplate: mockApplyTemplate,
  pendingConnectorChange: null,
  confirmConnectorChange: mockConfirmConnectorChange,
  cancelConnectorChange: mockCancelConnectorChange,
  isInitializing: false,
  isApplying: false,
};

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
    mockGuard.mockReturnValue(defaultGuardReturn);
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

  it('calls applyTemplate with the correct arguments when Apply is clicked', async () => {
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

    expect(mockApplyTemplate).toHaveBeenCalledWith(
      {
        id: 'tmpl-1',
        version: 3,
        fields: mockParsedTemplate.definition.fields,
        connector: mockParsedTemplate.definition.connector,
        settings: mockParsedTemplate.definition.settings,
      },
      expect.objectContaining({ onSuccess: mockOnClose })
    );
  });

  it('disables Apply while the connector guard is initializing', () => {
    mockUseGetTemplate.mockReturnValue({ data: mockParsedTemplate, isFetching: false });
    mockGuard.mockReturnValue({ ...defaultGuardReturn, isInitializing: true });

    const caseWithTemplate = { ...basicCase, template: { id: 'tmpl-1', version: 3 } };
    renderWithTestingProviders(
      <ApplyTemplateModal {...defaultProps} caseData={caseWithTemplate} />
    );

    expect(screen.getByTestId('apply-template-modal-apply')).toBeDisabled();
  });

  it('renders the connector-change confirmation modal when a change is pending', () => {
    mockGuard.mockReturnValue({
      ...defaultGuardReturn,
      pendingConnectorChange: {
        currentConnectorName: 'My SN connector',
        nextConnectorName: 'My Jira',
      },
    });

    renderWithTestingProviders(<ApplyTemplateModal {...defaultProps} />);

    expect(screen.getByTestId('template-connector-change-modal')).toBeInTheDocument();
    // The base apply modal is replaced by the confirmation modal.
    expect(screen.queryByTestId('apply-template-modal-select')).not.toBeInTheDocument();
  });

  it('confirms and cancels the pending connector change', async () => {
    mockGuard.mockReturnValue({
      ...defaultGuardReturn,
      pendingConnectorChange: {
        currentConnectorName: 'My SN connector',
        nextConnectorName: 'My Jira',
      },
    });

    renderWithTestingProviders(<ApplyTemplateModal {...defaultProps} />);

    await user.click(screen.getByText('Change to My Jira'));
    expect(mockConfirmConnectorChange).toHaveBeenCalled();

    await user.click(screen.getByText('Keep My SN connector'));
    expect(mockCancelConnectorChange).toHaveBeenCalled();
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
