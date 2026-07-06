/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TemplateSettingsPopover } from './template_settings_popover';
import { renderWithTestingProviders } from '../../../../../common/mock';
import { basicCase } from '../../../../../containers/mock';
import { useGetTemplates } from '../../../../templates_v2/hooks/use_get_templates';
import { useChangeAppliedTemplate } from '../../../../case_view/use_change_applied_template';
import { useGetTemplate } from '../../../../templates_v2/hooks/use_get_template';

jest.mock('../../../../templates_v2/hooks/use_get_templates');
jest.mock('../../../../case_view/use_change_applied_template');
jest.mock('../../../../templates_v2/hooks/use_get_template');

(useGetTemplates as jest.Mock).mockReturnValue({
  data: { templates: [] },
  isLoading: false,
});
(useChangeAppliedTemplate as jest.Mock).mockReturnValue({
  mutate: jest.fn(),
});
(useGetTemplate as jest.Mock).mockReturnValue({ data: null });

describe('TemplateSettingsPopover', () => {
  const defaultProps = {
    caseData: basicCase,
    isTemplatesEnabled: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useGetTemplates as jest.Mock).mockReturnValue({
      data: { templates: [] },
      isLoading: false,
    });
    (useChangeAppliedTemplate as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
    });
    (useGetTemplate as jest.Mock).mockReturnValue({ data: null });
  });

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

  it('renders the template selector when templates are enabled and the button is clicked', async () => {
    renderWithTestingProviders(<TemplateSettingsPopover {...defaultProps} />);

    await userEvent.click(screen.getByTestId('sidebar-template-settings'));

    expect(
      await screen.findByTestId('sidebar-template-settings-template-select')
    ).toBeInTheDocument();
  });

  it('does not render the template selector when templates are disabled', async () => {
    renderWithTestingProviders(
      <TemplateSettingsPopover {...defaultProps} isTemplatesEnabled={false} />
    );

    await userEvent.click(screen.getByTestId('sidebar-template-settings'));

    await waitFor(() => {
      expect(screen.getByTestId('sidebar-template-settings-popover')).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId('sidebar-template-settings-template-select')
    ).not.toBeInTheDocument();
  });

  it('does not call changeTemplate when the case already has the selected template applied', async () => {
    const mutateMock = jest.fn();
    const templateId = 'template-1';

    (useChangeAppliedTemplate as jest.Mock).mockReturnValue({ mutate: mutateMock });
    (useGetTemplate as jest.Mock).mockReturnValue({
      data: { templateId, templateVersion: 1, definition: { fields: [] } },
    });

    const caseWithTemplate = {
      ...basicCase,
      template: { id: templateId, version: 1 },
    };

    renderWithTestingProviders(
      <TemplateSettingsPopover {...defaultProps} caseData={caseWithTemplate} />
    );

    await userEvent.click(screen.getByTestId('sidebar-template-settings'));

    await screen.findByTestId('sidebar-template-settings-template-select');

    expect(mutateMock).not.toHaveBeenCalled();
  });

  it('supports a custom data-test-subj', () => {
    renderWithTestingProviders(
      <TemplateSettingsPopover {...defaultProps} data-test-subj="custom-template-settings" />
    );

    expect(screen.getByTestId('custom-template-settings')).toBeInTheDocument();
  });
});
