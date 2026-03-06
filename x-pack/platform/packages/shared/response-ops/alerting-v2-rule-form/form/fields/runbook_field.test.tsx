/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFormContext } from 'react-hook-form';
import { createFormWrapper } from '../../test_utils';
import type { FormValues } from '../types';
import { RunbookField } from './runbook_field';

const RunbookValueSpy = () => {
  const { watch } = useFormContext<FormValues>();
  return <div data-test-subj="runbookValueSpy">{watch('metadata.runbook') ?? ''}</div>;
};

const createDefaultValues = (runbook: string = ''): Partial<FormValues> => ({
  metadata: {
    name: 'Test rule',
    enabled: true,
    runbook,
  },
});

describe('RunbookField', () => {
  it('does not render when closed', () => {
    render(<RunbookField isOpen={false} onClose={jest.fn()} />, {
      wrapper: createFormWrapper(createDefaultValues()),
    });

    expect(screen.queryByText('Add Runbook')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Runbook')).not.toBeInTheDocument();
  });

  it('renders modal content when open', () => {
    render(<RunbookField isOpen={true} onClose={jest.fn()} />, {
      wrapper: createFormWrapper(createDefaultValues()),
    });

    expect(screen.getByRole('heading', { name: 'Add Runbook' })).toBeInTheDocument();
    expect(screen.getByLabelText('Runbook')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Runbook' })).toBeInTheDocument();
  });

  it('prefills editor from metadata.runbook value', () => {
    render(<RunbookField isOpen={true} onClose={jest.fn()} />, {
      wrapper: createFormWrapper(createDefaultValues('Existing runbook content')),
    });

    expect(screen.getByLabelText('Runbook')).toHaveValue('Existing runbook content');
  });

  it('calls onClose and does not save draft when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(
      <>
        <RunbookField isOpen={true} onClose={onClose} />
        <RunbookValueSpy />
      </>,
      {
        wrapper: createFormWrapper(createDefaultValues('Initial runbook')),
      }
    );

    await user.type(screen.getByLabelText('Runbook'), ' draft change');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('runbookValueSpy')).toHaveTextContent('Initial runbook');
  });

  it('saves runbook and calls onClose when add runbook is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(
      <>
        <RunbookField isOpen={true} onClose={onClose} />
        <RunbookValueSpy />
      </>,
      {
        wrapper: createFormWrapper(createDefaultValues()),
      }
    );

    await user.type(screen.getByLabelText('Runbook'), 'First line\nSecond line');
    await user.click(screen.getByRole('button', { name: 'Add Runbook' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('runbookValueSpy')).toHaveTextContent(/First line\s+Second line/);
  });

  it('refreshes draft from form value when reopened', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const wrapper = createFormWrapper(createDefaultValues('Persisted runbook'));
    const { rerender } = render(
      <>
        <RunbookField isOpen={true} onClose={onClose} />
        <RunbookValueSpy />
      </>,
      { wrapper }
    );

    await user.type(screen.getByLabelText('Runbook'), ' temporary');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    rerender(
      <>
        <RunbookField isOpen={false} onClose={onClose} />
        <RunbookValueSpy />
      </>
    );
    rerender(
      <>
        <RunbookField isOpen={true} onClose={onClose} />
        <RunbookValueSpy />
      </>
    );

    expect(screen.getByLabelText('Runbook')).toHaveValue('Persisted runbook');
  });
});
