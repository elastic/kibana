/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { EventActorType } from '@kbn/agent-builder-common';
import { investigationRunFailedEventType, investigationSeverityChangedEventType } from '.';
import { INVESTIGATION_RUN_FAILED_EVENT_TYPE } from '../../../common/investigations/run_failure';

const format = (data: { severity: 'low' | 'high'; previous_severity?: 'low' | 'high' }) =>
  investigationSeverityChangedEventType.format!(
    {
      id: 'event-1',
      created_at: '2026-01-01T00:00:00.000Z',
      actor: { type: EventActorType.user, id: 'u1', username: 'jane', full_name: 'Jane Doe' },
      type: 'investigation_severity_changed',
      data,
    },
    { request: httpServerMock.createKibanaRequest(), spaceId: 'default' }
  );

describe('investigationSeverityChangedEventType', () => {
  it('tells the agent a human changed the severity, and from what', async () => {
    const { value } = await format({ severity: 'low', previous_severity: 'high' });

    expect(value).toContain('Jane Doe (a human) changed the investigation severity');
    expect(value).toContain('from "high" to "low"');
    expect(value).toContain('authoritative');
  });

  it('leaves out the previous severity when there was none', async () => {
    const { value } = await format({ severity: 'high' });

    expect(value).toContain('changed the investigation severity to "high"');
  });

  it('rejects an unknown severity', () => {
    expect(
      investigationSeverityChangedEventType.payloadSchema.safeParse({ severity: 'urgent' }).success
    ).toBe(false);
  });
});

describe('investigationRunFailedEventType', () => {
  it.each([undefined, 'Why is checkout slow?'])(
    'formats a historical failure with request %p',
    async (request) => {
      const result = await investigationRunFailedEventType.format?.(
        {
          id: 'event-1',
          created_at: '2026-01-01T00:00:00.000Z',
          type: INVESTIGATION_RUN_FAILED_EVENT_TYPE,
          actor: { type: EventActorType.user, id: 'workflow-user' },
          data: { execution_id: 'workflow-exec-1', request, reason: 'Permission denied' },
        },
        { request: httpServerMock.createKibanaRequest(), spaceId: 'default' }
      );

      expect(result?.value).toContain('workflow-exec-1');
      expect(result?.value).toContain(
        'historical failure report, not a successful investigation result'
      );
      expect(result?.value).toContain(request ?? 'Original request unavailable.');
      expect(result?.value).toContain('Permission denied');
    }
  );
});
