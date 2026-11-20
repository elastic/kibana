/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createCasesClientMock } from '../mocks';
import type { CasesClientArgs } from '../types';
import { createAuthorizationMock } from '../../authorization/mock';
import { createAlertServiceMock, createCaseServiceMock } from '../../services/mocks';
import type { CaseSavedObjectTransformed } from '../../common/types/case';
import { Operations } from '../../authorization';
import type { DocumentResponse } from '../../../common/types/api';
import { getIncidentTimelineAlerts } from './get_incident_timeline_alerts';

const ALERTS_INDEX = '.internal.alerts-security.alerts-default-000001';

const attachedAlert = (id: string, index = ALERTS_INDEX): DocumentResponse[number] => ({
  id,
  index,
  attached_at: '2026-09-01T09:14:02.000Z',
});

const hit = (id: string, fields: Record<string, unknown[]>): SearchHit<unknown> => ({
  _id: id,
  _index: ALERTS_INDEX,
  fields,
});

describe('getIncidentTimelineAlerts', () => {
  const setup = (attached: DocumentResponse, hits: Array<SearchHit<unknown>>) => {
    const casesClient = createCasesClientMock();
    casesClient.attachments.getAllDocumentsAttachedToCase.mockResolvedValue(attached);

    const caseService = createCaseServiceMock();
    caseService.getCase.mockResolvedValue({
      id: 'case-1',
      attributes: { owner: 'securitySolution' },
    } as unknown as CaseSavedObjectTransformed);

    const alertsService = createAlertServiceMock();
    alertsService.getAlertFields.mockResolvedValue(hits);

    const authorization = createAuthorizationMock();
    const clientArgs = {
      authorization,
      logger: loggingSystemMock.createLogger(),
      services: { caseService, alertsService },
    } as unknown as CasesClientArgs;

    return { casesClient, clientArgs, alertsService, authorization };
  };

  it('returns alerts sorted by alert time, preferring original_time over @timestamp', async () => {
    const { casesClient, clientArgs } = setup(
      [attachedAlert('late'), attachedAlert('early')],
      [
        hit('late', {
          '@timestamp': ['2026-09-01T15:22:23.000Z'],
          'kibana.alert.rule.uuid': ['rule-b'],
          'kibana.alert.rule.name': ['Access of Stored Browser Credentials'],
          'kibana.alert.severity': ['high'],
          'host.name': ['mac-1', 'mac-1'],
          'user.name': ['alice'],
        }),
        hit('early', {
          '@timestamp': ['2026-09-01T09:08:00.000Z'],
          'kibana.alert.original_time': ['2026-09-01T09:07:35.000Z'],
          'kibana.alert.rule.uuid': ['rule-a'],
          'kibana.alert.rule.name': ['Multiple Different Behavior Based Endpoint alerts'],
        }),
      ]
    );

    const res = await getIncidentTimelineAlerts({ caseId: 'case-1' }, casesClient, clientArgs);

    expect(res).toEqual({
      alerts: [
        {
          id: 'early',
          index: ALERTS_INDEX,
          time: '2026-09-01T09:07:35.000Z',
          timeSource: 'original_time',
          timestamp: '2026-09-01T09:08:00.000Z',
          ruleId: 'rule-a',
          ruleName: 'Multiple Different Behavior Based Endpoint alerts',
          severity: undefined,
          hostNames: [],
          userNames: [],
        },
        {
          id: 'late',
          index: ALERTS_INDEX,
          time: '2026-09-01T15:22:23.000Z',
          timeSource: 'timestamp',
          timestamp: '2026-09-01T15:22:23.000Z',
          ruleId: 'rule-b',
          ruleName: 'Access of Stored Browser Credentials',
          severity: 'high',
          hostNames: ['mac-1'],
          userNames: ['alice'],
        },
      ],
      attached: 2,
      notFound: 0,
      remote: 0,
      atLimit: false,
    });
  });

  describe('EQL sequence shells', () => {
    const shell = (id: string, groupId: string) =>
      hit(id, {
        '@timestamp': ['2026-11-18T10:46:31.716Z'],
        'kibana.alert.original_time': ['2026-11-18T10:46:31.714Z'],
        'kibana.alert.group.id': [groupId],
        'kibana.alert.rule.uuid': ['seq-rule'],
      });
    const buildingBlock = hit('block', {
      '@timestamp': ['2026-11-18T10:46:31.716Z'],
      'kibana.alert.original_time': ['2026-11-18T10:30:11.000Z'],
      'kibana.alert.group.id': ['group-1'],
      'kibana.alert.building_block_type': ['default'],
    });

    it('plots a shell at the first event of its sequence with one extra search', async () => {
      const { casesClient, clientArgs, alertsService } = setup(
        [attachedAlert('shell-1'), attachedAlert('shell-2'), attachedAlert('block')],
        [shell('shell-1', 'group-1'), shell('shell-2', 'group-1'), buildingBlock]
      );
      alertsService.getSequenceStartTimes.mockResolvedValue(
        new Map([['group-1', '2026-11-18T10:30:11.000Z']])
      );

      const res = await getIncidentTimelineAlerts({ caseId: 'case-1' }, casesClient, clientArgs);

      expect(alertsService.getSequenceStartTimes).toHaveBeenCalledTimes(1);
      expect(alertsService.getSequenceStartTimes).toHaveBeenCalledWith({
        alerts: expect.arrayContaining([expect.objectContaining({ id: 'shell-1' })]),
        groupIds: ['group-1'],
      });
      expect(res.alerts.map(({ id, time, timeSource }) => [id, time, timeSource])).toEqual([
        ['shell-1', '2026-11-18T10:30:11.000Z', 'sequence_start'],
        ['shell-2', '2026-11-18T10:30:11.000Z', 'sequence_start'],
        ['block', '2026-11-18T10:30:11.000Z', 'original_time'],
      ]);
    });

    it('falls back to the alert write time when the building blocks are not found', async () => {
      const { casesClient, clientArgs, alertsService } = setup(
        [attachedAlert('shell-1')],
        [shell('shell-1', 'group-gone')]
      );
      alertsService.getSequenceStartTimes.mockResolvedValue(new Map());

      const res = await getIncidentTimelineAlerts({ caseId: 'case-1' }, casesClient, clientArgs);

      expect(res.alerts).toMatchObject([
        { id: 'shell-1', time: '2026-11-18T10:46:31.716Z', timeSource: 'timestamp' },
      ]);
    });

    it('does not search for sequence starts when no attached alert is a shell', async () => {
      const { casesClient, clientArgs, alertsService } = setup(
        [attachedAlert('block')],
        [buildingBlock]
      );

      await getIncidentTimelineAlerts({ caseId: 'case-1' }, casesClient, clientArgs);

      expect(alertsService.getSequenceStartTimes).not.toHaveBeenCalled();
    });
  });

  it('checks the case metrics privilege for the case owner', async () => {
    const { casesClient, clientArgs, authorization } = setup([], []);

    await getIncidentTimelineAlerts({ caseId: 'case-1' }, casesClient, clientArgs);

    expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
      operation: Operations.getCaseMetrics,
      entities: [{ owner: 'securitySolution', id: 'case-1' }],
    });
  });

  it('fails when the user may not read the case', async () => {
    const { casesClient, clientArgs, authorization, alertsService } = setup(
      [attachedAlert('a')],
      []
    );
    authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

    await expect(
      getIncidentTimelineAlerts({ caseId: 'case-1' }, casesClient, clientArgs)
    ).rejects.toThrow('Unauthorized');
    expect(alertsService.getAlertFields).not.toHaveBeenCalled();
  });

  it('counts missing documents and linked-project alerts without searching remote indices', async () => {
    const { casesClient, clientArgs, alertsService } = setup(
      [
        attachedAlert('found'),
        attachedAlert('deleted'),
        attachedAlert('found'),
        attachedAlert('remote', 'linked:.alerts-security.alerts-default'),
      ],
      [hit('found', { '@timestamp': ['2026-09-01T09:08:00.000Z'] })]
    );

    const res = await getIncidentTimelineAlerts({ caseId: 'case-1' }, casesClient, clientArgs);

    expect(res.alerts.map(({ id }) => id)).toEqual(['found']);
    expect(res).toMatchObject({ attached: 3, notFound: 1, remote: 1, atLimit: false });
    const [{ alerts }] = alertsService.getAlertFields.mock.calls[0];
    expect(alerts.map(({ index }) => index)).not.toContain(
      'linked:.alerts-security.alerts-default'
    );
  });

  it('does not search when the case has no alerts', async () => {
    const { casesClient, clientArgs, alertsService } = setup([], []);

    const res = await getIncidentTimelineAlerts({ caseId: 'case-1' }, casesClient, clientArgs);

    expect(res).toEqual({ alerts: [], attached: 0, notFound: 0, remote: 0, atLimit: false });
    expect(alertsService.getAlertFields).not.toHaveBeenCalled();
  });

  it('flags a case at the 1,000-alert limit', async () => {
    const attached = Array.from({ length: 1000 }, (_, i) => attachedAlert(`alert-${i}`));
    const hits = attached.map(({ id }) => hit(id, { '@timestamp': ['2026-09-01T09:08:00.000Z'] }));
    const { casesClient, clientArgs } = setup(attached, hits);

    const res = await getIncidentTimelineAlerts({ caseId: 'case-1' }, casesClient, clientArgs);

    expect(res.alerts).toHaveLength(1000);
    expect(res).toMatchObject({ attached: 1000, notFound: 0, atLimit: true });
  });
});
