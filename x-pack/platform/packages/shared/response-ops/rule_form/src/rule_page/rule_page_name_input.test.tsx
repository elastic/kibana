/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { RulePageNameInput } from './rule_page_name_input';

vi.mock('../hooks', () => {
  const mocked = {
    useRuleFormState: vi.fn(),
    useRuleFormDispatch: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const { useRuleFormState, useRuleFormDispatch } = await vi.importMock('../hooks');

const dispatch = vi.fn();

useRuleFormState.mockReturnValue({
  formData: {
    name: 'test-name',
  },
});

useRuleFormDispatch.mockReturnValue(dispatch);

describe('rulePageNameInput', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('renders correctly', () => {
    render(<RulePageNameInput />);

    expect(screen.getByText('test-name')).toBeInTheDocument();
  });

  test('should become an input if the edit button is pressed', () => {
    render(<RulePageNameInput />);

    fireEvent.click(screen.getByTestId('rulePageNameInputButton'));

    fireEvent.change(screen.getByTestId('rulePageNameInputField'), {
      target: {
        value: 'hello',
      },
    });

    expect(dispatch).toHaveBeenLastCalledWith({
      type: 'setName',
      payload: 'hello',
    });
  });

  test('should be invalid if there is an error', () => {
    useRuleFormState.mockReturnValue({
      formData: {
        name: '',
      },
      baseErrors: {
        name: ['Invalid name'],
      },
    });

    render(<RulePageNameInput />);

    fireEvent.click(screen.getByTestId('rulePageNameInputButton'));

    expect(screen.getByTestId('rulePageNameInputField')).toBeInvalid();
    expect(screen.getByText('Invalid name')).toBeInTheDocument();
  });
});
