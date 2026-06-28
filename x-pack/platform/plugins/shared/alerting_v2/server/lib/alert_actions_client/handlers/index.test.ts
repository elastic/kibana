/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_EPISODE_ACTION_TYPE,
  type AlertEpisodeActionType,
  type CreateAlertActionBody,
} from '@kbn/alerting-v2-schemas';
import type { AlertAction } from '../../../resources/datastreams/alert_actions';
import { createQueryService } from '../../services/query_service/query_service.mock';
import type {
  HandlerItem,
  HandlerPrepareContext,
  HandlerServices,
  PreparedAction,
} from '../handler';
import type { AlertEventRecord } from '../types';
import {
  type ActionHandlersRegistry,
  getActionHandlers,
  loadContextPerHandler,
  prepareWithHandler,
} from '.';

/**
 * Tests run against the canonical handler registry (via
 * `getActionHandlers()`) so the cast inside the invocation helpers is
 * exercised as it is in production. Each test starts with a wiped
 * registry and registers only the handlers it needs — the `beforeEach`
 * keeps state from leaking between cases, and the `afterAll` makes
 * sure the file doesn't pollute neighbouring suites.
 */
const wipeRegistry = (): void => {
  const registry = getActionHandlers();
  for (const key of Object.keys(registry) as AlertEpisodeActionType[]) {
    delete registry[key];
  }
};

beforeEach(wipeRegistry);
afterAll(wipeRegistry);

/**
 * Per-action typed registration shim. Callers pass a fully-narrowed
 * handler (typed against the per-action registry slot
 * `ActionHandlersRegistry[T]`); we merge it into the live registry
 * via `Object.assign`, which sidesteps the correlated-indexed-write
 * type check TS still cannot do — the production
 * `resolveHandlerOrThrow` carries the matching documentation for why
 * this is sound.
 */
const registerForTest = <T extends AlertEpisodeActionType>(
  handler: ActionHandlersRegistry[T]
): void => {
  Object.assign(getActionHandlers(), { [handler.actionType]: handler });
};

// Minimal stand-ins — the invocation helpers never inspect these
// shapes, so casting through `unknown` keeps the test wiring small
// without weakening any production type.
const fakeAlertEvent = {} as AlertEventRecord;
const fakeAuditDoc = {} as AlertAction;

const makeAckItem = (): HandlerItem<
  Extract<CreateAlertActionBody, { action_type: typeof ALERT_EPISODE_ACTION_TYPE.ACK }>
> => ({
  action: {
    action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
    episode_id: 'episode-1',
  },
  alertEvent: fakeAlertEvent,
});

const makeUnsnoozeItem = (): HandlerItem<
  Extract<CreateAlertActionBody, { action_type: typeof ALERT_EPISODE_ACTION_TYPE.UNSNOOZE }>
> => ({
  action: {
    action_type: ALERT_EPISODE_ACTION_TYPE.UNSNOOZE,
  },
  alertEvent: fakeAlertEvent,
});

const makeContext = (): HandlerPrepareContext<unknown> => ({
  alertActionDoc: fakeAuditDoc,
  userProfileUid: 'user-1',
  context: undefined,
});

const makeServices = (): HandlerServices => {
  const { queryService } = createQueryService();
  return { spaceId: 'default', queryService };
};

describe('prepareWithHandler', () => {
  it("delegates to the handler registered for the item's action_type and returns its `PreparedAction`", async () => {
    // Two distinct handlers registered in the same test prove the
    // helper routes by the discriminant rather than picking whichever
    // is present first.
    const ackPrepared: PreparedAction = { alertActionDoc: fakeAuditDoc };
    const unsnoozePrepared: PreparedAction = { alertActionDoc: fakeAuditDoc };

    const ackPrepare = jest.fn().mockReturnValue(ackPrepared);
    const unsnoozePrepare = jest.fn().mockReturnValue(unsnoozePrepared);

    registerForTest({
      actionType: ALERT_EPISODE_ACTION_TYPE.ACK,
      prepare: ackPrepare,
    });
    registerForTest({
      actionType: ALERT_EPISODE_ACTION_TYPE.UNSNOOZE,
      prepare: unsnoozePrepare,
    });

    const ackItem = makeAckItem();
    const unsnoozeItem = makeUnsnoozeItem();
    const ctx = makeContext();

    expect(prepareWithHandler(ackItem, ctx)).toBe(ackPrepared);
    expect(prepareWithHandler(unsnoozeItem, ctx)).toBe(unsnoozePrepared);

    expect(ackPrepare).toHaveBeenCalledTimes(1);
    expect(unsnoozePrepare).toHaveBeenCalledTimes(1);
  });

  it('forwards the item and prepare context unchanged to the handler', async () => {
    // The handler must see exactly what the orchestrator passed; the
    // helper has no business mutating either argument.
    const prepare = jest.fn().mockReturnValue({ alertActionDoc: fakeAuditDoc });
    registerForTest({ actionType: ALERT_EPISODE_ACTION_TYPE.ACK, prepare });

    const item = makeAckItem();
    const ctx = makeContext();

    prepareWithHandler(item, ctx);

    expect(prepare).toHaveBeenCalledWith(item, ctx);
  });

  it('throws a recognisable error when no handler is registered for the action_type', async () => {
    // While the registry is `Partial<…>` during the multi-step
    // migration this branch is reachable in tests and during early
    // wiring; the error message must mention the action_type so a
    // missing registration is debuggable at a glance.
    const item = makeAckItem();
    const ctx = makeContext();

    expect(() => prepareWithHandler(item, ctx)).toThrow(
      /No handler registered for action_type "ack"/
    );
  });
});

