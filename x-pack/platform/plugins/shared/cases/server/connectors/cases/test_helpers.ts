/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesClientMock } from '../../client/mocks';

export const expectCasesToHaveTheCorrectAlertsAttachedWithGrouping = (
  casesClientMock: CasesClientMock
) => {
  expect(casesClientMock.attachments.bulkCreate).toHaveBeenCalledTimes(3);

  expect(casesClientMock.attachments.bulkCreate).nthCalledWith(1, {
    caseId: 'mock-id-1',
    attachments: [
      {
        alertId: ['alert-id-0', 'alert-id-2'],
        index: ['alert-index-0', 'alert-index-2'],
        owner: 'securitySolution',
        rule: {
          id: 'rule-test-id',
          name: 'Test rule',
        },
        type: 'alert',
      },
    ],
  });

  expect(casesClientMock.attachments.bulkCreate).nthCalledWith(2, {
    caseId: 'mock-id-2',
    attachments: [
      {
        alertId: ['alert-id-1'],
        index: ['alert-index-1'],
        owner: 'securitySolution',
        rule: {
          id: 'rule-test-id',
          name: 'Test rule',
        },
        type: 'alert',
      },
    ],
  });

  expect(casesClientMock.attachments.bulkCreate).nthCalledWith(3, {
    caseId: 'mock-id-3',
    attachments: [
      {
        alertId: ['alert-id-3'],
        index: ['alert-index-3'],
        owner: 'securitySolution',
        rule: {
          id: 'rule-test-id',
          name: 'Test rule',
        },
        type: 'alert',
      },
    ],
  });
};

export const expectCasesToHaveTheCorrectAlertsAttachedWithGroupingAndIncreasedCounter = (
  casesClientMock: CasesClientMock
) => {
  expect(casesClientMock.attachments.bulkCreate).toHaveBeenCalledTimes(3);

  expect(casesClientMock.attachments.bulkCreate).nthCalledWith(1, {
    caseId: 'mock-id-1',
    attachments: [
      {
        alertId: ['alert-id-1'],
        index: ['alert-index-1'],
        owner: 'securitySolution',
        rule: {
          id: 'rule-test-id',
          name: 'Test rule',
        },
        type: 'alert',
      },
    ],
  });

  expect(casesClientMock.attachments.bulkCreate).nthCalledWith(2, {
    caseId: 'mock-id-2',
    attachments: [
      {
        alertId: ['alert-id-3'],
        index: ['alert-index-3'],
        owner: 'securitySolution',
        rule: {
          id: 'rule-test-id',
          name: 'Test rule',
        },
        type: 'alert',
      },
    ],
  });

  expect(casesClientMock.attachments.bulkCreate).nthCalledWith(3, {
    caseId: 'mock-id-4',
    attachments: [
      {
        alertId: ['alert-id-0', 'alert-id-2'],
        index: ['alert-index-0', 'alert-index-2'],
        owner: 'securitySolution',
        rule: {
          id: 'rule-test-id',
          name: 'Test rule',
        },
        type: 'alert',
      },
    ],
  });
};
