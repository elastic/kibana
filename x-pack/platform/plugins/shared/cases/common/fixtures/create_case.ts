/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const createCaseRequestFixture = {
  title: 'My new case',
  description: 'A description',
  tags: ['new', 'case'],
  connector: {
    id: 'none',
    name: 'none',
    type: '.none',
    fields: null,
  },
  settings: {
    syncAlerts: true,
    extractObservables: true,
  },
  owner: 'securitySolution',
};

export const createCaseResponseFixture = {
  id: 'case-1',
  owner: 'securitySolution',
  title: 'Another horrible breach!!',
  description: 'Security banana Issue',
  tags: ['coke', 'pepsi'],
  status: 'open',
  severity: 'low',
  connector: {
    id: 'none',
    name: 'My Connector',
    type: '.none',
    fields: null,
  },
  settings: {
    syncAlerts: true,
    extractObservables: false,
  },
  comments: [
    {
      comment: 'Solve this fast!',
      type: 'user',
      id: 'basic-comment-id',
      created_at: '2020-02-19T23:06:33.798Z',
      created_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
      owner: 'securitySolution',
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
      version: 'WzQ3LDFc',
    },
  ],
  created_at: '2020-02-19T23:06:33.798Z',
  created_by: {
    full_name: 'Leslie Knope',
    username: 'lknope',
    email: 'leslie.knope@elastic.co',
  },
  updated_at: '2020-02-20T15:02:57.995Z',
  updated_by: {
    full_name: 'Leslie Knope',
    username: 'lknope',
    email: 'leslie.knope@elastic.co',
  },
  closed_at: null,
  closed_by: null,
  external_service: null,
  duration: null,
  totalAlerts: 0,
  totalComment: 1,
  version: 'WzQ3LDFd',
};
