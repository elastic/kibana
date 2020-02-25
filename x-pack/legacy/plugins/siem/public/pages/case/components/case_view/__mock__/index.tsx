/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CaseProps } from '../index';
import { Case } from '../../../../../containers/case/types';

export const caseProps: CaseProps = {
  caseId: '3c4ddcc0-4e99-11ea-9290-35d05cb55c15',
  initialData: {
    caseId: '3c4ddcc0-4e99-11ea-9290-35d05cb55c15',
    comments: [
      {
        comment: 'Solve this fast!',
        commentId: 'a357c6a0-5435-11ea-b427-fb51a1fcb7b8',
        createdAt: '2020-02-20T23:06:33.798Z',
        createdBy: {
          fullName: 'Steph Milovic',
          username: 'smilovic',
        },
        updatedAt: '2020-02-20T23:06:33.798Z',
        version: 'WzQ3LDFd',
      },
    ],
    createdAt: '2020-02-13T19:44:23.627Z',
    createdBy: { fullName: null, username: 'elastic' },
    description: 'Security banana Issue',
    state: 'open',
    tags: ['defacement'],
    title: 'Another horrible breach!!',
    updatedAt: '2020-02-19T15:02:57.995Z',
    version: 'WzQ3LDFd',
  },
};

export const data: Case = {
  caseId: '3c4ddcc0-4e99-11ea-9290-35d05cb55c15',
  comments: [
    {
      comment: 'Solve this fast!',
      commentId: 'a357c6a0-5435-11ea-b427-fb51a1fcb7b8',
      createdAt: '2020-02-20T23:06:33.798Z',
      createdBy: {
        fullName: 'Steph Milovic',
        username: 'smilovic',
      },
      updatedAt: '2020-02-20T23:06:33.798Z',
      version: 'WzQ3LDFd',
    },
  ],
  createdAt: '2020-02-13T19:44:23.627Z',
  createdBy: { username: 'elastic', fullName: null },
  description: 'Security banana Issue',
  state: 'open',
  tags: ['defacement'],
  title: 'Another horrible breach!!',
  updatedAt: '2020-02-19T15:02:57.995Z',
  version: 'WzQ3LDFd',
};
