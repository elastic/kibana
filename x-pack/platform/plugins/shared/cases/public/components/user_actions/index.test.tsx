/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
// eslint-disable-next-line @kbn/eslint/module_migration
import routeData from 'react-router';

import { useUpdateComment } from '../../containers/use_update_comment';
import {
  basicCaseWithUnifiedComments,
  basicCommentUnified,
  caseUserActions,
  getUserAction,
} from '../../containers/mock';
import { UserActions } from '.';

import { getCaseConnectorsMockResponse } from '../../common/mock/connectors';
import type { UserActivityParams } from '../user_actions_activity_bar/types';
import { useFindCaseUserActions } from '../../containers/use_find_case_user_actions';
import { defaultUseFindCaseUserActions } from '../case_view/mocks';
import { waitForComponentToUpdate } from '../../common/test_utils';
import { useInfiniteFindCaseUserActions } from '../../containers/use_infinite_find_case_user_actions';
import { getMockBuilderArgs } from './mock';
import { renderWithTestingProviders } from '../../common/mock';
import type { CaseUserActionsStats } from '../../containers/types';

const onUpdateField = jest.fn();
const unifiedCommentTestId = `comment-${basicCommentUnified.type}-${basicCommentUnified.type}`;

const userActionsStats: CaseUserActionsStats = {
  total: 25,
  totalDeletions: 0,
  totalComments: 9,
  totalCommentDeletions: 0,
  totalCommentCreations: 5,
  totalHiddenCommentUpdates: 0,
  totalOtherActions: 16,
  totalOtherActionDeletions: 0,
};

const userActivityQueryParams: UserActivityParams = {
  type: 'all',
  sortOrder: 'asc',
  page: 1,
  perPage: 10,
};

const builderArgs = getMockBuilderArgs();

const defaultProps = {
  caseUserActions,
  ...builderArgs,
  attachments: [basicCommentUnified],
  caseConnectors: getCaseConnectorsMockResponse(),
  data: basicCaseWithUnifiedComments,
  manualAlertsData: { 'some-id': { _id: 'some-id' } },
  onUpdateField,
  userActivityQueryParams,
  userActionsStats,
  statusActionButton: null,
  useFetchAlertData: (): [boolean, Record<string, unknown>] => [
    false,
    { 'some-id': { _id: 'some-id' } },
  ],
};

jest.mock('../../containers/use_infinite_find_case_user_actions');
jest.mock('../../containers/use_find_case_user_actions');
jest.mock('../../containers/use_update_comment');
jest.mock('./timestamp', () => ({
  UserActionTimestamp: () => <></>,
}));
jest.mock('../../common/lib/kibana');

const useInfiniteFindCaseUserActionsMock = useInfiniteFindCaseUserActions as jest.Mock;
const useFindCaseUserActionsMock = useFindCaseUserActions as jest.Mock;
const useUpdateCommentMock = useUpdateComment as jest.Mock;
const patchComment = jest.fn();

const renderUserActions = (props = defaultProps) =>
  renderWithTestingProviders(<UserActions {...props} />, {
    wrapperProps: {
      unifiedAttachmentTypeRegistry: builderArgs.unifiedAttachmentTypeRegistry,
    },
  });

