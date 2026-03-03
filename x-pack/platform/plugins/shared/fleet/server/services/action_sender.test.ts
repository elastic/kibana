/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';

import type { TelemetryEventsSender } from '../telemetry/sender';
import { createMockTelemetryEventsSender } from '../telemetry/__mocks__';

import type { AgentActionEvent } from './action_sender';
import { sendActionTelemetryEvents } from './action_sender';

describe('sendActionTelemetryEvents', () => {
  let eventsTelemetryMock: jest.Mocked<TelemetryEventsSender>;
  let loggerMock: jest.Mocked<Logger>;

  beforeEach(() => {
    eventsTelemetryMock = createMockTelemetryEventsSender();
    loggerMock = loggingSystemMock.createLogger();
  });

  it('should queue telemetry events', () => {
    const agentMessage: AgentActionEvent = {
      eventType: 'MIGRATE',
      agentCount: 1,
    };

    sendActionTelemetryEvents(loggerMock, eventsTelemetryMock, agentMessage);

    expect(eventsTelemetryMock.queueTelemetryEvents).toHaveBeenCalledWith('fleet-actions', [
      {
        eventType: 'MIGRATE',
        agentCount: 1,
      },
    ]);
  });
});
