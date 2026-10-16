/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { CreateEscalationForm, type CreateEscalationFormProps } from './create_escalation_form';

jest.mock('@kbn/user-profile-components', () => ({
  UserProfilesSelectable: ({ 'data-test-subj': testSubj }: { 'data-test-subj'?: string }) => (
    <div data-test-subj={testSubj ?? 'escalationModalAssigneePicker'} />
  ),
}));

const currentUser = {
  uid: 'user-1',
  user: { username: 'alice', avatar: undefined },
  enabled: true,
  data: {},
};

const defaultProps: CreateEscalationFormProps = {
  investigationTitle: 'Suspicious login activity',
  suggestedAssignees: [],
  onSearchAssignees: jest.fn(),
  isSearchingAssignees: false,
  onSubmit: jest.fn(),
  isSubmitting: false,
  onCancel: jest.fn(),
  currentUser,
  currentUserName: 'Alice',
};

const renderForm = (props: Partial<CreateEscalationFormProps> = {}) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <CreateEscalationForm {...defaultProps} {...props} />
      </EuiProvider>
    </I18nProvider>
  );

afterEach(() => jest.clearAllMocks());

describe('CreateEscalationForm', () => {
  it('pre-fills the title field with the investigation title', () => {
    renderForm();

    expect(screen.getByTestId('escalationModalTitleInput')).toHaveValue(
      'Suspicious login activity'
    );
  });

  it('disables the submit button when the title is cleared', () => {
    renderForm();

    fireEvent.change(screen.getByTestId('escalationModalTitleInput'), { target: { value: '' } });

    expect(screen.getByTestId('escalationModalCreateEscalation')).toBeDisabled();
  });

  it('disables the submit button while submitting', () => {
    renderForm({ isSubmitting: true });

    expect(screen.getByTestId('escalationModalCreateEscalation')).toBeDisabled();
  });

  it('does not show the assignee picker in public mode', () => {
    renderForm();

    expect(screen.queryByTestId('escalationModalAssigneePicker')).not.toBeInTheDocument();
  });

  it('shows the assignee picker when private mode is toggled on', () => {
    renderForm();

    fireEvent.click(screen.getByTestId('escalationModalVisibilitySwitch'));

    expect(screen.getByTestId('escalationModalAssigneePicker')).toBeInTheDocument();
  });

  it('calls onSubmit with title, public visibility, and empty assignees by default', () => {
    const onSubmit = jest.fn();
    renderForm({ onSubmit });

    fireEvent.click(screen.getByTestId('escalationModalCreateEscalation'));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Suspicious login activity',
      visibility: 'public',
      assigneeUids: [],
    });
  });

  it('calls onSubmit with private visibility and selected assignees when private', () => {
    const onSubmit = jest.fn();
    // currentUser is pre-selected by default, so submit should include their uid.
    renderForm({ onSubmit, currentUser });

    fireEvent.click(screen.getByTestId('escalationModalVisibilitySwitch'));
    fireEvent.click(screen.getByTestId('escalationModalCreateEscalation'));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Suspicious login activity',
      visibility: 'private',
      assigneeUids: ['user-1'],
    });
  });

  it('calls onCancel when the cancel button is clicked', () => {
    const onCancel = jest.fn();
    renderForm({ onCancel });

    fireEvent.click(screen.getByTestId('escalationModalCancel'));

    expect(onCancel).toHaveBeenCalled();
  });
});
