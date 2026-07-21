/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import type { TemplateFieldsFormReadyProps } from '../../../../case_view/components/template_fields_form_ready';

import { TemplateSettingsPopover } from './template_settings_popover';
import { renderWithTestingProviders } from '../../../../../common/mock';
import { basicCase } from '../../../../../containers/mock';

const mockUseGetTemplates = jest.fn();
jest.mock('../../../../templates_v2/hooks/use_get_templates', () => ({
  useGetTemplates: (...args: unknown[]) => mockUseGetTemplates(...args),
}));

const mockUseGetTemplate = jest.fn();
jest.mock('../../../../templates_v2/hooks/use_get_template', () => ({
  useGetTemplate: (...args: unknown[]) => mockUseGetTemplate(...args),
}));

const mockMutate = jest.fn();
jest.mock('../../../../case_view/use_change_applied_template', () => ({
  useChangeAppliedTemplate: () => ({ mutate: mockMutate, isLoading: false }),
}));

const mockUseTemplateNonGlobalFields = jest.fn();
jest.mock('../../../../templates_v2/hooks/use_template_non_global_fields', () => ({
  useTemplateNonGlobalFields: (...args: unknown[]) => mockUseTemplateNonGlobalFields(...args),
}));

const mockFormApiTrigger = jest.fn();
const mockFormApiGetValues = jest.fn();
const mockTemplateFieldsFormReady = jest.fn();
jest.mock('../../../../case_view/components/template_fields_form_ready', () => ({
  EMPTY_EXTENDED_FIELDS: {},
  TemplateFieldsFormReady: (...args: unknown[]) => mockTemplateFieldsFormReady(...args),
}));

const appliedTemplate = {
  templateId: 'template-1',
  name: 'Security Template',
  templateVersion: 1,
  fieldDefinitions: [
    { name: 'priority', label: 'Priority', type: 'keyword', control: 'INPUT_TEXT' },
  ],
};

const otherTemplate = {
  templateId: 'template-2',
  name: 'Observability Template',
  templateVersion: 1,
  fieldDefinitions: [
    { name: 'severity', label: 'Severity', type: 'keyword', control: 'INPUT_TEXT' },
  ],
};

const appliedParsedTemplate = {
  ...appliedTemplate,
  owner: 'securitySolution',
  deletedAt: null,
  isLatest: true,
  latestVersion: 1,
  definition: { name: appliedTemplate.name, fields: [{ name: 'priority', control: 'INPUT_TEXT' }] },
};

const otherParsedTemplate = {
  ...otherTemplate,
  owner: 'securitySolution',
  deletedAt: null,
  isLatest: true,
  latestVersion: 1,
  definition: { name: otherTemplate.name, fields: [{ name: 'severity', control: 'INPUT_TEXT' }] },
};

const mockTemplatesList = { templates: [appliedTemplate, otherTemplate] };

const caseWithTemplate = {
  ...basicCase,
  template: { id: appliedTemplate.templateId, version: appliedTemplate.templateVersion },
};

