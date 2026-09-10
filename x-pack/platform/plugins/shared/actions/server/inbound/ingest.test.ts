/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { z } from '@kbn/zod/v4';
import { buildEventId, MAX_CONNECTOR_TYPE_ID_LENGTH } from '@kbn/connector-specs';

import { computeIngestTokenHash } from './compute_ingest_token_hash';
import { INBOUND_EVENTS_DISABLED_MESSAGE, INBOUND_EVENTS_MAX_EMITTED_DEFAULT } from './constants';
import { dispatchConnectorEvents } from './dispatch_connector_events';
import { ingestInboundEvent } from './ingest';
import { mapIngestResultToResponse } from './map_ingest_result_to_response';
import {
  INBOUND_INGRESS_OUTCOME_DETAIL_MAX_LENGTH,
  truncateInboundIngressDetail,
} from './log_inbound_ingress_outcome';
import type {
  ConnectorEventEmitParams,
  ConnectorEventEmitter,
  DispatchConnectorEventsResult,
} from './types';

jest.mock('@kbn/connector-specs', () => {
  const actual = jest.requireActual('@kbn/connector-specs');
  return {
    ...actual,
    getConnectorSpec: jest.fn(),
  };
});

import { getConnectorSpec } from '@kbn/connector-specs';

const getConnectorSpecMock = getConnectorSpec as jest.MockedFunction<typeof getConnectorSpec>;

