/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import type { useKibana } from '../../common/lib/kibana';

export const DETAILS_QUERY = 'select * from uptime';
export const DETAILS_ID = 'test-id';
export const DETAILS_ACTION_ID = 'test-action-id';
export const DETAILS_DOCS_COUNT = 20;
export const DETAILS_TIMESTAMP = '2022-09-08T14:58:43.580Z';

export const defaultLiveQueryDetails = {
  data: {
    '@timestamp': DETAILS_TIMESTAMP,
    action_id: 'a77643d3-0876-4179-b077-24ed9f8c58f5',
    agents: ['e157a15c-6013-423b-a139-4eb41baf5be9'],
    expiration: '2022-09-08T15:03:43.580Z',
    queries: [
      {
        action_id: DETAILS_ACTION_ID,
        agents: ['e157a15c-6013-423b-a139-4eb41baf5be9'],
        docs: DETAILS_DOCS_COUNT,
        failed: 0,
        id: DETAILS_ID,
        pending: 0,
        query: DETAILS_QUERY,
        responded: 1,
        saved_query_id: 'osquery_manager-cebd7b00-b4b4-11ec-8f39-bf9c07530bbb',
        status: 'completed',
        successful: 1,
      },
    ],
    status: 'completed',
  },
} as never;

export const getMockedKibanaConfig = (permissionType: unknown) =>
  ({
    services: {
      application: {
        capabilities: permissionType,
      },
      cases: {
        helpers: {
          canUseCases: jest.fn().mockImplementation(() => ({
            read: true,
            update: true,
            push: true,
          })),
          getRuleIdFromEvent: jest.fn(),
        },
        ui: {
          getCasesContext: jest.fn().mockImplementation(() => mockCasesContext),
        },
        hooks: {
          useCasesAddToExistingCaseModal: jest.fn(),
        },
      },
      data: {
        dataViews: {
          getCanSaveSync: jest.fn(),
          hasData: {
            hasESData: jest.fn(),
            hasUserDataView: jest.fn(),
            hasDataView: jest.fn(),
          },
        },
      },
      notifications: {
        toasts: jest.fn(),
      },
    },
  } as unknown as ReturnType<typeof useKibana>);

export const mockCasesContext: FC<PropsWithChildren<unknown>> = (props) => (
  <>{props?.children ?? null}</>
);
