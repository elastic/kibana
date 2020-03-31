/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CaseProps } from '../index';
import { Case } from '../../../../../containers/case/types';

const updateCase = jest.fn();
const fetchCase = jest.fn();

export const caseProps: CaseProps = {
  caseId: '3c4ddcc0-4e99-11ea-9290-35d05cb55c15',
  userCanCrud: true,
  caseData: {
    closedAt: null,
    closedBy: null,
    id: '3c4ddcc0-4e99-11ea-9290-35d05cb55c15',
    comments: [
      {
        comment: 'Solve this fast!',
        id: 'a357c6a0-5435-11ea-b427-fb51a1fcb7b8',
        createdAt: '2020-02-20T23:06:33.798Z',
        createdBy: {
          fullName: 'Steph Milovic',
          username: 'smilovic',
          email: 'notmyrealemailfool@elastic.co',
        },
        pushedAt: null,
        pushedBy: null,
        updatedAt: '2020-02-20T23:06:33.798Z',
        updatedBy: {
          username: 'elastic',
        },
        version: 'WzQ3LDFd',
      },
    ],
    createdAt: '2020-02-13T19:44:23.627Z',
    createdBy: { fullName: null, email: 'testemail@elastic.co', username: 'elastic' },
    description: 'Security banana Issue',
    externalService: null,
    status: 'open',
    tags: ['defacement'],
    title: 'Another horrible breach!!',
    totalComment: 1,
    updatedAt: '2020-02-19T15:02:57.995Z',
    updatedBy: {
      username: 'elastic',
    },
    version: 'WzQ3LDFd',
  },
  fetchCase,
  updateCase,
};

export const caseClosedProps: CaseProps = {
  ...caseProps,
  caseData: {
    ...caseProps.caseData,
    closedAt: '2020-02-20T23:06:33.798Z',
    closedBy: {
      username: 'elastic',
    },
    status: 'closed',
  },
};

export const data: Case = {
  ...caseProps.caseData,
};

export const dataClosed: Case = {
  ...caseClosedProps.caseData,
};

export const caseUserActions = [
  {
    actionField: ['comment'],
    action: 'create',
    actionAt: '2020-03-20T17:10:09.814Z',
    actionBy: {
      fullName: 'Steph Milovic',
      username: 'smilovic',
      email: 'notmyrealemailfool@elastic.co',
    },
    newValue: 'Solve this fast!',
    oldValue: null,
    actionId: '3c4ddcc0-4e99-11ea-9290-35d05cb55c15',
    caseId: '9b833a50-6acd-11ea-8fad-af86b1071bd9',
    commentId: 'a357c6a0-5435-11ea-b427-fb51a1fcb7b8',
  },
];
