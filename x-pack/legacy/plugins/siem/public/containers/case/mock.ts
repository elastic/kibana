/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ActionLicense,
  AllCases,
  BulkUpdateStatus,
  Case,
  CasesStatus,
  CaseUserActions,
  Comment,
  FetchCasesProps,
  SortFieldCase,
} from './types';

import {
  CommentResponse,
  CaseExternalServiceRequest,
  CasePatchRequest,
  CasePostRequest,
  CommentRequest,
  ServiceConnectorCaseParams,
  ServiceConnectorCaseResponse,
  Status,
  UserAction,
  UserActionField,
  CaseResponse,
  CasesStatusResponse,
  CaseUserActionsResponse,
  CasesResponse,
  CasesFindResponse,
} from '../../../../../../plugins/case/common/api/cases';

export const basicCaseId = 'basic-case-id';
const basicCommentId = 'basic-comment-id';
const basicCreatedAt = '2020-02-20T23:06:33.798Z';
const basicUpdatedAt = '2020-02-19T15:02:57.995Z';
export const elasticUser = {
  fullName: 'Leslie Knope',
  username: 'lknope',
  email: 'leslie.knope@elastic.co',
};

export const elasticUserSnake = {
  full_name: 'Leslie Knope',
  username: 'lknope',
  email: 'leslie.knope@elastic.co',
};

export const tags: string[] = ['coke', 'pepsi'];

export const basicComment: Comment = {
  comment: 'Solve this fast!',
  id: basicCommentId,
  createdAt: basicCreatedAt,
  createdBy: elasticUser,
  pushedAt: null,
  pushedBy: null,
  updatedAt: null,
  updatedBy: null,
  version: 'WzQ3LDFc',
};

export const basicCase: Case = {
  closedAt: null,
  closedBy: null,
  id: basicCaseId,
  comments: [basicComment],
  createdAt: basicCreatedAt,
  createdBy: elasticUser,
  description: 'Security banana Issue',
  externalService: null,
  status: 'open',
  tags,
  title: 'Another horrible breach!!',
  totalComment: 1,
  updatedAt: basicUpdatedAt,
  updatedBy: elasticUser,
  version: 'WzQ3LDFd',
};
export const basicCommentSnake: CommentResponse = {
  ...basicComment,
  comment: 'Solve this fast!',
  id: basicCommentId,
  created_at: basicCreatedAt,
  created_by: elasticUserSnake,
  pushed_at: null,
  pushed_by: null,
  updated_at: null,
  updated_by: null,
};

export const basicCaseSnake: CaseResponse = {
  ...basicCase,
  status: 'open' as Status,
  closed_at: null,
  closed_by: null,
  comments: [basicCommentSnake],
  created_at: basicCreatedAt,
  created_by: elasticUserSnake,
  external_service: null,
  updated_at: basicUpdatedAt,
  updated_by: elasticUserSnake,
};

export const basicCasePost: Case = {
  ...basicCase,
  updatedAt: null,
  updatedBy: null,
};

export const basicCommentPatch: Comment = {
  ...basicComment,
  updatedAt: basicUpdatedAt,
  updatedBy: {
    username: 'elastic',
  },
};

export const basicCaseCommentPatch = {
  ...basicCase,
  comments: [basicCommentPatch],
};

export const casesStatus: CasesStatus = {
  countClosedCases: 130,
  countOpenCases: 20,
};

export const casesStatusSnake: CasesStatusResponse = {
  count_closed_cases: 130,
  count_open_cases: 20,
};

export const reporters: string[] = ['alexis', 'kim', 'maria', 'steph'];
export const respReporters = [
  { username: 'alexis' },
  { username: 'kim' },
  { username: 'maria' },
  { username: 'steph' },
];
export const push = {
  connector_id: 'connector_id',
  connector_name: 'connector name',
  external_id: 'external_id',
  external_title: 'external title',
  external_url: 'basicPush.com',
};
const basicPush = {
  ...push,
  pushed_at: basicUpdatedAt,
  pushed_by: elasticUserSnake,
};

