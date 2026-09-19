/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { InvestigationQuotaDeniedError } from '../client/errors';
import type { GetInvestigationsClient } from '../routes/types';
import { triggerInvestigationStepDefinition } from './trigger_investigation';

jest.mock('@kbn/workflows-extensions/server', () => ({
  createServerStepDefinition: jest.fn((definition) => definition),
}));

const request = {} as KibanaRequest;
const createContext = (input: Record<string, unknown>) =>
  ({
    input,
    contextManager: {
      getFakeRequest: jest.fn().mockReturnValue(request),
      getContext: jest.fn().mockReturnValue({ workflow: { spaceId: 'test-space' } }),
    },
  } as never);

const createDefinition = (start: jest.Mock) => {
  const getInvestigationsClient = jest
    .fn()
    .mockReturnValue({ start }) as unknown as GetInvestigationsClient;
  return {
    definition: triggerInvestigationStepDefinition(getInvestigationsClient),
    getInvestigationsClient,
  };
};

describe('triggerInvestigationStepDefinition', () => {
  it('defaults an omitted trigger type to automatic', async () => {
    const start = jest.fn().mockResolvedValue({ investigation_id: 'investigation-1' });
    const { definition } = createDefinition(start);

    await definition.handler(
      createContext({
        subject_type: 'significant_event',
        subject_id: 'event-1',
        title: 'Checkout latency breach',
      })
    );

    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger_type: 'automatic',
      })
    );
  });

  it('preserves an explicit manual trigger type', async () => {
    const start = jest.fn().mockResolvedValue({ investigation_id: 'investigation-1' });
    const { definition } = createDefinition(start);

    await definition.handler(
      createContext({
        subject_type: 'significant_event',
        subject_id: 'event-1',
        title: 'Checkout latency breach',
        trigger_type: 'manual',
      })
    );

    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger_type: 'manual',
      })
    );
  });

  it('propagates a denied start without retrying', async () => {
    const error = new InvestigationQuotaDeniedError();
    const start = jest.fn().mockRejectedValue(error);
    const { definition } = createDefinition(start);

    await expect(
      definition.handler(
        createContext({
          subject_type: 'significant_event',
          subject_id: 'event-1',
          title: 'Checkout latency breach',
        })
      )
    ).rejects.toBe(error);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('turns a nested v1 alert document into an investigation snapshot', async () => {
    const start = jest.fn().mockResolvedValue({ investigation_id: 'investigation-1' });
    const { definition } = createDefinition(start);

    await definition.handler(
      createContext({
        subject_type: 'alert',
        subject_id: 'alert-1',
        title: 'CPU threshold',
        context: {
          alerts: [
            {
              _id: 'alert-1',
              kibana: {
                alert: {
                  uuid: 'alert-1',
                  status: 'active',
                  start: '2026-09-02T10:00:00.000Z',
                  reason: 'CPU saturation',
                  rule: {
                    uuid: 'rule-1',
                    name: 'CPU threshold',
                    rule_type_id: 'metrics.alert.threshold',
                    category: 'Metric threshold',
                  },
                },
              },
            },
          ],
        },
      })
    );

    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: { type: 'alert', id: 'alert-1', summary: undefined },
        title: 'CPU threshold',
        context: {
          alerts: [
            expect.objectContaining({
              id: 'alert-1',
              rule_id: 'rule-1',
              rule_name: 'CPU threshold',
              reason: 'CPU saturation',
            }),
          ],
        },
      })
    );
  });

  it('keeps an unparseable sibling alert so start() can reject the whole context', async () => {
    const start = jest.fn().mockResolvedValue({ investigation_id: 'investigation-1' });
    const { definition } = createDefinition(start);
    const invalidAlert = { not: 'an alert' };

    await definition.handler(
      createContext({
        subject_type: 'alert',
        subject_id: 'alert-1',
        title: 'CPU threshold',
        context: {
          alerts: [
            {
              _id: 'alert-1',
              kibana: {
                alert: {
                  uuid: 'alert-1',
                  status: 'active',
                  start: '2026-09-02T10:00:00.000Z',
                  reason: 'CPU saturation',
                  rule: {
                    uuid: 'rule-1',
                    name: 'CPU threshold',
                    rule_type_id: 'metrics.alert.threshold',
                    category: 'Metric threshold',
                  },
                },
              },
            },
            invalidAlert,
          ],
        },
      })
    );

    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({
        context: {
          alerts: [expect.objectContaining({ id: 'alert-1' }), invalidAlert],
        },
      })
    );
  });

  it('keeps sibling context keys so start() can reject a second trigger', async () => {
    const start = jest.fn().mockResolvedValue({ investigation_id: 'investigation-1' });
    const { definition } = createDefinition(start);

    await definition.handler(
      createContext({
        subject_type: 'alert',
        subject_id: 'alert-1',
        title: 'CPU threshold',
        context: {
          alerts: [
            {
              _id: 'alert-1',
              kibana: {
                alert: {
                  uuid: 'alert-1',
                  status: 'active',
                  start: '2026-09-02T10:00:00.000Z',
                  reason: 'CPU saturation',
                  rule: {
                    uuid: 'rule-1',
                    name: 'CPU threshold',
                    rule_type_id: 'metrics.alert.threshold',
                    category: 'Metric threshold',
                  },
                },
              },
            },
          ],
          event_uuid: 'event-1',
        },
      })
    );

    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({
        context: {
          alerts: [expect.objectContaining({ id: 'alert-1' })],
          event_uuid: 'event-1',
        },
      })
    );
  });
});
