/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ToolingLog } from '@kbn/tooling-log';
import type { EsTestCluster } from '@kbn/test';
import { createTestEsCluster } from '@kbn/test';
import { ALERT_ACTIONS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { buildEpisodeActionsQuery } from '@kbn/alerting-v2-common-queries';
import { getAlertActionsResourceDefinition } from '../alert_actions';
import { DatastreamInitializer } from '../../../lib/services/resource_service/datastream_initializer';

const SPACE_ID = 'default';

interface ActionInput {
  alertId: string;
  timestamp: string;
  actionType: string;
  actorUid?: string;
  assigneeUid?: string;
}

describe('buildEpisodeActionsQuery (integration)', () => {
  let esServer: EsTestCluster;

  const writeActions = async (actions: ActionInput[]) => {
    const operations = actions.flatMap(
      ({ alertId, timestamp, actionType, actorUid, assigneeUid }) => [
        { create: {} },
        {
          '@timestamp': timestamp,
          space_id: SPACE_ID,
          alert_id: alertId,
          rule_id: 'rule-1',
          group_hash: `group-${alertId}`,
          action_type: actionType,
          actor: { type: 'user', profile_uid: actorUid },
          ...(assigneeUid ? { assignee_uid: assigneeUid } : {}),
        },
      ]
    );
    const response = await esServer
      .getClient()
      .bulk({ index: ALERT_ACTIONS_DATA_STREAM, operations, refresh: true });
    expect(response.errors).toBe(false);
  };

  const fetchEpisodeActions = async (alertId: string) => {
    const { columns, values } = await esServer
      .getClient()
      .esql.query({ query: buildEpisodeActionsQuery(SPACE_ID, [alertId]).print('basic') });
    return values.map((row) => Object.fromEntries(columns.map(({ name }, i) => [name, row[i]])));
  };

  beforeAll(async () => {
    esServer = createTestEsCluster({
      log: new ToolingLog({ writeTo: process.stdout, level: 'info' }),
    });
    await esServer.start();
    await new DatastreamInitializer(
      loggerMock.create(),
      esServer.getClient(),
      getAlertActionsResourceDefinition()
    ).initialize();
  });

  afterAll(async () => {
    await esServer.stop();
  });

  it('keeps the ack state and actor when the alert is assigned after the ack', async () => {
    await writeActions([
      {
        alertId: 'ack-then-assign',
        timestamp: '2026-01-01T00:00:00.000Z',
        actionType: 'ack',
        actorUid: 'acker',
      },
      {
        alertId: 'ack-then-assign',
        timestamp: '2026-01-01T00:01:00.000Z',
        actionType: 'assign',
        actorUid: 'assigner',
        assigneeUid: 'assignee',
      },
    ]);

    expect(await fetchEpisodeActions('ack-then-assign')).toEqual([
      expect.objectContaining({
        last_ack_action: 'ack',
        last_ack_actor: 'acker',
        last_assignee_uid: 'assignee',
      }),
    ]);
  });

  it('keeps the assignee when the alert is acked after the assignment', async () => {
    await writeActions([
      {
        alertId: 'assign-then-ack',
        timestamp: '2026-01-01T00:00:00.000Z',
        actionType: 'assign',
        actorUid: 'assigner',
        assigneeUid: 'assignee',
      },
      {
        alertId: 'assign-then-ack',
        timestamp: '2026-01-01T00:01:00.000Z',
        actionType: 'ack',
        actorUid: 'acker',
      },
    ]);

    expect(await fetchEpisodeActions('assign-then-ack')).toEqual([
      expect.objectContaining({
        last_ack_action: 'ack',
        last_ack_actor: 'acker',
        last_assignee_uid: 'assignee',
      }),
    ]);
  });

  it('keeps the deactivate actor when another action follows the deactivation', async () => {
    await writeActions([
      {
        alertId: 'deactivate-then-ack',
        timestamp: '2026-01-01T00:00:00.000Z',
        actionType: 'deactivate',
        actorUid: 'resolver',
      },
      {
        alertId: 'deactivate-then-ack',
        timestamp: '2026-01-01T00:01:00.000Z',
        actionType: 'ack',
        actorUid: 'acker',
      },
    ]);

    expect(await fetchEpisodeActions('deactivate-then-ack')).toEqual([
      expect.objectContaining({
        last_deactivate_action: 'deactivate',
        last_deactivate_actor: 'resolver',
        last_ack_action: 'ack',
        last_ack_actor: 'acker',
      }),
    ]);
  });

  it('returns no assignee when the latest assign action cleared it', async () => {
    await writeActions([
      {
        alertId: 'assign-then-unassign',
        timestamp: '2026-01-01T00:00:00.000Z',
        actionType: 'assign',
        actorUid: 'assigner',
        assigneeUid: 'assignee',
      },
      {
        alertId: 'assign-then-unassign',
        timestamp: '2026-01-01T00:01:00.000Z',
        actionType: 'assign',
        actorUid: 'assigner',
      },
      {
        alertId: 'assign-then-unassign',
        timestamp: '2026-01-01T00:02:00.000Z',
        actionType: 'ack',
        actorUid: 'acker',
      },
    ]);

    expect(await fetchEpisodeActions('assign-then-unassign')).toEqual([
      expect.objectContaining({ last_assignee_uid: null, last_ack_action: 'ack' }),
    ]);
  });
});
