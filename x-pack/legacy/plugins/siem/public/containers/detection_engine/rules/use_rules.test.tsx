/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useRules, UseRules, ReturnRules } from './use_rules';
import * as api from './api';

jest.mock('./api');

describe('useRules', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  test('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<UseRules, ReturnRules>(props =>
        useRules({
          pagination: {
            page: 1,
            perPage: 10,
            total: 100,
          },
          filterOptions: {
            filter: '',
            sortField: 'created_at',
            sortOrder: 'desc',
          },
        })
      );
      await waitForNextUpdate();
      expect(result.current).toEqual([true, null, result.current[2]]);
    });
  });

  test('fetch rules', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<UseRules, ReturnRules>(() =>
        useRules({
          pagination: {
            page: 1,
            perPage: 10,
            total: 100,
          },
          filterOptions: {
            filter: '',
            sortField: 'created_at',
            sortOrder: 'desc',
          },
        })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual([
        false,
        {
          data: [
            {
              created_at: '2020-02-14T19:49:28.178Z',
              created_by: 'elastic',
              description:
                'Elastic Endpoint detected Credential Dumping. Click the Elastic Endpoint icon in the event.module column or the link in the rule.reference column in the External Alerts tab of the SIEM Detections page for additional information.',
              enabled: false,
              false_positives: [],
              filters: [],
              from: 'now-660s',
              id: '80c59768-8e1f-400e-908e-7b25c4ce29c3',
              immutable: true,
              index: ['endgame-*'],
              interval: '10m',
              language: 'kuery',
              max_signals: 100,
              name: 'Credential Dumping - Detected - Elastic Endpoint',
              output_index: '.siem-signals-default',
              query:
                'event.kind:alert and event.module:endgame and event.action:cred_theft_event and endgame.metadata.type:detection',
              references: [],
              risk_score: 73,
              rule_id: '571afc56-5ed9-465d-a2a9-045f099f6e7e',
              severity: 'high',
              tags: ['Elastic', 'Endpoint'],
              threat: [],
              to: 'now',
              type: 'query',
              updated_at: '2020-02-14T19:49:28.320Z',
              updated_by: 'elastic',
              version: 1,
            },
            {
              created_at: '2020-02-14T19:49:28.189Z',
              created_by: 'elastic',
              description:
                'Elastic Endpoint detected an Adversary Behavior. Click the Elastic Endpoint icon in the event.module column or the link in the rule.reference column in the External Alerts tab of the SIEM Detections page for additional information.',
              enabled: false,
              false_positives: [],
              filters: [],
              from: 'now-660s',
              id: '2e846086-bd64-4dbc-9c56-42b46b5b2c8c',
              immutable: true,
              index: ['endgame-*'],
              interval: '10m',
              language: 'kuery',
              max_signals: 100,
              name: 'Adversary Behavior - Detected - Elastic Endpoint',
              output_index: '.siem-signals-default',
              query:
                'event.kind:alert and event.module:endgame and event.action:rules_engine_event',
              references: [],
              risk_score: 47,
              rule_id: '77a3c3df-8ec4-4da4-b758-878f551dee69',
              severity: 'medium',
              tags: ['Elastic', 'Endpoint'],
              threat: [],
              to: 'now',
              type: 'query',
              updated_at: '2020-02-14T19:49:28.326Z',
              updated_by: 'elastic',
              version: 1,
            },
          ],
          page: 1,
          perPage: 2,
          total: 2,
        },
        result.current[2],
      ]);
    });
  });

  test('re-fetch rules', async () => {
    const spyOnfetchRules = jest.spyOn(api, 'fetchRules');
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<UseRules, ReturnRules>(id =>
        useRules({
          pagination: {
            page: 1,
            perPage: 10,
            total: 100,
          },
          filterOptions: {
            filter: '',
            sortField: 'created_at',
            sortOrder: 'desc',
          },
        })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      if (result.current[2]) {
        result.current[2]();
      }
      await waitForNextUpdate();
      expect(spyOnfetchRules).toHaveBeenCalledTimes(2);
    });
  });

  test('fetch rules if props changes', async () => {
    const spyOnfetchRules = jest.spyOn(api, 'fetchRules');
    await act(async () => {
      const { rerender, waitForNextUpdate } = renderHook<UseRules, ReturnRules>(
        args => useRules(args),
        {
          initialProps: {
            pagination: {
              page: 1,
              perPage: 10,
              total: 100,
            },
            filterOptions: {
              filter: '',
              sortField: 'created_at',
              sortOrder: 'desc',
            },
          },
        }
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      rerender({
        pagination: {
          page: 1,
          perPage: 10,
          total: 100,
        },
        filterOptions: {
          filter: 'hello world',
          sortField: 'created_at',
          sortOrder: 'desc',
        },
      });
      await waitForNextUpdate();
      expect(spyOnfetchRules).toHaveBeenCalledTimes(2);
    });
  });
});