describe('TemplateSettingsPopover', () => {
  const defaultProps = {
    caseData: basicCase,
  };

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

    mockUseGetTemplates.mockReturnValue({ data: mockTemplatesList, isLoading: false });
    mockUseGetTemplate.mockReturnValue({ data: undefined, isFetching: false });
    mockUseTemplateNonGlobalFields.mockReturnValue({ resolvedFields: [], isLoading: false });

    mockFormApiTrigger.mockResolvedValue(true);
    mockFormApiGetValues.mockReturnValue({});
    mockTemplateFieldsFormReady.mockImplementation(
      ({ formApiRef }: TemplateFieldsFormReadyProps) => {
        if (formApiRef) {
          formApiRef.current = { trigger: mockFormApiTrigger, getValues: mockFormApiGetValues };
        }
        return <div data-test-subj="template-fields-form" />;
      }
    );
  });

  const openSelector = async () => {
    await user.click(screen.getByTestId('sidebar-template-settings'));
    return screen.findByTestId('sidebar-template-settings-template-select');
  };

  const selectTemplateByName = async (name: string) => {
    const combobox = await openSelector();
    const input = within(combobox).getByRole('combobox');
    await user.click(input);

    await waitFor(() => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });

    await user.click(screen.getByText(name));
  };

  it('renders the settings button', () => {
    renderWithTestingProviders(<TemplateSettingsPopover {...defaultProps} />);

    expect(screen.getByTestId('sidebar-template-settings')).toBeInTheDocument();
  });

  it('does not render the template selector until the button is clicked', () => {
    renderWithTestingProviders(<TemplateSettingsPopover {...defaultProps} />);

    expect(
      screen.queryByTestId('sidebar-template-settings-template-select')
    ).not.toBeInTheDocument();
  });

  it('renders the template selector when the button is clicked', async () => {
    renderWithTestingProviders(<TemplateSettingsPopover {...defaultProps} />);

    expect(await openSelector()).toBeInTheDocument();
  });

  it('supports a custom data-test-subj', () => {
    renderWithTestingProviders(
      <TemplateSettingsPopover {...defaultProps} data-test-subj="custom-template-settings" />
    );

    expect(screen.getByTestId('custom-template-settings')).toBeInTheDocument();
  });

  describe('changing the applied template', () => {
    beforeEach(() => {
      mockUseGetTemplate.mockImplementation((templateId?: string) => {
        if (templateId === appliedTemplate.templateId) {
          return { data: appliedParsedTemplate, isFetching: false };
        }
        if (templateId === otherTemplate.templateId) {
          return { data: otherParsedTemplate, isFetching: false };
        }
        return { data: undefined, isFetching: false };
      });
    });

    it('does not open the confirmation modal when re-selecting the already applied template', async () => {
      renderWithTestingProviders(
        <TemplateSettingsPopover {...defaultProps} caseData={caseWithTemplate} />
      );

      await selectTemplateByName(appliedTemplate.name);

      expect(mockMutate).not.toHaveBeenCalled();
      expect(screen.queryByTestId('confirm-change-template-modal')).not.toBeInTheDocument();
    });

    it('opens a confirmation modal instead of applying immediately when a new template is picked', async () => {
      renderWithTestingProviders(
        <TemplateSettingsPopover {...defaultProps} caseData={caseWithTemplate} />
      );

      await selectTemplateByName(otherTemplate.name);

      expect(mockMutate).not.toHaveBeenCalled();
      const modal = await screen.findByTestId('confirm-change-template-modal');
      expect(modal).toBeInTheDocument();
      // Scope to the modal to avoid false positives from the combobox options still in the DOM
      expect(within(modal).getByText(appliedTemplate.name)).toBeInTheDocument();
      expect(within(modal).getByText(otherTemplate.name)).toBeInTheDocument();
    });

    it('calls changeTemplate with the new template fields when the change is confirmed', async () => {
      renderWithTestingProviders(
        <TemplateSettingsPopover {...defaultProps} caseData={caseWithTemplate} />
      );

      await selectTemplateByName(otherTemplate.name);
      await screen.findByTestId('confirm-change-template-modal');
      await user.click(screen.getByTestId('confirm-change-template-modal-confirm'));

      expect(mockMutate).toHaveBeenCalledWith(
        {
          caseData: caseWithTemplate,
          newTemplate: {
            id: otherTemplate.templateId,
            version: otherTemplate.templateVersion,
            fields: otherParsedTemplate.definition.fields,
          },
        },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
    });

    it('does not call changeTemplate and closes the modal when the change is cancelled', async () => {
      renderWithTestingProviders(
        <TemplateSettingsPopover {...defaultProps} caseData={caseWithTemplate} />
      );

      await selectTemplateByName(otherTemplate.name);
      await screen.findByTestId('confirm-change-template-modal');
      await user.click(screen.getByTestId('confirm-change-template-modal-cancel'));

      expect(mockMutate).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.queryByTestId('confirm-change-template-modal')).not.toBeInTheDocument();
      });
    });

    describe('extended fields validation in the confirm modal', () => {
      const mockResolvedField = {
        name: 'severity',
        type: 'keyword',
        control: 'INPUT_TEXT',
        metadata: { required: true },
      };

      beforeEach(() => {
        mockUseTemplateNonGlobalFields.mockReturnValue({
          resolvedFields: [mockResolvedField],
          isLoading: false,
        });
      });

      it('shows the extended fields form inside the confirm modal', async () => {
        renderWithTestingProviders(
          <TemplateSettingsPopover {...defaultProps} caseData={caseWithTemplate} />
        );

        await selectTemplateByName(otherTemplate.name);
        const modal = await screen.findByTestId('confirm-change-template-modal');

        expect(within(modal).getByTestId('template-fields-form')).toBeInTheDocument();
      });

      it('does not call changeTemplate when form validation fails', async () => {
        mockFormApiTrigger.mockResolvedValue(false);

        renderWithTestingProviders(
          <TemplateSettingsPopover {...defaultProps} caseData={caseWithTemplate} />
        );

        await selectTemplateByName(otherTemplate.name);
        await screen.findByTestId('confirm-change-template-modal');
        await user.click(screen.getByTestId('confirm-change-template-modal-confirm'));

        expect(mockMutate).not.toHaveBeenCalled();
      });

      it('calls changeTemplate with extendedFields when form validation passes', async () => {
        mockFormApiGetValues.mockReturnValue({ severity_keyword: 'critical' });

        renderWithTestingProviders(
          <TemplateSettingsPopover {...defaultProps} caseData={caseWithTemplate} />
        );

        await selectTemplateByName(otherTemplate.name);
        await screen.findByTestId('confirm-change-template-modal');
        await user.click(screen.getByTestId('confirm-change-template-modal-confirm'));

        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            extendedFields: { severity_keyword: 'critical' },
          }),
          expect.objectContaining({ onSuccess: expect.any(Function) })
        );
      });
    });

    it('opens the confirmation modal for removing the template when the selection is cleared', async () => {
      renderWithTestingProviders(
        <TemplateSettingsPopover {...defaultProps} caseData={caseWithTemplate} />
      );

      const combobox = await openSelector();
      await user.click(within(combobox).getByTestId('comboBoxClearButton'));

      expect(mockMutate).not.toHaveBeenCalled();
      expect(await screen.findByTestId('confirm-change-template-modal')).toBeInTheDocument();

      await user.click(screen.getByTestId('confirm-change-template-modal-confirm'));

      expect(mockMutate).toHaveBeenCalledWith(
        { caseData: caseWithTemplate, newTemplate: null },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
    });
  });

  describe('when the applied template is not available', () => {
    const caseWithMissingTemplate = {
      ...basicCase,
      template: { id: 'deleted-template', version: 1 },
    };

    beforeEach(() => {
      // The available (enabled, non-deleted) list does not include the applied template.
      mockUseGetTemplates.mockReturnValue({
        data: { templates: [otherTemplate] },
        isLoading: false,
      });
      // But it can still be resolved (with its stale name) via includeDeleted.
      mockUseGetTemplate.mockReturnValue({
        data: {
          ...appliedParsedTemplate,
          templateId: 'deleted-template',
          name: 'Deleted Template',
          deletedAt: '2024-01-01T00:00:00.000Z',
        },
        isFetching: false,
      });
    });

    it('shows a non-selectable "not found" entry with the stale template name', async () => {
      renderWithTestingProviders(
        <TemplateSettingsPopover {...defaultProps} caseData={caseWithMissingTemplate} />
      );

      const combobox = await openSelector();

      expect(
        screen.getByTestId('sidebar-template-settings-template-not-found-icon')
      ).toBeInTheDocument();
      expect(within(combobox).getByRole('combobox')).toHaveValue('Deleted Template (not found)');
    });

    it('falls back to a generic label when the stale name cannot be resolved', async () => {
      mockUseGetTemplate.mockReturnValue({ data: undefined, isFetching: false });

      renderWithTestingProviders(
        <TemplateSettingsPopover {...defaultProps} caseData={caseWithMissingTemplate} />
      );

      const combobox = await openSelector();

      expect(
        screen.getByTestId('sidebar-template-settings-template-not-found-icon')
      ).toBeInTheDocument();
      expect(within(combobox).getByRole('combobox')).toHaveValue('Template not found');
    });
  });
});