describe('loadContextPerHandler', () => {
  it("calls each present handler's `loadContext` with its own items + the shared services", async () => {
    const ackContext = { source: 'ack' };
    const unsnoozeContext = { source: 'unsnooze' };

    const ackLoad = jest.fn().mockResolvedValue(ackContext);
    const unsnoozeLoad = jest.fn().mockResolvedValue(unsnoozeContext);

    registerForTest({
      actionType: ALERT_EPISODE_ACTION_TYPE.ACK,
      prepare: () => ({ alertActionDoc: fakeAuditDoc }),
      loadContext: ackLoad,
    });
    registerForTest({
      actionType: ALERT_EPISODE_ACTION_TYPE.UNSNOOZE,
      prepare: () => ({ alertActionDoc: fakeAuditDoc }),
      loadContext: unsnoozeLoad,
    });

    const ackItems = [makeAckItem()];
    const unsnoozeItems = [makeUnsnoozeItem(), makeUnsnoozeItem()];
    const services = makeServices();

    const result = await loadContextPerHandler(
      {
        [ALERT_EPISODE_ACTION_TYPE.ACK]: ackItems,
        [ALERT_EPISODE_ACTION_TYPE.UNSNOOZE]: unsnoozeItems,
      },
      services
    );

    expect(result).toEqual({
      [ALERT_EPISODE_ACTION_TYPE.ACK]: ackContext,
      [ALERT_EPISODE_ACTION_TYPE.UNSNOOZE]: unsnoozeContext,
    });
    expect(ackLoad).toHaveBeenCalledWith(ackItems, services);
    expect(unsnoozeLoad).toHaveBeenCalledWith(unsnoozeItems, services);
  });

  it('returns `undefined` for handlers that do not define `loadContext` (no-preload signal)', async () => {
    // The "no preload" handler is a first-class case — the
    // orchestrator passes that `undefined` straight through to
    // `prepare` as `ctx.context`. A missing entry in the result map
    // would force the orchestrator to special-case it.
    registerForTest({
      actionType: ALERT_EPISODE_ACTION_TYPE.ACK,
      prepare: () => ({ alertActionDoc: fakeAuditDoc }),
    });

    const result = await loadContextPerHandler(
      { [ALERT_EPISODE_ACTION_TYPE.ACK]: [makeAckItem()] },
      makeServices()
    );

    expect(result).toHaveProperty(ALERT_EPISODE_ACTION_TYPE.ACK);
    expect(result[ALERT_EPISODE_ACTION_TYPE.ACK]).toBeUndefined();
  });

  it('skips entries that map to an empty action_type bucket (no handler call)', async () => {
    // The orchestrator may hand us an empty bucket if every item of
    // that type got filtered out during pairing. Iterating only over
    // the keys present in the input means we never invoke a handler
    // with a zero-length items list — which is also a useful invariant
    // for handler authors to rely on.
    const ackLoad = jest.fn().mockResolvedValue('ack-context');
    registerForTest({
      actionType: ALERT_EPISODE_ACTION_TYPE.ACK,
      prepare: () => ({ alertActionDoc: fakeAuditDoc }),
      loadContext: ackLoad,
    });

    const result = await loadContextPerHandler({}, makeServices());

    expect(result).toEqual({});
    expect(ackLoad).not.toHaveBeenCalled();
  });

  it('throws when an action_type appears in the input but is not registered', async () => {
    // Same defensive throw as `prepareWithHandler` — keeps the
    // helpers consistent so handler-author mistakes surface in a
    // single recognisable shape.
    await expect(
      loadContextPerHandler({ [ALERT_EPISODE_ACTION_TYPE.ACK]: [makeAckItem()] }, makeServices())
    ).rejects.toThrow(/No handler registered for action_type "ack"/);
  });

  it('runs all handlers in parallel rather than sequentially', async () => {
    let ackResolve: (value: unknown) => void;

    const ackLoad = jest.fn().mockReturnValue(
      new Promise((resolve) => {
        ackResolve = resolve;
      })
    );

    const unsnoozeLoad = jest.fn().mockResolvedValue('unsnooze-context');

    registerForTest({
      actionType: ALERT_EPISODE_ACTION_TYPE.ACK,
      prepare: () => ({ alertActionDoc: fakeAuditDoc }),
      loadContext: ackLoad,
    });

    registerForTest({
      actionType: ALERT_EPISODE_ACTION_TYPE.UNSNOOZE,
      prepare: () => ({ alertActionDoc: fakeAuditDoc }),
      loadContext: unsnoozeLoad,
    });

    const pending = loadContextPerHandler(
      {
        [ALERT_EPISODE_ACTION_TYPE.ACK]: [makeAckItem()],
        [ALERT_EPISODE_ACTION_TYPE.UNSNOOZE]: [makeUnsnoozeItem()],
      },
      makeServices()
    );

    // Yield twice so both `loadContext` calls have a chance to
    // execute. With sequential dispatch the second would still be
    // queued behind the first.
    await Promise.resolve();
    await Promise.resolve();

    expect(ackLoad).toHaveBeenCalledTimes(1);
    expect(unsnoozeLoad).toHaveBeenCalledTimes(1);

    ackResolve!('ack-context');
    await pending;
  });
});
