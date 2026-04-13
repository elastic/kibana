/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AggregateQuery } from '@kbn/es-query';
import { RecoveryBaseQueryField } from './recovery_base_query_field';
import { createFormWrapper } from '../../test_utils';

// Mock the ESQLLangEditor component from @kbn/esql/public
jest.mock('@kbn/esql/public', () => ({
  ESQLLangEditor: ({
    query,
    onTextLangQueryChange,
    dataTestSubj,
    errors,
    warning,
  }: {
    query: AggregateQuery;
    onTextLangQueryChange: (query: AggregateQuery) => void;
    dataTestSubj?: string;
    errors?: Error[];
    warning?: string;
  }) => (
    <div data-test-subj={dataTestSubj}>
      <textarea
        data-test-subj={`${dataTestSubj}-input`}
        value={query.esql}
        onChange={(e) => onTextLangQueryChange({ esql: e.target.value })}
      />
      {errors?.map((error, i) => (
        <div key={i} data-test-subj={`${dataTestSubj}-error`}>
          {error.message}
        </div>
      ))}
      {warning && <div data-test-subj={`${dataTestSubj}-warning`}>{warning}</div>}
    </div>
  ),
}));

describe('RecoveryBaseQueryField', () => {
  it('renders the recovery query label', () => {
    render(<RecoveryBaseQueryField />, {
      wrapper: createFormWrapper({
        recoveryPolicy: { type: 'query' },
      }),
    });

    expect(screen.getByText('Recovery query')).toBeInTheDocument();
  });

  it('renders the ES|QL editor with default data-test-subj', () => {
    render(<RecoveryBaseQueryField />, {
      wrapper: createFormWrapper({
        recoveryPolicy: { type: 'query' },
      }),
    });

    expect(screen.getByTestId('recoveryQueryField')).toBeInTheDocument();
  });

  it('renders with custom dataTestSubj', () => {
    render(<RecoveryBaseQueryField dataTestSubj="customTestSubj" />, {
      wrapper: createFormWrapper({
        recoveryPolicy: { type: 'query' },
      }),
    });

    expect(screen.getByTestId('customTestSubj')).toBeInTheDocument();
  });

  it('displays the current form value', () => {
    render(<RecoveryBaseQueryField />, {
      wrapper: createFormWrapper({
        recoveryPolicy: {
          type: 'query',
          query: { base: 'FROM metrics-* | WHERE status == "ok"' },
        },
      }),
    });

    const textarea = screen.getByTestId('recoveryQueryField-editor-input');
    expect(textarea).toHaveValue('FROM metrics-* | WHERE status == "ok"');
  });

  it('updates value when user types', async () => {
    const user = userEvent.setup();
    render(<RecoveryBaseQueryField />, {
      wrapper: createFormWrapper({
        recoveryPolicy: { type: 'query' },
      }),
    });

    const textarea = screen.getByTestId('recoveryQueryField-editor-input');
    await user.clear(textarea);
    await user.type(textarea, 'FROM metrics-*');

    expect(textarea).toHaveValue('FROM metrics-*');
  });

  it('passes errors prop through to the ES|QL editor', () => {
    const errors = [new Error('Recovery query is missing columns used for grouping: host.name')];

    render(<RecoveryBaseQueryField errors={errors} />, {
      wrapper: createFormWrapper({
        recoveryPolicy: {
          type: 'query',
          query: { base: 'FROM logs-* | STATS count = COUNT(*)' },
        },
      }),
    });

    expect(
      screen.getByText('Recovery query is missing columns used for grouping: host.name')
    ).toBeInTheDocument();
  });

  it('does not render errors when errors prop is undefined', () => {
    render(<RecoveryBaseQueryField />, {
      wrapper: createFormWrapper({
        recoveryPolicy: { type: 'query' },
      }),
    });

    expect(screen.queryByTestId('recoveryQueryField-error')).not.toBeInTheDocument();
  });
});
