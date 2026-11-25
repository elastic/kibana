/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { useApplyDreamingTemplate } from '../../../hooks/use_apply_dreaming_template';
import { useDreamingTemplates } from '../../../hooks/use_dreaming_templates';
import { DreamingSetupForm } from './dreaming_setup_form';

jest.mock('../../../hooks/use_dreaming_templates', () => ({ useDreamingTemplates: jest.fn() }));
jest.mock('../../../hooks/use_apply_dreaming_template', () => ({
  useApplyDreamingTemplate: jest.fn(),
}));

const SUPPORT = {
  id: 'customer_support',
  name: 'Customer support',
  description: 'Tickets.',
  summary: 'Support.',
  rationale: 'Issues.',
  dreaming: { facts: [{ type: 'solution' }], entities: { nodes: [{ type: 'issue' }] } },
};

const LEGAL = {
  id: 'legal_assistant',
  name: 'Legal assistant',
  description: 'Contracts.',
  summary: 'Legal knowledge.',
  rationale: 'Rules.',
  dreaming: { facts: [{ type: 'obligation' }] },
};

const applyTemplate = jest.fn();
const onCancel = jest.fn();

const renderForm = ({ loadError }: { loadError?: Error } = {}) => {
  jest.mocked(useDreamingTemplates).mockReturnValue({
    templates: loadError ? [] : [SUPPORT, LEGAL],
    isLoading: false,
    error: loadError,
  });
  jest.mocked(useApplyDreamingTemplate).mockReturnValue({ applyTemplate, isSaving: false });
  return render(
    <I18nProvider>
      <EuiProvider>
        <DreamingSetupForm aiIndexId="tickets" onCancel={onCancel} />
      </EuiProvider>
    </I18nProvider>
  );
};

describe('DreamingSetupForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    applyTemplate.mockResolvedValue(true);
  });

  it('renders the template picker, summary, and config editor', async () => {
    renderForm();

    expect(screen.getByTestId('contextDreamingTemplateOption-customer_support')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await waitFor(() =>
      expect(screen.getByTestId('contextDreamingConfigFact-solution')).toBeInTheDocument()
    );
    expect(screen.getByTestId('contextAiIndexDreamingSetupSummary')).toHaveValue('Support.');
    expect(screen.getByTestId('contextAiIndexDreamingSetupApply')).toBeInTheDocument();
  });

  it('switches templates and updates summary', async () => {
    renderForm();
    await waitFor(() =>
      expect(screen.getByTestId('contextDreamingConfigFact-solution')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('contextDreamingTemplateOption-legal_assistant'));

    await waitFor(() =>
      expect(screen.getByTestId('contextAiIndexDreamingSetupSummary')).toHaveValue(
        'Legal knowledge.'
      )
    );
    expect(screen.getByTestId('contextDreamingConfigFact-obligation')).toBeInTheDocument();
  });

  it('calls applyTemplate with a config that turns dreaming on', async () => {
    renderForm();
    await waitFor(() =>
      expect(screen.getByTestId('contextDreamingConfigFact-solution')).toBeInTheDocument()
    );

    fireEvent.change(screen.getByTestId('contextAiIndexDreamingSetupSummary'), {
      target: { value: 'Acme support.' },
    });
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSetupApply'));

    await waitFor(() =>
      expect(applyTemplate).toHaveBeenCalledWith({
        aiIndexId: 'tickets',
        config: expect.objectContaining({
          facts: [{ type: 'solution' }],
          entities: null,
          instructions: 'Acme support.',
        }),
      })
    );
  });

  it('shows an error callout when templates fail to load', () => {
    renderForm({ loadError: new Error('Boom') });

    expect(screen.getByTestId('contextDreamingTemplatesError')).toHaveTextContent('Boom');
    expect(screen.queryByTestId('contextAiIndexDreamingSetupApply')).not.toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    renderForm();
    await waitFor(() =>
      expect(screen.getByTestId('contextAiIndexDreamingSetupApply')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSetupCancel'));

    expect(onCancel).toHaveBeenCalled();
  });
});
