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
import { useDreamingTemplates } from '../../../hooks/use_dreaming_templates';
import { DreamingSetupForm } from './dreaming_setup_form';

jest.mock('../../../hooks/use_dreaming_templates', () => ({ useDreamingTemplates: jest.fn() }));

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

const onApply = jest.fn();
const onDiscard = jest.fn();

const renderForm = ({
  loadError,
  isSaving = false,
}: { loadError?: Error; isSaving?: boolean } = {}) => {
  jest.mocked(useDreamingTemplates).mockReturnValue({
    templates: loadError ? [] : [SUPPORT, LEGAL],
    isLoading: false,
    error: loadError,
  });
  return render(
    <I18nProvider>
      <EuiProvider>
        <DreamingSetupForm isSaving={isSaving} onApply={onApply} onDiscard={onDiscard} />
      </EuiProvider>
    </I18nProvider>
  );
};

describe('DreamingSetupForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    onApply.mockResolvedValue(true);
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
    expect(screen.getByTestId('contextAiIndexDreamingSetupSave')).toBeInTheDocument();
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
    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSetupSave'));

    await waitFor(() =>
      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({
          facts: [{ type: 'solution' }],
          entities: null,
          instructions: 'Acme support.',
        })
      )
    );
  });

  it('shows an error callout when templates fail to load', () => {
    renderForm({ loadError: new Error('Boom') });

    expect(screen.getByTestId('contextDreamingTemplatesError')).toHaveTextContent('Boom');
    expect(screen.queryByTestId('contextAiIndexDreamingSetupSave')).not.toBeInTheDocument();
  });

  it('calls onDiscard when Discard changes is clicked', async () => {
    renderForm();
    await waitFor(() =>
      expect(screen.getByTestId('contextAiIndexDreamingSetupSave')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('contextAiIndexDreamingSetupDiscard'));

    expect(onDiscard).toHaveBeenCalled();
  });

  it('disables Discard while saving', async () => {
    renderForm({ isSaving: true });
    await waitFor(() =>
      expect(screen.getByTestId('contextAiIndexDreamingSetupSave')).toBeInTheDocument()
    );

    expect(screen.getByTestId('contextAiIndexDreamingSetupDiscard')).toBeDisabled();
  });
});
