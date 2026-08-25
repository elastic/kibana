/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCommentList } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import copy from 'copy-to-clipboard';

import { UserActionActions, UserActionTypes } from '../../../common/types/domain';
import { createCommonUpdateUserActionBuilder } from './common';
import { getUserAction } from '../../containers/mock';
import { TestProviders, renderWithTestingProviders } from '../../common/mock';
import { userProfiles, userProfilesMap } from '../../containers/user_profiles/api.mock';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');
jest.mock('copy-to-clipboard', () => jest.fn());

describe('createCommonUpdateUserActionBuilder ', () => {
  const label = <>{'A label'}</>;
  const handleOutlineComment = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const userAction = getUserAction('title', UserActionActions.update, {
      createdBy: { profileUid: userProfiles[0].uid },
    });
    const builder = createCommonUpdateUserActionBuilder({
      userProfiles: userProfilesMap,
      userAction,
      label,
      icon: 'dot',
      handleOutlineComment,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    // The avatar
    expect(screen.getByText('DR')).toBeInTheDocument();
    // The username
    expect(screen.getByText(userProfiles[0].user.full_name!)).toBeInTheDocument();
    // The label of the event
    expect(screen.getByText('A label')).toBeInTheDocument();
    // The copy link button
    expect(screen.getByLabelText('Copy reference link')).toBeInTheDocument();
  });

  it('renders shows the move to comment button if the user action is an edit comment', async () => {
    const userAction = getUserAction('comment', UserActionActions.update);
    const builder = createCommonUpdateUserActionBuilder({
      userProfiles: userProfilesMap,
      userAction,
      label,
      icon: 'dot',
      handleOutlineComment,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByLabelText('Highlight the referenced comment')).toBeInTheDocument();
  });

  it('it copies the reference link when clicking the reference button', async () => {
    const userAction = getUserAction('comment', UserActionActions.update);
    const builder = createCommonUpdateUserActionBuilder({
      userProfiles: userProfilesMap,
      userAction,
      label,
      icon: 'dot',
      handleOutlineComment,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    await userEvent.click(screen.getByLabelText('Copy reference link'));
    expect(copy).toHaveBeenCalled();
  });

  it('calls the handleOutlineComment when clicking the reference button', async () => {
    const userAction = getUserAction('comment', UserActionActions.update);
    const builder = createCommonUpdateUserActionBuilder({
      userProfiles: userProfilesMap,
      userAction,
      label,
      icon: 'dot',
      handleOutlineComment,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    await userEvent.click(screen.getByLabelText('Highlight the referenced comment'));
    expect(handleOutlineComment).toHaveBeenCalled();
  });

  describe('renderUserActionExtraActions slot', () => {
    const buildAndRenderWithAction = (renderUserActionExtraActions?: jest.Mock) => {
      const userAction = getUserAction(UserActionTypes.workflow, UserActionActions.create);
      const builder = createCommonUpdateUserActionBuilder({
        userProfiles: userProfilesMap,
        userAction,
        label,
        icon: 'workflow',
        handleOutlineComment,
      });
      return renderWithTestingProviders(<EuiCommentList comments={builder.build()} />, {
        wrapperProps: { renderUserActionExtraActions },
      });
    };

    it('renders the node returned by renderUserActionExtraActions', () => {
      const renderUserActionExtraActions = jest.fn().mockReturnValue(
        <button type="button" data-test-subj="extra-action">
          {'Extra'}
        </button>
      );

      buildAndRenderWithAction(renderUserActionExtraActions);

      expect(screen.getByTestId('extra-action')).toBeInTheDocument();
      expect(renderUserActionExtraActions).toHaveBeenCalledWith(
        expect.objectContaining({ userAction: expect.objectContaining({ type: UserActionTypes.workflow }) })
      );
    });

    it('renders nothing when renderUserActionExtraActions returns null', () => {
      const renderUserActionExtraActions = jest.fn().mockReturnValue(null);

      buildAndRenderWithAction(renderUserActionExtraActions);

      expect(screen.queryByTestId('extra-action')).toBeNull();
    });

    it('does not crash when renderUserActionExtraActions is not provided', () => {
      expect(() => buildAndRenderWithAction()).not.toThrow();
    });
  });
});
