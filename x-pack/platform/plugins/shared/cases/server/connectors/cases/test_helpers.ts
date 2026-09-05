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

  expect(casesClientMock.attachments.bulkCreate).toHaveBeenNthCalledWith(1, {
    caseId: 'mock-id-1',
    attachments: [
      {
        attachmentId: ['alert-id-0', 'alert-id-2'],
        metadata: {
          index: ['alert-index-0', 'alert-index-2'],
          rule: {
            id: 'rule-test-id',
            name: 'Test rule',
          },
        },
        owner: 'securitySolution',
        type: 'security.alert',
      },
    ],
  });

  expect(casesClientMock.attachments.bulkCreate).toHaveBeenNthCalledWith(2, {
    caseId: 'mock-id-2',
    attachments: [
      {
        attachmentId: ['alert-id-1'],
        metadata: {
          index: ['alert-index-1'],
          rule: {
            id: 'rule-test-id',
            name: 'Test rule',
          },
        },
        owner: 'securitySolution',
        type: 'security.alert',
      },
    ],
  });

  expect(casesClientMock.attachments.bulkCreate).toHaveBeenNthCalledWith(3, {
    caseId: 'mock-id-3',
    attachments: [
      {
        attachmentId: ['alert-id-3'],
        metadata: {
          index: ['alert-index-3'],
          rule: {
            id: 'rule-test-id',
            name: 'Test rule',
          },
        },
        owner: 'securitySolution',
        type: 'security.alert',
      },
    ],
  });
};

export const expectCasesToHaveTheCorrectAlertsAttachedWithGroupingAndIncreasedCounter = (
  casesClientMock: CasesClientMock
) => {
  expect(casesClientMock.attachments.bulkCreate).toHaveBeenCalledTimes(3);

  expect(casesClientMock.attachments.bulkCreate).toHaveBeenNthCalledWith(1, {
    caseId: 'mock-id-1',
    attachments: [
      {
        attachmentId: ['alert-id-1'],
        metadata: {
          index: ['alert-index-1'],
          rule: {
            id: 'rule-test-id',
            name: 'Test rule',
          },
        },
        owner: 'securitySolution',
        type: 'security.alert',
      },
    ],
  });

  expect(casesClientMock.attachments.bulkCreate).toHaveBeenNthCalledWith(2, {
    caseId: 'mock-id-2',
    attachments: [
      {
        attachmentId: ['alert-id-3'],
        metadata: {
          index: ['alert-index-3'],
          rule: {
            id: 'rule-test-id',
            name: 'Test rule',
          },
        },
        owner: 'securitySolution',
        type: 'security.alert',
      },
    ],
  });

  expect(casesClientMock.attachments.bulkCreate).toHaveBeenNthCalledWith(3, {
    caseId: 'mock-id-4',
    attachments: [
      {
        attachmentId: ['alert-id-0', 'alert-id-2'],
        metadata: {
          index: ['alert-index-0', 'alert-index-2'],
          rule: {
            id: 'rule-test-id',
            name: 'Test rule',
          },
        },
        owner: 'securitySolution',
        type: 'security.alert',
      },
    ],
  });
};

export const expectCasesToHaveTheCorrectAlertsAttachedWithPredefinedGrouping = (
  casesClientMock: CasesClientMock
) => {
  expect(casesClientMock.attachments.bulkCreate).toHaveBeenCalledTimes(3);

  expect(casesClientMock.attachments.bulkCreate).toHaveBeenNthCalledWith(1, {
    caseId: 'mock-id-1',
    attachments: [
      { data: { content: 'comment-1' }, owner: 'securitySolution', type: 'comment' },
      {
        attachmentId: ['alert-id-1', 'alert-id-2'],
        metadata: {
          index: ['alert-index-1', 'alert-index-1'],
          rule: { id: null, name: null },
        },
        owner: 'securitySolution',
        type: 'security.alert',
      },
    ],
  });

  expect(casesClientMock.attachments.bulkCreate).toHaveBeenNthCalledWith(2, {
    caseId: 'mock-id-2',
    attachments: [
      { data: { content: 'comment-2' }, owner: 'securitySolution', type: 'comment' },
      { data: { content: 'comment-3' }, owner: 'securitySolution', type: 'comment' },
      {
        attachmentId: ['alert-id-3', 'alert-id-4'],
        metadata: {
          index: ['alert-index-2', 'alert-index-2'],
          rule: { id: null, name: null },
        },
        owner: 'securitySolution',
        type: 'security.alert',
      },
    ],
  });

  expect(casesClientMock.attachments.bulkCreate).toHaveBeenNthCalledWith(3, {
    caseId: 'mock-id-3',
    attachments: [
      {
        attachmentId: ['alert-id-5'],
        metadata: {
          index: ['alert-index-3'],
          rule: { id: null, name: null },
        },
        owner: 'securitySolution',
        type: 'security.alert',
      },
    ],
  });
};
