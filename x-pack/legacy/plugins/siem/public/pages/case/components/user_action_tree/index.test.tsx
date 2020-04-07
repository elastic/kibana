/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { Router, routeData, mockHistory } from '../__mock__/router';
import { UserActionTree } from './';
import { TestProviders } from '../../../../mock';
import { UserActionField } from '../../../../../../../../plugins/case/common/api/cases';

const fetchUserActions = jest.fn();
const onUpdateField = jest.fn();
const updateCase = jest.fn();
const defaultProps = {
  data: {
    id: '89bae2b0-74f4-11ea-a8d2-2bcd64fb2cdd',
    version: 'WzcxNiwxXQ==',
    comments: [],
    totalComment: 0,
    description: 'This looks not so good',
    title: 'Bad meanie defacing data',
    tags: ['defacement'],
    closedAt: null,
    closedBy: null,
    createdAt: '2020-04-02T15:13:41.925Z',
    createdBy: {
      email: 'Steph.milovic@elastic.co',
      fullName: 'Steph Milovic',
      username: 'smilovic',
    },
    externalService: null,
    status: 'open',
    updatedAt: null,
    updatedBy: null,
  },
  caseUserActions: [],
  firstIndexPushToService: -1,
  isLoadingDescription: false,
  isLoadingUserActions: false,
  lastIndexPushToService: -1,
  userCanCrud: true,
  fetchUserActions,
  onUpdateField,
  updateCase,
};

describe.skip('UserActionTree ', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(routeData, 'useParams').mockReturnValue({ commentId: '123' });
  });

  it('Loading spinner when user actions loading', async () => {
    const props = defaultProps;
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <UserActionTree {...{ ...props, isLoadingUserActions: true }} />
        </Router>
      </TestProviders>
    );
    expect(wrapper.find(`[data-test-subj="user-actions-loading"]`).exists()).toBeTruthy();
  });
  it.only('Renders user action items', async () => {
    const commentAction = {
      actionField: [('comment' as unknown) as UserActionField['comment']],
      action: 'create',
      actionAt: '2020-04-06T21:54:19.459Z',
      actionBy: { email: '', fullName: '', username: 'casetester3' },
      newValue: 'sdfsd',
      oldValue: null,
      actionId: '2b825fb0-7851-11ea-8b3c-092fb98f129e',
      caseId: '89bae2b0-74f4-11ea-a8d2-2bcd64fb2cdd',
      commentId: '2adcf7f0-7851-11ea-8b3c-092fb98f129e',
    };
    const props = {
      ...defaultProps,
      caseUserActions: [commentAction],
    };
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <UserActionTree {...props} />
        </Router>
      </TestProviders>
    );
    expect(
      wrapper
        .find(`[data-test-subj="comment-action"] [data-test-subj="user-action-title"] strong`)
        .text()
    ).toEqual(commentAction.actionBy.username);
  });
});
