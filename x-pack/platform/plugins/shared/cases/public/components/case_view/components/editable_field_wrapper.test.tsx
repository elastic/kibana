/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';

import { EditableFieldWrapper } from './editable_field_wrapper';
import { readCasesPermissions, renderWithTestingProviders } from '../../../common/mock';

const onSubmit = jest.fn();

const defaultProps = {
  title: 'My Field',
  value: 'initial',
  isLoading: false,
  displayContent: <span data-test-subj="display">{'initial'}</span>,
  children: (editValue: string, setEditValue: React.Dispatch<React.SetStateAction<string>>) => (
    <input
      data-test-subj="edit-input"
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
    />
  ),
  onSubmit,
  'data-test-subj': 'test-field',
};

describe('EditableFieldWrapper', () => {
  let user: UserEvent;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  });

  it('renders the title', () => {
    renderWithTestingProviders(<EditableFieldWrapper<string> {...defaultProps} />);

    expect(screen.getByText('My Field')).toBeInTheDocument();
  });

  it('renders the display content when not editing', () => {
    renderWithTestingProviders(<EditableFieldWrapper<string> {...defaultProps} />);

    expect(screen.getByTestId('display')).toBeInTheDocument();
    expect(screen.queryByTestId('test-field-submit')).not.toBeInTheDocument();
  });

  it('shows the edit button when user has update permissions', () => {
    renderWithTestingProviders(<EditableFieldWrapper<string> {...defaultProps} />);

    expect(screen.getByTestId('test-field-edit-button')).toBeInTheDocument();
  });

  it('hides the edit button when user lacks update permissions', () => {
    renderWithTestingProviders(<EditableFieldWrapper<string> {...defaultProps} />, {
      wrapperProps: { permissions: readCasesPermissions() },
    });

    expect(screen.queryByTestId('test-field-edit-button')).not.toBeInTheDocument();
  });

  it('hides the edit button when loading', () => {
    renderWithTestingProviders(<EditableFieldWrapper<string> {...defaultProps} isLoading />);

    expect(screen.queryByTestId('test-field-edit-button')).not.toBeInTheDocument();
  });

  it('enters edit mode when the edit button is clicked', async () => {
    renderWithTestingProviders(<EditableFieldWrapper<string> {...defaultProps} />);

    await user.click(screen.getByTestId('test-field-edit-button'));

    expect(screen.getByTestId('edit-input')).toBeInTheDocument();
    expect(screen.getByTestId('test-field-submit')).toBeInTheDocument();
    expect(screen.getByTestId('test-field-cancel')).toBeInTheDocument();
    expect(screen.queryByTestId('display')).not.toBeInTheDocument();
  });

  it('resets the edit value to the current prop value when entering edit mode', async () => {
    renderWithTestingProviders(<EditableFieldWrapper<string> {...defaultProps} value="current" />);

    await user.click(screen.getByTestId('test-field-edit-button'));

    expect(screen.getByTestId('edit-input')).toHaveValue('current');
  });

  it('calls onSubmit with the edit value when save is clicked', async () => {
    renderWithTestingProviders(<EditableFieldWrapper<string> {...defaultProps} />);

    await user.click(screen.getByTestId('test-field-edit-button'));
    const input = screen.getByTestId('edit-input');
    await user.clear(input);
    await user.type(input, 'updated');
    await user.click(screen.getByTestId('test-field-submit'));

    expect(onSubmit).toHaveBeenCalledWith('updated');
    expect(screen.queryByTestId('edit-input')).not.toBeInTheDocument();
  });

  it('does not call onSubmit when cancel is clicked', async () => {
    renderWithTestingProviders(<EditableFieldWrapper<string> {...defaultProps} />);

    await user.click(screen.getByTestId('test-field-edit-button'));
    await user.click(screen.getByTestId('test-field-cancel'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByTestId('edit-input')).not.toBeInTheDocument();
  });

  it('uses the default data-test-subj when none provided', () => {
    const { 'data-test-subj': _, ...propsWithoutSubj } = defaultProps;
    renderWithTestingProviders(<EditableFieldWrapper<string> {...propsWithoutSubj} />);

    expect(screen.getByTestId('editable-field')).toBeInTheDocument();
    expect(screen.getByTestId('editable-field-edit-button')).toBeInTheDocument();
  });
});