describe(`UserActions`, () => {
  const sampleData = {
    content: 'what a great comment update',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useUpdateCommentMock.mockReturnValue({
      isLoadingIds: [],
      mutate: patchComment,
    });
    useFindCaseUserActionsMock.mockReturnValue({
      ...defaultUseFindCaseUserActions,
      data: {
        ...defaultUseFindCaseUserActions.data,
        latestAttachments: [basicCommentUnified],
      },
    });
    useInfiniteFindCaseUserActionsMock.mockReturnValue({ isLoading: false, data: undefined });

    jest.spyOn(routeData, 'useParams').mockReturnValue({ detailName: 'case-id' });
  });

  it('Renders service now update line with top and bottom when push is required', async () => {
    const caseConnectors = getCaseConnectorsMockResponse({ 'push.needsToBePushed': true });
    const ourActions = [
      getUserAction('pushed', 'push_to_service', {
        createdAt: '2023-01-17T09:46:29.813Z',
      }),
    ];

    useFindCaseUserActionsMock.mockReturnValue({
      ...defaultUseFindCaseUserActions,
      data: { userActions: ourActions },
    });

    const props = {
      ...defaultProps,
      caseConnectors,
    };

    renderUserActions(props);

    await waitForComponentToUpdate();

    expect(await screen.findByTestId('top-footer')).toBeInTheDocument();
    expect(await screen.findByTestId('bottom-footer')).toBeInTheDocument();
  });

  it('Renders service now update line with top only when push is up to date', async () => {
    const ourActions = [
      getUserAction('pushed', 'push_to_service', {
        createdAt: '2023-01-17T09:46:29.813Z',
      }),
    ];

    useFindCaseUserActionsMock.mockReturnValue({
      ...defaultUseFindCaseUserActions,
      data: { userActions: ourActions },
    });

    renderUserActions();

    expect(await screen.findByTestId('top-footer')).toBeInTheDocument();
    expect(screen.queryByTestId('bottom-footer')).not.toBeInTheDocument();
  });

  it('Switches to markdown when edit is clicked and back to panel when canceled', async () => {
    renderUserActions();

    await userEvent.click(
      await within(await screen.findByTestId(unifiedCommentTestId)).findByTestId(
        'property-actions-user-action-ellipses'
      )
    );

    await waitForEuiPopoverOpen();

    await userEvent.click(await screen.findByTestId('property-actions-user-action-pencil'));

    await userEvent.click(
      await within(await screen.findByTestId(unifiedCommentTestId)).findByTestId(
        'editable-cancel-markdown'
      )
    );

    expect(
      within(await screen.findByTestId(unifiedCommentTestId)).queryByTestId(
        'editable-markdown-form'
      )
    ).not.toBeInTheDocument();
  });

  it('calls update comment when comment markdown is saved', async () => {
    renderUserActions();

    await userEvent.click(
      await within(await screen.findByTestId(unifiedCommentTestId)).findByTestId(
        'property-actions-user-action-ellipses'
      )
    );

    await waitForEuiPopoverOpen();

    await userEvent.click(await screen.findByTestId('property-actions-user-action-pencil'));

    await waitForComponentToUpdate();

    fireEvent.change((await screen.findAllByTestId(`euiMarkdownEditorTextArea`))[0], {
      target: { value: sampleData.content },
    });

    await userEvent.click(
      within(screen.getByTestId(unifiedCommentTestId)).getByTestId('editable-save-markdown')
    );

    expect(
      within(await screen.findByTestId(unifiedCommentTestId)).queryByTestId(
        'editable-markdown-form'
      )
    ).not.toBeInTheDocument();

    expect(patchComment).toBeCalledWith(
      {
        commentUpdate: sampleData.content,
        caseId: 'case-id',
        commentId: defaultProps.data.comments[0].id,
        version: defaultProps.data.comments[0].version,
      },
      { onSuccess: expect.anything(), onError: expect.anything() }
    );
  });

  it('shows quoted text in last MarkdownEditorTextArea', async () => {
    const quoteableText = `> Solve this fast! \n\n`;

    renderUserActions();

    expect((await screen.findByTestId(`euiMarkdownEditorTextArea`)).textContent).not.toContain(
      quoteableText
    );

    await userEvent.click(
      await within(await screen.findByTestId(unifiedCommentTestId)).findByTestId(
        'property-actions-user-action-ellipses'
      )
    );

    await waitForEuiPopoverOpen();

    await userEvent.click(await screen.findByTestId('property-actions-user-action-quote'));

    expect((await screen.findAllByTestId('add-comment'))[0].textContent).toContain(quoteableText);
  });

  it('does not show add comment markdown when history filter is selected', async () => {
    renderUserActions({
      ...defaultProps,
      userActivityQueryParams: { ...userActivityQueryParams, type: 'action' },
    });

    expect(screen.queryByTestId('add-comment')).not.toBeInTheDocument();
  });
});
