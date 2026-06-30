/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import type { TemplateFieldDefinition } from './template_conversation_utils';
import { TemplateFieldRow } from './template_field_row';

const renderField = ({
  definition,
  value,
}: {
  definition: TemplateFieldDefinition;
  value: unknown;
}) => {
  return render(
    <I18nProvider>
      <EuiProvider>
        <TemplateFieldRow
          definition={definition}
          value={value}
          isSaving={false}
          onChange={jest.fn()}
        />
      </EuiProvider>
    </I18nProvider>
  );
};

describe('TemplateFieldRow', () => {
  it('renders markdown fields as read-only wrapped content', () => {
    renderField({
      definition: { key: 'current_state', label: 'Current state', type: 'markdown' },
      value: '- **`logs.codex.e2e` does not exist**: create the data view first.',
    });

    expect(screen.getByText('logs.codex.e2e')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Current state' })).not.toBeInTheDocument();
  });

  it('renders timeline entries without object coercion', () => {
    renderField({
      definition: { key: 'timeline', label: 'Timeline', type: 'timeline' },
      value: [
        {
          at: '2026-06-30T13:22:00.000Z',
          actor: 'investigation workflow',
          source: 'workflow',
          summary: 'Investigation workflow completed',
        },
      ],
    });

    expect(screen.getByText('Investigation workflow completed')).toBeInTheDocument();
    expect(
      screen.getByText('investigation workflow | workflow | 2026-06-30T13:22:00.000Z')
    ).toBeInTheDocument();
    expect(screen.queryByText('[object Object]')).not.toBeInTheDocument();
  });

  it('renders structured metadata as formatted JSON', () => {
    renderField({
      definition: { key: 'workflow_hook_state', label: 'Workflow hook state', type: 'json' },
      value: {
        refresh_state: {
          last_run_at: '2026-06-30T13:22:00.000Z',
        },
      },
    });

    expect(screen.getByText(/"refresh_state"/)).toBeInTheDocument();
    expect(screen.getByText(/"last_run_at": "2026-06-30T13:22:00.000Z"/)).toBeInTheDocument();
    expect(screen.queryByText('[object Object]')).not.toBeInTheDocument();
  });
});