export const basicPushCaseSnake = {
  ...basicCaseSnake,
  external_service: basicPush,
};

const basicPushCamel = {
  connectorId: 'connector_id',
  connectorName: 'connector name',
  externalId: 'external_id',
  externalTitle: 'external title',
  externalUrl: 'basicPush.com',
  pushedAt: basicUpdatedAt,
  pushedBy: elasticUser,
};

export const pushedCase: Case = {
  ...basicCase,
  externalService: basicPushCamel,
  status: 'open',
  tags,
  title: 'Another horrible breach!!',
  totalComment: 1,
  updatedAt: basicUpdatedAt,
  updatedBy: elasticUser,
  version: 'WzQ3LDFd',
};

export const serviceConnector: ServiceConnectorCaseResponse = {
  number: '123',
  incidentId: '444',
  pushedDate: basicUpdatedAt,
  url: 'connector.com',
  comments: [
    {
      commentId: basicCommentId,
      pushedDate: basicUpdatedAt,
    },
  ],
};

const basicAction = {
  actionAt: basicCreatedAt,
  actionBy: elasticUser,
  oldValue: null,
  newValue: 'what a cool value',
  caseId: basicCaseId,
  commentId: null,
};

export const casePushParams = {
  actionBy: elasticUser,
  caseId: basicCaseId,
  createdAt: basicCreatedAt,
  createdBy: elasticUser,
  incidentId: null,
  title: 'what a cool value',
  commentId: null,
  updatedAt: basicCreatedAt,
  updatedBy: elasticUser,
  description: 'nice',
};
export const actionTypeExecutorResult = {
  actionId: 'string',
  status: 'ok',
  data: serviceConnector,
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

const basicActionSnake = {
  action_at: basicCreatedAt,
  action_by: elasticUserSnake,
  old_value: null,
  new_value: 'what a cool value',
  case_id: basicCaseId,
  comment_id: null,
};
export const getUserActionSnake = (af: UserActionField, a: UserAction) => ({
  ...basicActionSnake,
  action_id: `${af[0]}-${a}`,
  action_field: af,
  action: a,
  comment_id: af[0] === 'comment' ? basicCommentId : null,
  new_value:
    a === 'push-to-service' && af[0] === 'pushed'
      ? JSON.stringify(basicPush)
      : basicAction.newValue,
});

export const caseUserActions: CaseUserActions[] = [
  getUserAction(['description'], 'create'),
  getUserAction(['comment'], 'create'),
  getUserAction(['description'], 'update'),
];
export const caseUserActionsSnake: CaseUserActionsResponse = [
  getUserActionSnake(['description'], 'create'),
  getUserActionSnake(['comment'], 'create'),
  getUserActionSnake(['description'], 'update'),
];

export const cases: Case[] = [
  basicCase,
  { ...basicCase, id: '1', totalComment: 0, comments: [] },
  { ...basicCase, id: '2', totalComment: 0, comments: [] },
  { ...basicCase, id: '3', totalComment: 0, comments: [] },
  { ...basicCase, id: '4', totalComment: 0, comments: [] },
];

export const allCases: AllCases = {
  cases,
  page: 1,
  perPage: 5,
  total: 20,
  ...casesStatus,
};

export const casesSnake: CasesResponse = [
  basicCaseSnake,
  { ...basicCaseSnake, id: '1', totalComment: 0, comments: [] },
  { ...basicCaseSnake, id: '2', totalComment: 0, comments: [] },
  { ...basicCaseSnake, id: '3', totalComment: 0, comments: [] },
  { ...basicCaseSnake, id: '4', totalComment: 0, comments: [] },
];

export const allCasesSnake: CasesFindResponse = {
  cases: casesSnake,
  page: 1,
  per_page: 5,
  total: 20,
  ...casesStatusSnake,
};
export const actionLicenses: ActionLicense[] = [
  {
    id: '.servicenow',
    name: 'ServiceNow',
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
  },
];
