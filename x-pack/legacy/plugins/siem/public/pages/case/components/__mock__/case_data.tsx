/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CaseProps } from '../case_view';
import { Case, Comment, SortFieldCase } from '../../../../containers/case/types';
import { UseGetCasesState } from '../../../../containers/case/use_get_cases';
import { UserAction, UserActionField } from '../../../../../../../../plugins/case/common/api/cases';

const updateCase = jest.fn();
const fetchCase = jest.fn();

const basicCaseId = 'basic-case-id';
const basicCommentId = 'basic-comment-id';
const basicCreatedAt = '2020-02-20T23:06:33.798Z';
const elasticUser = {
  fullName: 'Leslie Knope',
  username: 'lknope',
  email: 'leslie.knope@elastic.co',
};

export const basicComment: Comment = {
  comment: 'Solve this fast!',
  id: basicCommentId,
  createdAt: basicCreatedAt,
  createdBy: elasticUser,
  pushedAt: null,
  pushedBy: null,
  updatedAt: '2020-02-20T23:06:33.798Z',
  updatedBy: {
    username: 'elastic',
  },
  version: 'WzQ3LDFc',
};

export const basicCase: Case = {
  closedAt: null,
  closedBy: null,
  id: basicCaseId,
  comments: [basicComment],
  createdAt: '2020-02-13T19:44:23.627Z',
  createdBy: elasticUser,
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
};

export const caseProps: CaseProps = {
  caseId: basicCaseId,
  userCanCrud: true,
  caseData: basicCase,
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

export const basicCaseClosed: Case = {
  ...caseClosedProps.caseData,
};

const basicAction = {
  actionAt: basicCreatedAt,
  actionBy: elasticUser,
  oldValue: null,
  newValue: 'what a cool value',
  caseId: basicCaseId,
  commentId: null,
};
export const caseUserActions = [
  {
    ...basicAction,
    actionBy: elasticUser,
    actionField: ['comment'],
    action: 'create',
    actionId: 'tt',
  },
];

export const useGetCasesMockState: UseGetCasesState = {
  data: {
    countClosedCases: 0,
    countOpenCases: 5,
    cases: [
      basicCase,
      {
        closedAt: null,
        closedBy: null,
        id: '362a5c10-4e99-11ea-9290-35d05cb55c15',
        createdAt: '2020-02-13T19:44:13.328Z',
        createdBy: { username: 'elastic' },
        comments: [],
        description: 'Security banana Issue',
        externalService: {
          pushedAt: '2020-02-13T19:45:01.901Z',
          pushedBy: 'elastic',
          connectorId: 'string',
          connectorName: 'string',
          externalId: 'string',
          externalTitle: 'string',
          externalUrl: 'string',
        },
        status: 'open',
        tags: ['phishing'],
        title: 'Bad email',
        totalComment: 0,
        updatedAt: '2020-02-13T15:45:01.901Z',
        updatedBy: { username: 'elastic' },
        version: 'WzQ3LDFd',
      },
      {
        closedAt: null,
        closedBy: null,
        id: '34f8b9e0-4e99-11ea-9290-35d05cb55c15',
        createdAt: '2020-02-13T19:44:11.328Z',
        createdBy: { username: 'elastic' },
        comments: [],
        description: 'Security banana Issue',
        externalService: {
          pushedAt: '2020-02-13T19:45:01.901Z',
          pushedBy: 'elastic',
          connectorId: 'string',
          connectorName: 'string',
          externalId: 'string',
          externalTitle: 'string',
          externalUrl: 'string',
        },
        status: 'open',
        tags: ['phishing'],
        title: 'Bad email',
        totalComment: 0,
        updatedAt: '2020-02-14T19:45:01.901Z',
        updatedBy: { username: 'elastic' },
        version: 'WzQ3LDFd',
      },
      {
        closedAt: '2020-02-13T19:44:13.328Z',
        closedBy: { username: 'elastic' },
        id: '31890e90-4e99-11ea-9290-35d05cb55c15',
        createdAt: '2020-02-13T19:44:05.563Z',
        createdBy: { username: 'elastic' },
        comments: [],
        description: 'Security banana Issue',
        externalService: null,
        status: 'closed',
        tags: ['phishing'],
        title: 'Uh oh',
        totalComment: 0,
        updatedAt: null,
        updatedBy: null,
        version: 'WzQ3LDFd',
      },
      {
        closedAt: null,
        closedBy: null,
        id: '2f5b3210-4e99-11ea-9290-35d05cb55c15',
        createdAt: '2020-02-13T19:44:01.901Z',
        createdBy: { username: 'elastic' },
        comments: [],
        description: 'Security banana Issue',
        externalService: null,
        status: 'open',
        tags: ['phishing'],
        title: 'Uh oh',
        totalComment: 0,
        updatedAt: null,
        updatedBy: null,
        version: 'WzQ3LDFd',
      },
    ],
    page: 1,
    perPage: 5,
    total: 10,
  },
  loading: [],
  selectedCases: [],
  isError: false,
  queryParams: {
    page: 1,
    perPage: 5,
    sortField: SortFieldCase.createdAt,
    sortOrder: 'desc',
  },
  filterOptions: { search: '', reporters: [], tags: [], status: 'open' },
};

const basicPush = {
  connector_id: 'connector_id',
  connector_name: 'connector name',
  external_id: 'external_id',
  external_title: 'external title',
  external_url: 'basicPush.com',
  pushed_at: basicCreatedAt,
  pushed_by: elasticUser,
};
export const getUserAction = (af: UserActionField, a: UserAction) => ({
  ...basicAction,
  actionId: `${af[0]}-${a}`,
  actionField: af,
  action: a,
  commentId: af[0] === 'comment' ? basicCommentId : null,
  newValue:
    a === 'push-to-service' && af[0] === 'pushed'
      ? JSON.stringify(basicPush)
      : basicAction.newValue,
});
