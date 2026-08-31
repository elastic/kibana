/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildActivityOrigin } from './build_activity_origin';
import {
  CASE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLES_WORKFLOW_ORIGIN_TYPE,
  ALERT_WORKFLOW_ORIGIN_TYPE,
  ALERTS_WORKFLOW_ORIGIN_TYPE,
} from '../../../common/types/domain/user_action/workflow/constants';
import type { Case } from '../../../common/types/domain';

const makeCase = (overrides: Partial<Case> = {}): Case =>
  ({
    id: 'case-1',
    version: '1',
    title: 'Test',
    description: '',
    status: 'open',
    severity: 'low',
    owner: 'cases',
    tags: [],
    assignees: [],
    customFields: [],
    observables: [],
    comments: [],
    totalAlerts: 0,
    totalComment: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdBy: { email: null, full_name: null, username: 'user' },
    updatedBy: null,
    closedAt: null,
    closedBy: null,
    externalService: null,
    connector: { id: 'none', name: 'none', type: '.none' as const, fields: null },
    settings: { syncAlerts: true },
    ...overrides,
  } as unknown as Case);

describe('buildActivityOrigin', () => {
  it('returns undefined when no origin was provided', () => {
    expect(buildActivityOrigin({ origin: undefined })).toBeUndefined();
  });

  describe('cases.case origin', () => {
    it('maps the API origin to the persisted activity shape', () => {
      const origin = { type: CASE_WORKFLOW_ORIGIN_TYPE, caseId: 'case-1' };
      expect(buildActivityOrigin({ origin, theCase: makeCase() })).toEqual({
        type: CASE_WORKFLOW_ORIGIN_TYPE,
        id: 'case-1',
      });
    });
  });

  describe('cases.alerts origin', () => {
    it('maps the API origin to the persisted activity shape', () => {
      const origin = { type: ALERTS_WORKFLOW_ORIGIN_TYPE, caseId: 'case-1' };
      expect(buildActivityOrigin({ origin, theCase: makeCase() })).toEqual({
        type: ALERTS_WORKFLOW_ORIGIN_TYPE,
        id: 'case-1',
      });
    });
  });

  describe('cases.observable origin', () => {
    it('adds typeKey and value from the matching observable', () => {
      const origin = {
        type: OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
        caseId: 'case-1',
        observableId: 'obs-1',
      };
      const theCase = makeCase({
        observables: [
          {
            id: 'obs-1',
            typeKey: 'ip',
            value: '1.2.3.4',
            description: null,
            createdAt: '',
            updatedAt: '',
          },
        ],
      });
      expect(buildActivityOrigin({ origin, theCase })).toEqual({
        type: OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
        id: 'obs-1',
        typeKey: 'ip',
        value: '1.2.3.4',
      });
    });

    it('returns the persisted origin without enrichment when observable is not found', () => {
      const origin = {
        type: OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
        caseId: 'case-1',
        observableId: 'missing',
      };
      expect(buildActivityOrigin({ origin, theCase: makeCase() })).toEqual({
        type: OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
        id: 'missing',
      });
    });
  });

  describe('cases.alert origin', () => {
    it('adds the index from a legacy v1 alert attachment', () => {
      const origin = {
        type: ALERT_WORKFLOW_ORIGIN_TYPE,
        caseId: 'case-1',
        alertId: 'alert-id',
      };
      const theCase = makeCase({
        comments: [
          {
            id: 'attach-1',
            version: '1',
            type: 'alert',
            alertId: 'alert-id',
            index: '.alerts-security.alerts-default',
            owner: 'cases',
            created_at: '',
            created_by: { email: null, full_name: null, username: 'u' },
            updated_at: null,
            updated_by: null,
          } as unknown as NonNullable<Case['comments']>[number],
        ],
      });
      expect(buildActivityOrigin({ origin, theCase })).toEqual({
        type: ALERT_WORKFLOW_ORIGIN_TYPE,
        id: 'alert-id',
        index: '.alerts-security.alerts-default',
      });
    });

    it('handles parallel alertId arrays (legacy)', () => {
      const origin = {
        type: ALERT_WORKFLOW_ORIGIN_TYPE,
        caseId: 'case-1',
        alertId: 'alert-2',
      };
      const theCase = makeCase({
        comments: [
          {
            id: 'attach-1',
            version: '1',
            type: 'alert',
            alertId: ['alert-1', 'alert-2'],
            index: ['.index-1', '.index-2'],
            owner: 'cases',
            created_at: '',
            created_by: { email: null, full_name: null, username: 'u' },
            updated_at: null,
            updated_by: null,
          } as unknown as NonNullable<Case['comments']>[number],
        ],
      });
      expect(buildActivityOrigin({ origin, theCase })).toEqual({
        type: ALERT_WORKFLOW_ORIGIN_TYPE,
        id: 'alert-2',
        index: '.index-2',
      });
    });

    it('adds the index from a unified v2 alert attachment', () => {
      const origin = {
        type: ALERT_WORKFLOW_ORIGIN_TYPE,
        caseId: 'case-1',
        alertId: 'alert-v2',
      };
      const theCase = makeCase({
        comments: [
          {
            id: 'attach-1',
            version: '1',
            type: 'alert',
            attachmentId: 'alert-v2',
            metadata: { index: '.unified-index' },
            owner: 'cases',
            created_at: '',
            created_by: { email: null, full_name: null, username: 'u' },
            updated_at: null,
            updated_by: null,
          } as unknown as NonNullable<Case['comments']>[number],
        ],
      });
      expect(buildActivityOrigin({ origin, theCase })).toEqual({
        type: ALERT_WORKFLOW_ORIGIN_TYPE,
        id: 'alert-v2',
        index: '.unified-index',
      });
    });

    it('returns the persisted origin without enrichment when alert is not found', () => {
      const origin = {
        type: ALERT_WORKFLOW_ORIGIN_TYPE,
        caseId: 'case-1',
        alertId: 'missing',
      };
      expect(buildActivityOrigin({ origin, theCase: makeCase() })).toEqual({
        type: ALERT_WORKFLOW_ORIGIN_TYPE,
        id: 'missing',
      });
    });
  });

  describe('cases.observables origin', () => {
    it('maps the API origin to the persisted activity shape using the caseId', () => {
      const origin = {
        type: OBSERVABLES_WORKFLOW_ORIGIN_TYPE,
        caseId: 'case-1',
        observableIds: ['obs-1', 'obs-2'],
      };
      expect(buildActivityOrigin({ origin, theCase: makeCase() })).toEqual({
        type: OBSERVABLES_WORKFLOW_ORIGIN_TYPE,
        id: 'case-1',
      });
    });
  });
});
