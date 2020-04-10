/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import {
  ActionLicense,
  AllCases,
  BulkUpdateStatus,
  Case,
  CasesStatus,
  CaseUserActions,
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
  User,
  UserAction,
  UserActionField,
} from '../../../../../../plugins/case/common/api/cases';
import { LicenseType } from '../../../../../../plugins/licensing/common/types';

const basicCaseId = 'basic-case-id';
const basicCommentId = 'basic-comment-id';
const basicCreatedAt = '2020-02-20T23:06:33.798Z';
const basicUpdatedAt = '2020-02-19T15:02:57.995Z';
const elasticUser = {
  fullName: 'Leslie Knope',
  username: 'lknope',
  email: 'leslie.knope@elastic.co',
};

export const tags: string[] = ['coke', 'pepsi'];

export const basicComment: CommentResponse = {
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
  updatedBy: {
    username: 'updateuser',
  },
  version: 'WzQ3LDFd',
};

export const basicCasePost: Case = {
  updatedAt: null,
  updatedBy: null,
};

export const basicCommentPatch: Case = {
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

export const reporters: string[] = ['alexis', 'kim', 'maria', 'steph'];
const basicPush = {
  connector_id: 'connector_id',
  connector_name: 'connector name',
  external_id: 'external_id',
  external_title: 'external title',
  external_url: 'basicPush.com',
  pushed_at: basicUpdatedAt,
  pushed_by: elasticUser.username,
};

const basicPushCamel = {
  connectorId: 'connector_id',
  connectorName: 'connector name',
  externalId: 'external_id',
  externalTitle: 'external title',
  externalUrl: 'basicPush.com',
  pushedAt: basicUpdatedAt,
  pushedBy: elasticUser.username,
};

export const pushedCase: Case = {
  ...basicCase,
  externalService: basicPushCamel,
  status: 'open',
  tags,
  title: 'Another horrible breach!!',
  totalComment: 1,
  updatedAt: basicUpdatedAt,
  updatedBy: {
    username: 'updateuser',
  },
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

export const caseUserActions: CaseUserActions[] = [
  getUserAction(['comment'], 'create'),
  getUserAction(['description'], 'update'),
];

const cases: Case[] = [
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
export const actionLicenses: ActionLicense[] = [
  {
    id: '.servicenow',
    name: 'ServiceNow',
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
  },
];
