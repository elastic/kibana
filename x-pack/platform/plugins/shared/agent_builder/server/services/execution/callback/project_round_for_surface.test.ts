/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { loggerMock } from '@kbn/logging-mocks';
import {
  AgentExecutionMode,
  ChatEventType,
  ConversationOriginType,
  type ChatEvent,
  type RoundCompleteEvent,
} from '@kbn/agent-builder-common';
import type { AgentExecution, SurfaceProjectorDefinition } from '@kbn/agent-builder-server';
import type { CallbackDeliveryService } from './callback_delivery_service';
import { deliverCallbackEvents } from './deliver_callback_events';
import { getSurfaceProjector, projectRoundForSurface } from './project_round_for_surface';

const callbackUrl = 'https://callback.example.com/v1/events';

const createExecution = ({ slackOrigin }: { slackOrigin: boolean }): AgentExecution =>
  ({
    executionId: 'execution-1',
    executionMode: AgentExecutionMode.conversation,
    agentParams: {
      nextInput: { message: 'hello' },
      callback: { url: callbackUrl },
      ...(slackOrigin
        ? {
            origin: {
              type: ConversationOriginType.Slack,
              external_conversation_id: 'T1/C1/1700000000.1',
            },
          }
        : {}),
    },
  } as unknown as AgentExecution);

const createRoundCompleteEvent = (message: string): RoundCompleteEvent =>
  ({
    type: ChatEventType.roundComplete,
    data: {
      round: { id: 'round-1', response: { message }, input: { message: 'hi' } },
      attachments: [],
    },
  } as unknown as RoundCompleteEvent);

const upperCaseProjector: SurfaceProjectorDefinition = {
  surface: ConversationOriginType.Slack,
  project: async ({ message }) => ({ message: message.toUpperCase() }),
};

const createServiceMock = () => {
  const transport = jest.fn().mockResolvedValue({ status: 200 });

  return {
    getCallbackUrl: jest.fn(() => callbackUrl),
    validateCallbackUrl: jest.fn(),
    createTransport: jest.fn().mockReturnValue(transport),
    makeCallbackRequest: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<CallbackDeliveryService>;
};

const deliveredEvents = (service: jest.Mocked<CallbackDeliveryService>): ChatEvent[] =>
  service.makeCallbackRequest.mock.calls.map(
    ([{ payload }]) => (payload as { event: ChatEvent }).event
  );

describe('getSurfaceProjector', () => {
  const surfaceProjection = { getProjector: jest.fn().mockReturnValue(upperCaseProjector) };

  beforeEach(() => surfaceProjection.getProjector.mockClear());

  it('returns the projector registered for the execution origin', () => {
    const projector = getSurfaceProjector({
      execution: createExecution({ slackOrigin: true }),
      surfaceProjection,
    });

    expect(surfaceProjection.getProjector).toHaveBeenCalledWith(ConversationOriginType.Slack);
    expect(projector).toBe(upperCaseProjector);
  });

  it('returns nothing when the execution has no external origin', () => {
    const projector = getSurfaceProjector({
      execution: createExecution({ slackOrigin: false }),
      surfaceProjection,
    });

    expect(surfaceProjection.getProjector).not.toHaveBeenCalled();
    expect(projector).toBeUndefined();
  });

  it('returns nothing when no projection service is wired', () => {
    expect(
      getSurfaceProjector({ execution: createExecution({ slackOrigin: true }) })
    ).toBeUndefined();
  });
});

describe('projectRoundForSurface', () => {
  it('does not mutate the source event', async () => {
    const event = createRoundCompleteEvent('original');
    const projected = await projectRoundForSurface({
      event,
      projector: upperCaseProjector,
      logger: loggerMock.create(),
    });

    expect(projected.data.round.response.message).toBe('ORIGINAL');
    expect(event.data.round.response.message).toBe('original');
  });

  it('degrades to the original event when the projector throws', async () => {
    const event = createRoundCompleteEvent('original');
    const projected = await projectRoundForSurface({
      event,
      projector: {
        surface: ConversationOriginType.Slack,
        project: async () => {
          throw new Error('boom');
        },
      },
      logger: loggerMock.create(),
    });

    expect(projected).toBe(event);
  });
});

describe('deliverCallbackEvents surface projection', () => {
  it('delivers the projected reply for a Slack-origin execution', async () => {
    const service = createServiceMock();

    await deliverCallbackEvents({
      execution: createExecution({ slackOrigin: true }),
      events$: of(createRoundCompleteEvent('hello') as ChatEvent),
      callbackDeliveryService: service,
      surfaceProjection: { getProjector: () => upperCaseProjector },
      logger: loggerMock.create(),
    });

    const [event] = deliveredEvents(service) as RoundCompleteEvent[];
    expect(event.data.round.response.message).toBe('HELLO');
  });

  it('leaves the reply untouched for a Kibana-UI execution', async () => {
    const service = createServiceMock();

    await deliverCallbackEvents({
      execution: createExecution({ slackOrigin: false }),
      events$: of(createRoundCompleteEvent('hello') as ChatEvent),
      callbackDeliveryService: service,
      surfaceProjection: { getProjector: () => upperCaseProjector },
      logger: loggerMock.create(),
    });

    const [event] = deliveredEvents(service) as RoundCompleteEvent[];
    expect(event.data.round.response.message).toBe('hello');
  });
});
