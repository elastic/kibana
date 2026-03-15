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
const onEnterEdit = jest.fn();

const defaultProps = {
  title: 'My Field',
  isLoading: false,
  displayContent: <span data-test-subj="display">{'initial'}</span>,
  children: <input data-test-subj="edit-input" defaultValue="initial" />,
  onSubmit,
  onEnterEdit,
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
    renderWithTestingProviders(<EditableFieldWrapper {...defaultProps} />);

    expect(screen.getByText('My Field')).toBeInTheDocument();
  });

  it('renders the display content when not editing', () => {
    renderWithTestingProviders(<EditableFieldWrapper {...defaultProps} />);

    expect(screen.getByTestId('display')).toBeInTheDocument();
    expect(screen.queryByTestId('test-field-submit')).not.toBeInTheDocument();
  });

  it('shows the edit button when user has update permissions', () => {
    renderWithTestingProviders(<EditableFieldWrapper {...defaultProps} />);

    expect(screen.getByTestId('test-field-edit-button')).toBeInTheDocument();
  });

  it('hides the edit button when user lacks update permissions', () => {
    renderWithTestingProviders(<EditableFieldWrapper {...defaultProps} />, {
      wrapperProps: { permissions: readCasesPermissions() },
    });

    expect(screen.queryByTestId('test-field-edit-button')).not.toBeInTheDocument();
  });

  it('hides the edit button when loading', () => {
    renderWithTestingProviders(<EditableFieldWrapper {...defaultProps} isLoading />);

    expect(screen.queryByTestId('test-field-edit-button')).not.toBeInTheDocument();
  });

  it('enters edit mode when the edit button is clicked', async () => {
    renderWithTestingProviders(<EditableFieldWrapper {...defaultProps} />);

    await user.click(screen.getByTestId('test-field-edit-button'));

    expect(screen.getByTestId('edit-input')).toBeInTheDocument();
    expect(screen.getByTestId('test-field-submit')).toBeInTheDocument();
    expect(screen.getByTestId('test-field-cancel')).toBeInTheDocument();
    expect(screen.queryByTestId('display')).not.toBeInTheDocument();
  });

  it('calls onEnterEdit when entering edit mode', async () => {
    renderWithTestingProviders(<EditableFieldWrapper {...defaultProps} />);

    await user.click(screen.getByTestId('test-field-edit-button'));

    expect(onEnterEdit).toHaveBeenCalled();
  });

  it('calls onSubmit when save is clicked', async () => {
    renderWithTestingProviders(<EditableFieldWrapper {...defaultProps} />);

    await user.click(screen.getByTestId('test-field-edit-button'));
    await user.click(screen.getByTestId('test-field-submit'));

    expect(onSubmit).toHaveBeenCalled();
    expect(screen.queryByTestId('edit-input')).not.toBeInTheDocument();
  });

  it('does not call onSubmit when cancel is clicked', async () => {
    renderWithTestingProviders(<EditableFieldWrapper {...defaultProps} />);

    await user.click(screen.getByTestId('test-field-edit-button'));
    await user.click(screen.getByTestId('test-field-cancel'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByTestId('edit-input')).not.toBeInTheDocument();
  });

  it('uses the default data-test-subj when none provided', () => {
    const { 'data-test-subj': _, ...propsWithoutSubj } = defaultProps;
    renderWithTestingProviders(<EditableFieldWrapper {...propsWithoutSubj} />);

    expect(screen.getByTestId('editable-field')).toBeInTheDocument();
    expect(screen.getByTestId('editable-field-edit-button')).toBeInTheDocument();
  });
});
