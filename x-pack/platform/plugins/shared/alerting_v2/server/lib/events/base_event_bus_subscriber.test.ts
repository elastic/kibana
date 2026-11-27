/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LoggerServiceContract } from '../services/logger_service/logger_service';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import type { AlertingDomainEvent, AlertingPublisherContext } from './domain_events';
import type { EventBus, Subscription } from './event_bus';
import { createEventBusMock } from './event_bus/event_bus.mock';
import { BaseEventBusSubscriber } from './base_event_bus_subscriber';

type Bus = EventBus<AlertingDomainEvent, AlertingPublisherContext>;
type SubscriptionBuilder = (bus: Bus) => Subscription;

class TestSubscriber extends BaseEventBusSubscriber {
  constructor(
    bus: Bus,
    logger: LoggerServiceContract,
    private readonly builders: SubscriptionBuilder[]
  ) {
    super(bus, logger);
  }

  protected createSubscriptions(bus: Bus): Subscription[] {
    return this.builders.map((build) => build(bus));
  }
}

describe('BaseEventBusSubscriber', () => {
  const handlerA = jest.fn();
  const handlerB = jest.fn();
  const specs: SubscriptionBuilder[] = [
    (bus) => bus.subscribe('rule.created', handlerA),
    (bus) => bus.subscribe('rule.updated', handlerB),
  ];

  const createBus = () => createEventBusMock<AlertingDomainEvent, AlertingPublisherContext>();

  it('subscribes every spec on start, wiring each event type to its handler', () => {
    const bus = createBus();
    const subscriber = new TestSubscriber(bus, createLoggerService().loggerService, specs);

    subscriber.start();

    expect(bus.subscribe).toHaveBeenCalledTimes(2);
    expect(bus.subscribe).toHaveBeenNthCalledWith(1, 'rule.created', handlerA);
    expect(bus.subscribe).toHaveBeenNthCalledWith(2, 'rule.updated', handlerB);
  });

  it('is idempotent: a second start does not subscribe again and logs a debug message', () => {
    const bus = createBus();
    const { loggerService, mockLogger } = createLoggerService();
    const subscriber = new TestSubscriber(bus, loggerService, specs);

    subscriber.start();
    subscriber.start();

    expect(bus.subscribe).toHaveBeenCalledTimes(2);
    expect(mockLogger.debug).toHaveBeenCalled();
  });

  it('unsubscribes every recorded subscription on stop', () => {
    const bus = createBus();
    const subscriptionA: jest.Mocked<Subscription> = { unsubscribe: jest.fn() };
    const subscriptionB: jest.Mocked<Subscription> = { unsubscribe: jest.fn() };
    bus.subscribe.mockReturnValueOnce(subscriptionA).mockReturnValueOnce(subscriptionB);
    const subscriber = new TestSubscriber(bus, createLoggerService().loggerService, specs);

    subscriber.start();
    subscriber.stop();

    expect(subscriptionA.unsubscribe).toHaveBeenCalledTimes(1);
    expect(subscriptionB.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('can be restarted after stop', () => {
    const bus = createBus();
    const subscriber = new TestSubscriber(bus, createLoggerService().loggerService, specs);

    subscriber.start();
    subscriber.stop();
    subscriber.start();

    expect(bus.subscribe).toHaveBeenCalledTimes(4);
  });
});
