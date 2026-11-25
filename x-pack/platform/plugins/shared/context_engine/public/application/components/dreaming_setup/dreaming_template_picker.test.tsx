/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { DreamingTemplateSummary } from '../../../../common/dreaming_templates';
import { DreamingTemplatePicker } from './dreaming_template_picker';
import { CUSTOM_TEMPLATE_ID } from './use_dreaming_setup_draft';

const SUPPORT: DreamingTemplateSummary = {
  id: 'customer_support',
  name: 'Customer support',
  description: 'Tickets.',
};

const LEGAL: DreamingTemplateSummary = {
  id: 'legal_assistant',
  name: 'Legal assistant',
  description: 'Contracts.',
};

const onSelect = jest.fn();
const groupAriaLabel = 'What are you building?';

const renderPicker = ({
  templates = [SUPPORT, LEGAL],
  selectedId = SUPPORT.id,
  isLoading = false,
  onSelectProp = onSelect,
  ariaLabel = groupAriaLabel,
}: {
  templates?: DreamingTemplateSummary[];
  selectedId?: string;
  isLoading?: boolean;
  onSelectProp?: (id: string) => void;
  ariaLabel?: string;
} = {}) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <DreamingTemplatePicker
          ariaLabel={ariaLabel}
          templates={templates}
          selectedId={selectedId}
          isLoading={isLoading}
          onSelect={onSelectProp}
        />
      </EuiProvider>
    </I18nProvider>
  );

describe('DreamingTemplatePicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading skeleton and no template options when isLoading is true', () => {
    renderPicker({ isLoading: true });

    expect(screen.getByTestId('contextDreamingTemplatesLoading')).toBeInTheDocument();
    expect(
      screen.queryByTestId('contextDreamingTemplateOption-customer_support')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('contextDreamingTemplateOption-legal_assistant')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextDreamingTemplateOption-custom')).not.toBeInTheDocument();
  });

  it('names the option group for assistive tech', () => {
    renderPicker();

    expect(screen.getByRole('group', { name: groupAriaLabel })).toBeInTheDocument();
  });

  it('renders one option per template plus Custom with template names', () => {
    renderPicker();

    expect(screen.getByTestId('contextDreamingTemplateOption-customer_support')).toHaveTextContent(
      'Customer support'
    );
    expect(screen.getByTestId('contextDreamingTemplateOption-legal_assistant')).toHaveTextContent(
      'Legal assistant'
    );
    expect(screen.getByTestId('contextDreamingTemplateOption-custom')).toHaveTextContent('Custom');
  });

  it('marks only the selectedId option as selected', () => {
    renderPicker({ selectedId: 'legal_assistant' });

    expect(screen.getByTestId('contextDreamingTemplateOption-customer_support')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByTestId('contextDreamingTemplateOption-legal_assistant')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('contextDreamingTemplateOption-custom')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('marks Custom as selected when selectedId is CUSTOM_TEMPLATE_ID', () => {
    renderPicker({ selectedId: CUSTOM_TEMPLATE_ID });

    expect(screen.getByTestId('contextDreamingTemplateOption-customer_support')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByTestId('contextDreamingTemplateOption-legal_assistant')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByTestId('contextDreamingTemplateOption-custom')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('calls onSelect with the template id when an option is clicked', async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByTestId('contextDreamingTemplateOption-legal_assistant'));

    expect(onSelect).toHaveBeenCalledWith('legal_assistant');
  });

  it('calls onSelect with custom when Custom is clicked', async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByTestId('contextDreamingTemplateOption-custom'));

    expect(onSelect).toHaveBeenCalledWith(CUSTOM_TEMPLATE_ID);
  });

  it('still renders the Custom option when templates is empty', () => {
    renderPicker({ templates: [], selectedId: CUSTOM_TEMPLATE_ID });

    expect(screen.getByTestId('contextDreamingTemplateOption-custom')).toBeInTheDocument();
    expect(
      screen.queryByTestId('contextDreamingTemplateOption-customer_support')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('contextDreamingTemplateOption-legal_assistant')
    ).not.toBeInTheDocument();
  });
});
