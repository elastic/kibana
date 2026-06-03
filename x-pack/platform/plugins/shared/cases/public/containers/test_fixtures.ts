/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseSeverity, CaseStatuses, ConnectorTypes } from '../../common/types/domain';
import type { CaseUI } from './types';

const elasticUser = {
  fullName: 'Leslie Knope',
  username: 'lknope',
  email: 'leslie.knope@elastic.co',
};

export const basicCaseFixture: CaseUI = {
  owner: 'securitySolution',
  closedAt: null,
  closedBy: null,
  id: 'basic-case-id',
  comments: [],
  createdAt: '2020-02-19T23:06:33.798Z',
  createdBy: elasticUser,
  connector: {
    id: 'none',
    name: 'My Connector',
    type: ConnectorTypes.none,
    fields: null,
  },
  duration: null,
  severity: CaseSeverity.LOW,
  description: 'Security banana Issue',
  externalService: null,
  status: CaseStatuses.open,
  tags: ['coke', 'pepsi'],
  title: 'Another horrible breach!!',
  totalComment: 0,
  totalAlerts: 0,
  totalEvents: 0,
  updatedAt: '2020-02-20T15:02:57.995Z',
  updatedBy: elasticUser,
  version: 'WzQ3LDFd',
  settings: {
    syncAlerts: true,
    extractObservables: true,
  },
  assignees: [],
  category: null,
  customFields: [],
  observables: [],
  totalObservables: 0,
  incrementalId: undefined,
};
