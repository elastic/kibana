/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectsClientMock } from 'src/core/server/mocks';
import { loggerMock } from 'src/core/server/logging/logger.mock';
import { getResult } from '../routes/__mocks__/request_responses';
import { rulesNotificationAlertType } from './rules_notification_alert_type';
import { buildSignalsSearchQuery } from './build_signals_query';
import { AlertInstance } from '../../../../../../../plugins/alerting/server';
import { NotificationExecutorOptions } from './types';
jest.mock('./build_signals_query');

describe('rules_notification_alert_type', () => {
  let payload: NotificationExecutorOptions;
  let alert: ReturnType<typeof rulesNotificationAlertType>;
  let alertInstanceMock: Record<string, jest.Mock>;
  let alertInstanceFactoryMock: () => AlertInstance;
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let logger: ReturnType<typeof loggerMock.create>;
  let callClusterMock: jest.Mock;

  beforeEach(() => {
    alertInstanceMock = {
      scheduleActions: jest.fn(),
      replaceState: jest.fn(),
    };
    alertInstanceMock.replaceState.mockReturnValue(alertInstanceMock);
    alertInstanceFactoryMock = jest.fn().mockReturnValue(alertInstanceMock);
    callClusterMock = jest.fn();
    savedObjectsClient = savedObjectsClientMock.create();
    logger = loggerMock.create();

    payload = {
      alertId: '1111',
      services: {
        savedObjectsClient,
        alertInstanceFactory: alertInstanceFactoryMock,
        callCluster: callClusterMock,
      },
      params: { ruleAlertId: '2222' },
      state: {},
      spaceId: '',
      name: 'name',
      tags: [],
      startedAt: new Date('2019-12-14T16:40:33.400Z'),
      previousStartedAt: new Date('2019-12-13T16:40:33.400Z'),
      createdBy: 'elastic',
      updatedBy: 'elastic',
    };

    alert = rulesNotificationAlertType({
      logger,
    });
  });

  describe('executor', () => {
    it('throws an error if rule alert was not found', async () => {
      savedObjectsClient.get.mockResolvedValue({
        id: 'id',
        attributes: {},
        type: 'type',
        references: [],
      });
      await alert.executor(payload);
      expect(logger.error).toHaveBeenCalledWith(
        `Saved object for alert ${payload.params.ruleAlertId} was not found`
      );
    });

    it('should call buildSignalsSearchQuery with proper params', async () => {
      const ruleAlert = getResult();
      savedObjectsClient.get.mockResolvedValue({
        id: 'id',
        type: 'type',
        references: [],
        attributes: ruleAlert,
      });
      callClusterMock.mockResolvedValue({
        count: 0,
      });

      await alert.executor(payload);

      expect(buildSignalsSearchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '1576255233400',
          index: '.siem-signals',
          ruleId: 'rule-1',
          to: '1576341633400',
        })
      );
    });

    it('should not call alertInstanceFactory if signalsCount was 0', async () => {
      const ruleAlert = getResult();
      savedObjectsClient.get.mockResolvedValue({
        id: 'id',
        type: 'type',
        references: [],
        attributes: ruleAlert,
      });
      callClusterMock.mockResolvedValue({
        count: 0,
      });

      await alert.executor(payload);

      expect(alertInstanceFactoryMock).not.toHaveBeenCalled();
    });

    it('should call scheduleActions if signalsCount was greater than 0', async () => {
      const ruleAlert = getResult();
      savedObjectsClient.get.mockResolvedValue({
        id: 'id',
        type: 'type',
        references: [],
        attributes: ruleAlert,
      });
      callClusterMock.mockResolvedValue({
        count: 10,
      });

      await alert.executor(payload);

      expect(alertInstanceFactoryMock).toHaveBeenCalled();
      expect(alertInstanceMock.replaceState).toHaveBeenCalledWith(
        expect.objectContaining({ signals_count: 10 })
      );
      expect(alertInstanceMock.scheduleActions).toHaveBeenCalledWith(
        'default',
        expect.objectContaining({
          rule: expect.objectContaining({
            name: ruleAlert.name,
          }),
        })
      );
    });
  });
});