describe('ingestInboundEvent', () => {
  const logger = loggingSystemMock.createLogger();
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const getUnsecuredSavedObjectsClient = jest.fn().mockResolvedValue(unsecuredSavedObjectsClient);
  const emitConnectorEvents = jest
    .fn<Promise<DispatchConnectorEventsResult>, []>()
    .mockResolvedValue({ ok: true });

  const connectorId = 'connector-1';
  const token = 'ingest-token-value';
  const spaceId = 'default';
  const ingestTokenHash = computeIngestTokenHash({
    connectorId,
    spaceId,
    token,
  });

  const createFakeSpec = (handleEvents: jest.Mock) =>
    ({
      metadata: {
        id: '.myConnector',
        displayName: 'My Connector',
        description: 'test',
        minimumLicense: 'gold',
        supportedFeatureIds: ['workflows'],
      },
      actions: {},
      test: { enabled: false, handler: async () => ({}) },
      events: {
        definitions: {
          received: {
            eventId: buildEventId('.myConnector', 'received'),
            title: 'Received',
            description: 'test',
            eventSchema: z.object({ body: z.unknown() }),
          },
        },
        handleEvents,
      },
    } as ReturnType<typeof getConnectorSpec>);

  beforeEach(() => {
    jest.clearAllMocks();
    emitConnectorEvents.mockResolvedValue({ ok: true });
    getUnsecuredSavedObjectsClient.mockResolvedValue(unsecuredSavedObjectsClient);
    unsecuredSavedObjectsClient.get.mockResolvedValue({
      id: connectorId,
      type: 'action',
      references: [],
      attributes: {
        actionTypeId: '.myConnector',
        name: 'Test',
        isMissingSecrets: false,
        config: { ingestTokenHash, other: 'kept' },
        secrets: { apiKey: 'should-not-reach-spoke' },
      },
    });
  });

  const run = async (overrides?: {
    enabled?: boolean;
    isActionTypeEnabled?: (actionTypeId: string) => boolean;
    maxEmitted?: number;
    maxBodyBytes?: number;
    connectorTypeId?: string;
    spaceId?: string;
    query?: Record<string, unknown>;
    headers?: Record<string, string>;
    emit?: (params: ConnectorEventEmitParams) => Promise<DispatchConnectorEventsResult>;
  }) => {
    const response = httpServerMock.createResponseFactory();
    const result = await ingestInboundEvent({
      connectorTypeId: overrides?.connectorTypeId ?? 'myConnector',
      connectorId,
      spaceId: overrides?.spaceId ?? spaceId,
      requestId: 'req-1',
      headers: overrides?.headers ?? {},
      query: (overrides?.query ?? { token }) as { token?: string },
      body: { hello: 'world' },
      inboundEventsEnabled: overrides?.enabled ?? true,
      isActionTypeEnabled: overrides?.isActionTypeEnabled ?? (() => true),
      maxEmitted: overrides?.maxEmitted ?? INBOUND_EVENTS_MAX_EMITTED_DEFAULT,
      maxBodyBytes: overrides?.maxBodyBytes ?? 1024 * 1024,
      emitConnectorEvents: overrides?.emit ?? emitConnectorEvents,
      logger,
      getUnsecuredSavedObjectsClient,
      inMemoryConnectors: [],
    });
    mapIngestResultToResponse(result, response);
    return { response, result };
  };

  const expectOutcome = (level: 'debug' | 'info' | 'warn' | 'error', outcome: string) => {
    expect(logger[level]).toHaveBeenCalledWith(
      expect.stringContaining(`outcome=${outcome}`),
      expect.objectContaining({
        inboundEvents: expect.objectContaining({
          outcome,
          spaceId: 'default',
          connectorId,
          connectorTypeId: expect.any(String),
          requestId: expect.any(String),
        }),
      })
    );
  };

  it('returns 403 when inbound events are disabled', async () => {
    const { response: res } = await run({ enabled: false });
    expect(res.forbidden).toHaveBeenCalledWith({ body: INBOUND_EVENTS_DISABLED_MESSAGE });
    expect(getUnsecuredSavedObjectsClient).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
    expectOutcome('warn', 'disabled');
  });

  it('returns 404 when the spec has no events', async () => {
    getConnectorSpecMock.mockReturnValue(undefined);
    const { response: res } = await run();
    expect(res.notFound).toHaveBeenCalled();
    expectOutcome('debug', 'no_spec');
  });

  it('returns 404 when the connector type is disabled in config', async () => {
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(jest.fn()) as ReturnType<typeof getConnectorSpec>
    );
    const { response: res } = await run({ isActionTypeEnabled: () => false });
    expect(res.notFound).toHaveBeenCalled();
    expect(getUnsecuredSavedObjectsClient).not.toHaveBeenCalled();
    expect(emitConnectorEvents).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('outcome=no_spec'),
      expect.objectContaining({
        inboundEvents: expect.objectContaining({
          outcome: 'no_spec',
          detail: 'type_disabled',
        }),
      })
    );
  });

  it('returns 404 when loadInboundConnector returns undefined (type mismatch / miss)', async () => {
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(jest.fn()) as ReturnType<typeof getConnectorSpec>
    );
    unsecuredSavedObjectsClient.get.mockResolvedValue({
      id: connectorId,
      type: 'action',
      references: [],
      attributes: {
        actionTypeId: '.otherConnector',
        name: 'Test',
        isMissingSecrets: false,
        config: { ingestTokenHash },
        secrets: {},
      },
    });
    const { response: res } = await run();
    expect(res.notFound).toHaveBeenCalled();
    expect(emitConnectorEvents).not.toHaveBeenCalled();
    expectOutcome('debug', 'load_miss');
  });

  it('returns 404 when normalized connectorTypeId exceeds max length', async () => {
    const undotted = 'a'.repeat(MAX_CONNECTOR_TYPE_ID_LENGTH);
    const { response: res } = await run({ connectorTypeId: undotted });
    expect(res.notFound).toHaveBeenCalled();
    expect(getConnectorSpecMock).not.toHaveBeenCalled();
    expectOutcome('debug', 'no_spec');
  });

  it('returns 404 when the connector has no ingestTokenHash', async () => {
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(jest.fn()) as ReturnType<typeof getConnectorSpec>
    );
    unsecuredSavedObjectsClient.get.mockResolvedValue({
      id: connectorId,
      type: 'action',
      references: [],
      attributes: {
        actionTypeId: '.myConnector',
        name: 'Test',
        isMissingSecrets: false,
        config: {},
        secrets: {},
      },
    });
    const { response: res } = await run();
    expect(res.notFound).toHaveBeenCalled();
    expect(emitConnectorEvents).not.toHaveBeenCalled();
    expectOutcome('debug', 'auth_fail');
  });

  it('returns 404 when the token is missing', async () => {
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(jest.fn()) as ReturnType<typeof getConnectorSpec>
    );
    const { response: res } = await run({ query: {} });
    expect(res.notFound).toHaveBeenCalled();
    expect(emitConnectorEvents).not.toHaveBeenCalled();
    expectOutcome('debug', 'auth_fail');
  });

  it('returns 404 for a bad token', async () => {
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(jest.fn()) as ReturnType<typeof getConnectorSpec>
    );
    const { response: res } = await run({ query: { token: 'wrong' } });
    expect(res.notFound).toHaveBeenCalled();
    expect(emitConnectorEvents).not.toHaveBeenCalled();
    expectOutcome('debug', 'auth_fail');
  });

  it('returns 404 for the previous token after the stored hash is reminted', async () => {
    const rotatedToken = 'rotated-ingest-token';
    const rotatedHash = computeIngestTokenHash({
      connectorId,
      spaceId,
      token: rotatedToken,
    });
    const eventId = buildEventId('.myConnector', 'received');
    const handleEvents = jest.fn().mockResolvedValue({
      type: 'emit',
      events: [{ eventId, correlationKey: 'corr-1', payload: { body: { hello: 'world' } } }],
    });
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(handleEvents) as ReturnType<typeof getConnectorSpec>
    );
    unsecuredSavedObjectsClient.get.mockResolvedValue({
      id: connectorId,
      type: 'action',
      references: [],
      attributes: {
        actionTypeId: '.myConnector',
        name: 'Test',
        isMissingSecrets: false,
        config: { ingestTokenHash: rotatedHash },
        secrets: {},
      },
    });

    const { response: rejected } = await run({ query: { token } });
    expect(rejected.notFound).toHaveBeenCalled();
    expect(emitConnectorEvents).not.toHaveBeenCalled();
    expectOutcome('debug', 'auth_fail');

    const { response: accepted } = await run({ query: { token: rotatedToken } });
    expect(accepted.accepted).toHaveBeenCalledWith({ body: { ok: true } });
    expect(emitConnectorEvents).toHaveBeenCalled();
  });

  it('accepts Authorization Bearer when query token is absent', async () => {
    const eventId = buildEventId('.myConnector', 'received');
    const handleEvents = jest.fn().mockResolvedValue({
      type: 'emit',
      events: [{ eventId, correlationKey: 'corr-1', payload: { body: { hello: 'world' } } }],
    });
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(handleEvents) as ReturnType<typeof getConnectorSpec>
    );

    const { response: res } = await run({
      query: {},
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.accepted).toHaveBeenCalledWith({ body: { ok: true } });
    expect(emitConnectorEvents).toHaveBeenCalled();
  });

  it('returns 202 and emits on the happy path without secrets or ingestTokenHash', async () => {
    const eventId = buildEventId('.myConnector', 'received');
    const handleEvents = jest.fn().mockResolvedValue({
      type: 'emit',
      events: [
        {
          eventId,
          correlationKey: 'corr-1',
          payload: { body: { hello: 'world' } },
        },
      ],
    });
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(handleEvents) as ReturnType<typeof getConnectorSpec>
    );

    const { response: res } = await run();
    expect(res.accepted).toHaveBeenCalledWith({ body: { ok: true } });
    expect(handleEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        connectorId,
        connectorTypeId: '.myConnector',
        spaceId: 'default',
        rawBody: { hello: 'world' },
        config: { other: 'kept' },
      })
    );
    expect(handleEvents.mock.calls[0][0]).not.toHaveProperty('secrets');
    expect(handleEvents.mock.calls[0][0].config).not.toHaveProperty('ingestTokenHash');
    expect(emitConnectorEvents).toHaveBeenCalledWith({
      eventId,
      payload: { body: { hello: 'world' } },
      spaceId: 'default',
      connectorId,
      connectorTypeId: '.myConnector',
      correlationKey: 'corr-1',
    });
    expectOutcome('info', 'accepted');
  });

  it('returns 202 for an empty events list', async () => {
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(jest.fn().mockResolvedValue({ type: 'emit', events: [] })) as ReturnType<
        typeof getConnectorSpec
      >
    );
    const { response: res } = await run();
    expect(res.accepted).toHaveBeenCalledWith({ body: { ok: true } });
    expect(emitConnectorEvents).not.toHaveBeenCalled();
    expectOutcome('info', 'accepted');
  });

  it('returns 202 with emit_partial when emitConnectorEvents returns ok:false', async () => {
    const eventId = buildEventId('.myConnector', 'received');
    emitConnectorEvents.mockResolvedValueOnce({
      ok: false,
      reason: 'emit_threw',
      message: 'bridge down',
    });
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(
        jest.fn().mockResolvedValue({
          type: 'emit',
          events: [{ eventId, correlationKey: 'corr-1', payload: { body: {} } }],
        })
      ) as ReturnType<typeof getConnectorSpec>
    );

    const { response: res } = await run();
    expect(res.accepted).toHaveBeenCalledWith({ body: { ok: true } });
    expectOutcome('warn', 'emit_partial');
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('bridge down'),
      expect.anything()
    );
  });

  it('returns 202 with emit_partial when emitConnectorEvents throws', async () => {
    const eventId = buildEventId('.myConnector', 'received');
    emitConnectorEvents.mockRejectedValueOnce(new Error('adapter threw'));
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(
        jest.fn().mockResolvedValue({
          type: 'emit',
          events: [{ eventId, correlationKey: 'corr-1', payload: { body: {} } }],
        })
      ) as ReturnType<typeof getConnectorSpec>
    );

    const { response: res } = await run();
    expect(res.accepted).toHaveBeenCalledWith({ body: { ok: true } });
    expectOutcome('warn', 'emit_partial');
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('adapter threw'),
      expect.anything()
    );
    expect(res.customError).not.toHaveBeenCalled();
  });

  it('continues emitting after a partial failure (1 of N)', async () => {
    const eventId = buildEventId('.myConnector', 'received');
    emitConnectorEvents
      .mockResolvedValueOnce({ ok: false, reason: 'emit_threw', message: 'first failed' })
      .mockResolvedValueOnce({ ok: true });
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(
        jest.fn().mockResolvedValue({
          type: 'emit',
          events: [
            { eventId, correlationKey: 'corr-1', payload: { body: {} } },
            { eventId, correlationKey: 'corr-2', payload: { body: {} } },
          ],
        })
      ) as ReturnType<typeof getConnectorSpec>
    );

    const { response: res } = await run();
    expect(res.accepted).toHaveBeenCalledWith({ body: { ok: true } });
    expect(emitConnectorEvents).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('emit_failures=1_of=2'),
      expect.anything()
    );
  });

  it('returns 202 with emit_partial when production dispatch has no emitter', async () => {
    const eventId = buildEventId('.myConnector', 'received');
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(
        jest.fn().mockResolvedValue({
          type: 'emit',
          events: [{ eventId, correlationKey: 'corr-1', payload: { body: {} } }],
        })
      ) as ReturnType<typeof getConnectorSpec>
    );

    const { response: res } = await run({
      emit: (params) => dispatchConnectorEvents({ emitter: undefined, params }),
    });
    expect(res.accepted).toHaveBeenCalledWith({ body: { ok: true } });
    expectOutcome('warn', 'emit_partial');
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('No connector event emitter registered'),
      expect.anything()
    );
  });

  it('returns 202 with emit_partial when production dispatch emitter throws', async () => {
    const eventId = buildEventId('.myConnector', 'received');
    const emitter: ConnectorEventEmitter = {
      emit: jest.fn().mockRejectedValue(new Error('bridge down')),
    };
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(
        jest.fn().mockResolvedValue({
          type: 'emit',
          events: [{ eventId, correlationKey: 'corr-1', payload: { body: {} } }],
        })
      ) as ReturnType<typeof getConnectorSpec>
    );

    const { response: res } = await run({
      emit: (params) => dispatchConnectorEvents({ emitter, params }),
    });
    expect(res.accepted).toHaveBeenCalledWith({ body: { ok: true } });
    expectOutcome('warn', 'emit_partial');
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('bridge down'),
      expect.anything()
    );
  });

  it('returns 500 when handleEvents throws', async () => {
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(jest.fn().mockRejectedValue(new Error('spoke failed'))) as ReturnType<
        typeof getConnectorSpec
      >
    );
    const { response: res } = await run();
    expect(res.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
    expect(emitConnectorEvents).not.toHaveBeenCalled();
    expectOutcome('error', 'handle_fail');
  });

  it('returns spoke HTTP without emitters when handleEvents type is http', async () => {
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(
        jest.fn().mockResolvedValue({
          type: 'http',
          httpResponse: {
            status: 200,
            body: { challenge: 'abc' },
            headers: { 'content-type': 'application/json' },
          },
        })
      ) as ReturnType<typeof getConnectorSpec>
    );
    const { response: res } = await run();
    expect(res.custom).toHaveBeenCalledWith({
      statusCode: 200,
      body: { challenge: 'abc' },
      headers: { 'content-type': 'application/json' },
    });
    expect(res.accepted).not.toHaveBeenCalled();
    expect(res.customError).not.toHaveBeenCalled();
    expect(emitConnectorEvents).not.toHaveBeenCalled();
    expectOutcome('info', 'http_ack');
  });

  it('returns 500 when handleEvents http includes Location', async () => {
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(
        jest.fn().mockResolvedValue({
          type: 'http',
          httpResponse: {
            status: 200,
            body: { challenge: 'abc' },
            headers: { Location: 'https://evil.example' },
          },
        })
      ) as ReturnType<typeof getConnectorSpec>
    );
    const { response: res } = await run();
    expect(res.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
    expect(res.custom).not.toHaveBeenCalled();
    expect(emitConnectorEvents).not.toHaveBeenCalled();
    expectOutcome('error', 'handle_fail');
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('invalid_http_ack'),
      expect.anything()
    );
  });

  it('returns 500 when handleEvents http body is not JSON-serializable', async () => {
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(
        jest.fn().mockResolvedValue({
          type: 'http',
          httpResponse: {
            status: 200,
            body: () => 'nope',
          },
        })
      ) as ReturnType<typeof getConnectorSpec>
    );
    const { response: res } = await run();
    expect(res.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
    expect(res.custom).not.toHaveBeenCalled();
    expect(emitConnectorEvents).not.toHaveBeenCalled();
    expectOutcome('error', 'handle_fail');
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('invalid_handleEvents_result'),
      expect.anything()
    );
  });

  it('returns 500 when handleEvents http status is out of range', async () => {
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(
        jest.fn().mockResolvedValue({
          type: 'http',
          httpResponse: { status: 99 },
        })
      ) as ReturnType<typeof getConnectorSpec>
    );
    const { response: res } = await run();
    expect(res.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
    expect(res.custom).not.toHaveBeenCalled();
    expect(emitConnectorEvents).not.toHaveBeenCalled();
    expectOutcome('error', 'handle_fail');
  });

  it('returns 500 when handleEvents returns an unknown type', async () => {
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(
        jest.fn().mockResolvedValue({
          type: 'http',
          status: 200,
          body: {},
        })
      ) as ReturnType<typeof getConnectorSpec>
    );
    const { response: res } = await run();
    expect(res.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
    expectOutcome('error', 'handle_fail');
    expect(emitConnectorEvents).not.toHaveBeenCalled();
  });

  it('returns 500 when emitted event count exceeds the max', async () => {
    const eventId = buildEventId('.myConnector', 'received');
    const events = Array.from({ length: INBOUND_EVENTS_MAX_EMITTED_DEFAULT + 1 }, (_, i) => ({
      eventId,
      correlationKey: `corr-${i}`,
      payload: { body: {} },
    }));
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(jest.fn().mockResolvedValue({ type: 'emit', events })) as ReturnType<
        typeof getConnectorSpec
      >
    );
    const { response: res } = await run();
    expect(res.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
    expect(emitConnectorEvents).not.toHaveBeenCalled();
    expectOutcome('error', 'handle_fail');
  });

  it('respects a configured maxEmitted', async () => {
    const eventId = buildEventId('.myConnector', 'received');
    const events = Array.from({ length: 3 }, (_, i) => ({
      eventId,
      correlationKey: `corr-${i}`,
      payload: { body: {} },
    }));
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(jest.fn().mockResolvedValue({ type: 'emit', events })) as ReturnType<
        typeof getConnectorSpec
      >
    );
    const { response: res } = await run({ maxEmitted: 2 });
    expect(res.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
    expect(emitConnectorEvents).not.toHaveBeenCalled();
  });

  it('emits when the event count is within a raised maxEmitted', async () => {
    const eventId = buildEventId('.myConnector', 'received');
    const events = Array.from({ length: INBOUND_EVENTS_MAX_EMITTED_DEFAULT + 1 }, (_, i) => ({
      eventId,
      correlationKey: `corr-${i}`,
      payload: { body: {} },
    }));
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(jest.fn().mockResolvedValue({ type: 'emit', events })) as ReturnType<
        typeof getConnectorSpec
      >
    );
    const { response: res } = await run({ maxEmitted: INBOUND_EVENTS_MAX_EMITTED_DEFAULT + 1 });
    expect(res.accepted).toHaveBeenCalledWith({ body: { ok: true } });
    expect(emitConnectorEvents).toHaveBeenCalled();
  });

  it('returns 500 when the emit payload exceeds a tighter maxBodyBytes', async () => {
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(
        jest.fn().mockResolvedValue({
          type: 'emit',
          events: [
            {
              eventId: buildEventId('.myConnector', 'received'),
              correlationKey: 'c1',
              payload: { body: 'x'.repeat(200) },
            },
          ],
        })
      ) as ReturnType<typeof getConnectorSpec>
    );
    const { response: res } = await run({ maxBodyBytes: 50 });
    expect(res.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
    expect(emitConnectorEvents).not.toHaveBeenCalled();
    expectOutcome('error', 'handle_fail');
  });

  it('returns 500 when emitted events fail validation', async () => {
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(
        jest.fn().mockResolvedValue({
          type: 'emit',
          events: [
            {
              eventId: 'unknown.event',
              correlationKey: 'corr-1',
              payload: { body: {} },
            },
          ],
        })
      ) as ReturnType<typeof getConnectorSpec>
    );
    const { response: res } = await run();
    expect(res.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
    expect(emitConnectorEvents).not.toHaveBeenCalled();
    expectOutcome('error', 'validate_fail');
  });
});

describe('truncateInboundIngressDetail', () => {
  it('truncates oversize detail', () => {
    const input = 'a'.repeat(INBOUND_INGRESS_OUTCOME_DETAIL_MAX_LENGTH + 10);
    const out = truncateInboundIngressDetail(input);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBe(INBOUND_INGRESS_OUTCOME_DETAIL_MAX_LENGTH + 1);
  });
});
