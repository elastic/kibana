/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { CreatePolicyModal } from './create_new_policy_modal';
import { renderWithI18n } from '@kbn/test-jest-helpers';

describe('CreatePolicyModal', () => {
  const policyNames = ['logs-default', 'metrics-prod', 'my-policy'];

  it('renders title and policy name input', () => {
    renderWithI18n(
      <CreatePolicyModal
        policyNames={policyNames}
        onBack={() => {}}
        onSave={() => {}}
        originalPolicyName="my-policy"
      />
    );

    expect(screen.getByTestId('createPolicyModalTitle')).toHaveTextContent(
      'Save as new ILM policy'
    );
    expect(screen.getByTestId('createPolicyModal-policyNameInput')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    const onBack = jest.fn();
    renderWithI18n(
      <CreatePolicyModal
        policyNames={policyNames}
        onBack={onBack}
        onSave={() => {}}
        originalPolicyName="my-policy"
      />
    );

    fireEvent.click(screen.getByTestId('createPolicyModal-backButton'));
    expect(onBack).toHaveBeenCalled();
  });

  it('submits a valid policy name', async () => {
    const onSave = jest.fn();
    renderWithI18n(
      <CreatePolicyModal
        policyNames={policyNames}
        onBack={() => {}}
        onSave={onSave}
        originalPolicyName="my-policy"
      />
    );

    fireEvent.change(screen.getByTestId('createPolicyModal-policyNameInput'), {
      target: { value: 'new-policy' },
    });

    const saveButton = screen.getByTestId('createPolicyModal-saveButton');
    await waitFor(() => expect(saveButton).not.toBeDisabled());
    fireEvent.click(saveButton);

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('new-policy'));
  });

  it('pre-populates with the default copy name', () => {
    renderWithI18n(
      <CreatePolicyModal
        policyNames={policyNames}
        onBack={() => {}}
        onSave={() => {}}
        originalPolicyName="my-policy"
      />
    );
    expect(screen.getByTestId('createPolicyModal-policyNameInput')).toHaveValue('my-policy-2');
  });

  it('pre-populates with the first available copy name when the default already exists', () => {
    renderWithI18n(
      <CreatePolicyModal
        policyNames={[...policyNames, 'my-policy-2']}
        onBack={() => {}}
        onSave={() => {}}
        originalPolicyName="my-policy"
      />
    );

    expect(screen.getByTestId('createPolicyModal-policyNameInput')).toHaveValue('my-policy-3');
  });

  it('does not suggest a copy name after 9 attempts', () => {
    renderWithI18n(
      <CreatePolicyModal
        policyNames={[
          ...policyNames,
          'my-policy-2',
          'my-policy-3',
          'my-policy-4',
          'my-policy-5',
          'my-policy-6',
          'my-policy-7',
          'my-policy-8',
          'my-policy-9',
        ]}
        onBack={() => {}}
        onSave={() => {}}
        originalPolicyName="my-policy"
      />
    );

    expect(screen.getByTestId('createPolicyModal-policyNameInput')).toHaveValue('');
  });

  it('does not suggest a copy name when the shortest suffix is too long', () => {
    renderWithI18n(
      <CreatePolicyModal
        policyNames={[]}
        onBack={() => {}}
        onSave={() => {}}
        originalPolicyName={'a'.repeat(255)}
      />
    );

    expect(screen.getByTestId('createPolicyModal-policyNameInput')).toHaveValue('');
  });

  describe('policy name validation', () => {
    const validationDebounceMs = 500;
    const advanceValidation = async () => {
      await act(async () => {
        jest.advanceTimersByTime(validationDebounceMs);
      });
    };

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('shows an error for duplicate policy names', async () => {
      renderWithI18n(
        <CreatePolicyModal
          policyNames={policyNames}
          onBack={() => {}}
          onSave={() => {}}
          originalPolicyName="my-policy"
        />
      );

      const input = screen.getByTestId('createPolicyModal-policyNameInput');
      fireEvent.change(input, {
        target: { value: 'logs-default' },
      });
      await advanceValidation();

      expect(screen.getByText('That policy name is already used.')).toBeInTheDocument();
      expect(screen.getByTestId('createPolicyModal-saveButton')).toBeDisabled();
    });

    it('shows an error for empty policy name', async () => {
      renderWithI18n(
        <CreatePolicyModal
          policyNames={policyNames}
          onBack={() => {}}
          onSave={() => {}}
          originalPolicyName="my-policy"
        />
      );

      const input = screen.getByTestId('createPolicyModal-policyNameInput');
      fireEvent.change(input, { target: { value: 'a' } });
      fireEvent.change(input, { target: { value: '' } });
      await advanceValidation();

      expect(screen.getByText('A policy name is required.')).toBeInTheDocument();
      expect(screen.getByTestId('createPolicyModal-saveButton')).toBeDisabled();
    });

    it('shows an error for policy names that start with an underscore', async () => {
      renderWithI18n(
        <CreatePolicyModal
          policyNames={policyNames}
          onBack={() => {}}
          onSave={() => {}}
          originalPolicyName="my-policy"
        />
      );

      const input = screen.getByTestId('createPolicyModal-policyNameInput');
      fireEvent.change(input, { target: { value: '_logs-default' } });
      await advanceValidation();

      expect(
        screen.getByText('A policy name cannot start with an underscore.')
      ).toBeInTheDocument();
      expect(screen.getByTestId('createPolicyModal-saveButton')).toBeDisabled();
    });

    it('shows an error for policy names that contain spaces or commas', async () => {
      renderWithI18n(
        <CreatePolicyModal
          policyNames={policyNames}
          onBack={() => {}}
          onSave={() => {}}
          originalPolicyName="my-policy"
        />
      );

      const input = screen.getByTestId('createPolicyModal-policyNameInput');
      fireEvent.change(input, { target: { value: 'logs default' } });
      await advanceValidation();

      expect(
        screen.getByText('A policy name cannot contain spaces or commas.')
      ).toBeInTheDocument();
      expect(screen.getByTestId('createPolicyModal-saveButton')).toBeDisabled();

      fireEvent.change(input, { target: { value: 'logs,default' } });
      await advanceValidation();

      expect(
        screen.getByText('A policy name cannot contain spaces or commas.')
      ).toBeInTheDocument();
      expect(screen.getByTestId('createPolicyModal-saveButton')).toBeDisabled();
    });

    it('shows an error for policy names that are too long', async () => {
      renderWithI18n(
        <CreatePolicyModal
          policyNames={policyNames}
          onBack={() => {}}
          onSave={() => {}}
          originalPolicyName="my-policy"
        />
      );

      const input = screen.getByTestId('createPolicyModal-policyNameInput');
      fireEvent.change(input, {
        target: { value: 'a'.repeat(256) },
      });
      await advanceValidation();

      expect(
        screen.getByText('A policy name cannot be longer than 255 bytes.')
      ).toBeInTheDocument();
      expect(screen.getByTestId('createPolicyModal-saveButton')).toBeDisabled();
    });
  });
});
