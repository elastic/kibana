/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertStatusChangedTriggerPayload } from '../../../../common/workflows/triggers';
import { createAlertStatusChangedEventPublisher } from './alert_status_changed_event_publisher.mock';
import { ALERT_STATUS_CHANGED_EVENT_TYPE } from './events';

const firstPayload: AlertStatusChangedTriggerPayload = {
  spaceId: 'space-1',
  source: 'internal',
  alert: { id: 'alert-1', groupHash: 'hash-1', status: 'active', previousStatus: 'pending' },
  rule: { id: 'rule-1', name: 'Rule 1', tags: ['k8s'] },
  execution: { executionId: 'execution-uuid', scheduledAt: '2025-01-01T00:00:00.000Z' },
};

const secondPayload: AlertStatusChangedTriggerPayload = {
  ...firstPayload,
  alert: { id: 'alert-2', groupHash: 'hash-2', status: 'pending', previousStatus: null },
};

describe('AlertStatusChangedEventPublisher', () => {
  it('publishes one alert.status.changed event per payload with the threaded request when an opt-in is enabled', async () => {
    const { publisher, eventBus, optIns, request } = createAlertStatusChangedEventPublisher();
    optIns.register({ isEnabled: jest.fn().mockResolvedValue(true) });

    await publisher.publishAlertStatusChanges([firstPayload, secondPayload]);

    expect(eventBus.publish).toHaveBeenCalledTimes(2);
    expect(eventBus.publish).toHaveBeenNthCalledWith(
      1,
      { type: ALERT_STATUS_CHANGED_EVENT_TYPE, payload: firstPayload },
      { request, origin: { actor: 'user', channel: 'api' } }
    );
    expect(eventBus.publish).toHaveBeenNthCalledWith(
      2,
      { type: ALERT_STATUS_CHANGED_EVENT_TYPE, payload: secondPayload },
      { request, origin: { actor: 'user', channel: 'api' } }
    );
  });

  it('asks the opt-ins with the publisher request', async () => {
    const { publisher, optIns, request } = createAlertStatusChangedEventPublisher();
    const isEnabled = jest.fn().mockResolvedValue(true);
    optIns.register({ isEnabled });

    await publisher.publishAlertStatusChanges([firstPayload]);

    expect(isEnabled).toHaveBeenCalledWith(request);
  });

  it('publishes nothing when nobody has opted in', async () => {
    const { publisher, eventBus } = createAlertStatusChangedEventPublisher();

    await publisher.publishAlertStatusChanges([firstPayload]);

    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('publishes nothing when no opt-in is enabled for the request', async () => {
    const { publisher, eventBus, optIns } = createAlertStatusChangedEventPublisher();
    optIns.register({ isEnabled: jest.fn().mockResolvedValue(false) });

    await publisher.publishAlertStatusChanges([firstPayload]);

    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('does not ask the opt-ins when there is nothing to publish', async () => {
    const { publisher, eventBus, optIns } = createAlertStatusChangedEventPublisher();
    const isEnabled = jest.fn().mockResolvedValue(true);
    optIns.register({ isEnabled });

    await publisher.publishAlertStatusChanges([]);

    expect(isEnabled).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('asks the opt-ins once across calls on the same instance', async () => {
    const { publisher, eventBus, optIns } = createAlertStatusChangedEventPublisher();
    const isEnabled = jest.fn().mockResolvedValue(true);
    optIns.register({ isEnabled });

    await publisher.publishAlertStatusChanges([firstPayload]);
    await publisher.publishAlertStatusChanges([secondPayload]);

    expect(isEnabled).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledTimes(2);
  });
});
