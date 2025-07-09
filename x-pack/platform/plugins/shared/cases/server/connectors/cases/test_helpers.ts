/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesClientMock } from '../../client/mocks';

export const expectCasesToHaveTheCorrectAlertsAttachedWithGrouping = (
  casesClientMock: CasesClientMock,
  isAssistant = false
) => {
  expect(casesClientMock.attachments.bulkCreate).toHaveBeenCalledTimes(3);

  expect(casesClientMock.attachments.bulkCreate).nthCalledWith(1, {
    caseId: 'mock-id-1',
    isAssistant,
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
    isAssistant,
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
    isAssistant,
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
  casesClientMock: CasesClientMock,
  isAssistant = false
) => {
  expect(casesClientMock.attachments.bulkCreate).toHaveBeenCalledTimes(3);

  expect(casesClientMock.attachments.bulkCreate).nthCalledWith(1, {
    caseId: 'mock-id-1',
    isAssistant,
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
    isAssistant,
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
    isAssistant,
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

export const expectCasesToHaveTheCorrectAlertsAttachedWithPredefinedGrouping = (
  casesClientMock: CasesClientMock,
  isAssistant = false
) => {
  expect(casesClientMock.attachments.bulkCreate).toHaveBeenCalledTimes(3);

  expect(casesClientMock.attachments.bulkCreate).nthCalledWith(1, {
    caseId: 'mock-id-1',
    isAssistant,
    attachments: [
      { comment: 'comment-1', owner: 'securitySolution', type: 'user' },
      {
        alertId: ['alert-id-1', 'alert-id-2'],
        index: ['alert-index-1', 'alert-index-1'],
        owner: 'securitySolution',
        rule: { id: null, name: null },
        type: 'alert',
      },
    ],
  });

  expect(casesClientMock.attachments.bulkCreate).nthCalledWith(2, {
    caseId: 'mock-id-2',
    isAssistant,
    attachments: [
      { comment: 'comment-2', owner: 'securitySolution', type: 'user' },
      { comment: 'comment-3', owner: 'securitySolution', type: 'user' },
      {
        alertId: ['alert-id-3', 'alert-id-4'],
        index: ['alert-index-2', 'alert-index-2'],
        owner: 'securitySolution',
        rule: { id: null, name: null },
        type: 'alert',
      },
    ],
  });

  expect(casesClientMock.attachments.bulkCreate).nthCalledWith(3, {
    caseId: 'mock-id-3',
    isAssistant,
    attachments: [
      {
        alertId: ['alert-id-5'],
        index: ['alert-index-3'],
        owner: 'securitySolution',
        rule: { id: null, name: null },
        type: 'alert',
      },
    ],
  });
};
