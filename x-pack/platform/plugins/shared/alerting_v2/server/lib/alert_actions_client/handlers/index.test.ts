/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_ACTION_TYPE, type CreateAlertActionBody } from '@kbn/alerting-v2-schemas';
import type { AlertAction } from '../../../resources/datastreams/alert_actions';
import { createQueryService } from '../../services/query_service/query_service.mock';
import type {
  ActionHandler,
  HandlerItem,
  HandlerPrepareContext,
  HandlerServices,
  PreparedAction,
} from '../handler';
import type { AlertEventRecord } from '../types';
import {
  ACTION_HANDLERS,
  type ActionHandlersRegistry,
  loadContextPerHandler,
  prepareWithHandler,
} from '.';

/**
 * The invocation helpers take the registry as a parameter, so tests
 * build their own inline registries instead of mutating the canonical
 * one. No `wipeRegistry`, no `afterEach` teardown — the production
 * registry exported from `./index.ts` is never touched here.
 */

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

/**
 * Builds a test registry whose every slot points at `defaultHandler`
 * (so every `action_type` resolves to something), then overrides the
 * specific slots a given test cares about. Defaulting all slots keeps
 * the mapped-type's exhaustiveness invariant satisfied without each
 * test spelling out every action_type.
 *
 * The single cast bridges the variance gap: `ActionHandler` is
 * contravariant in `TBody` (the *sound* reason the wide `defaultHandler`
 * fits every narrow slot); method-shorthand on `prepare` /
 * `loadContext` means TS itself checks bivariantly — same conclusion,
 * looser rule. Either way, TS can't follow the wide-handler-fits-every-
 * narrow-slot reasoning across `Object.fromEntries`, hence the cast.
 */
const buildTestRegistry = (
  overrides: Partial<ActionHandlersRegistry>,
  defaultHandler: ActionHandler<CreateAlertActionBody, unknown> = {
    prepare: () => ({ alertActionDoc: fakeAuditDoc }),
  }
): ActionHandlersRegistry => {
  const base = Object.fromEntries(
    Object.values(ALERT_EPISODE_ACTION_TYPE).map((actionType) => [actionType, defaultHandler])
  ) as ActionHandlersRegistry;
  return { ...base, ...overrides };
};

describe('production handler registry (ACTION_HANDLERS)', () => {
  it('has a registered handler for every AlertEpisodeActionType value', () => {
    // The mapped type for `ActionHandlersRegistry` already enforces
    // exhaustiveness at compile time, but the runtime assertion
    // protects against accidental shape regression of the canonical
    // export and gives a much friendlier failure when somebody adds a
    // new action_type and forgets to register a handler.
    const declaredActionTypes = Object.values(ALERT_EPISODE_ACTION_TYPE).sort();
    const registeredActionTypes = Object.keys(ACTION_HANDLERS).sort();

    expect(registeredActionTypes).toEqual(declaredActionTypes);
  });

  /**
   * Behavioural coverage for the audit-only singleton. The orchestrator
   * tests cover ack/tag/snooze/etc. end-to-end, but the singleton
   * itself is the production behaviour for six action types and
   * deserves an isolated pin so any future tweak to its contract
   * surfaces here first.
   */
  describe('audit-only slots', () => {
    const AUDIT_ONLY_ACTION_TYPES = [
      ALERT_EPISODE_ACTION_TYPE.ACK,
      ALERT_EPISODE_ACTION_TYPE.UNACK,
      ALERT_EPISODE_ACTION_TYPE.ASSIGN,
      ALERT_EPISODE_ACTION_TYPE.TAG,
      ALERT_EPISODE_ACTION_TYPE.SNOOZE,
      ALERT_EPISODE_ACTION_TYPE.UNSNOOZE,
    ] as const;

    it('shares one singleton across every audit-only slot', () => {
      // Identity check: the design relies on one prepare-function
      // serving six slots. Anyone replacing one slot with a bespoke
      // handler in the future should do so deliberately — this test
      // makes that intent visible.
      const singletons = AUDIT_ONLY_ACTION_TYPES.map((type) => ACTION_HANDLERS[type]);
      for (const handler of singletons) {
        expect(handler).toBe(singletons[0]);
      }
    });

    it('returns only the precomputed audit doc — no synthetic rule event', () => {
      const alertActionDoc = fakeAuditDoc;
      const prepared = ACTION_HANDLERS[ALERT_EPISODE_ACTION_TYPE.ACK].prepare(makeAckItem(), {
        alertActionDoc,
        userProfileUid: 'user-1',
        context: undefined,
      });

      expect(prepared).toEqual({ alertActionDoc });
    });

    it('declares no loadContext — audit-only actions never preload', () => {
      // Every audit-only slot is the same reference, so checking one
      // proves the contract for all six.
      expect(ACTION_HANDLERS[ALERT_EPISODE_ACTION_TYPE.ACK].loadContext).toBeUndefined();
    });
  });
});

describe('prepareWithHandler', () => {
  it("delegates to the handler registered for the item's action_type and returns its `PreparedAction`", () => {
    // Two distinct handlers in the same registry prove the helper
    // routes by the discriminant rather than picking whichever is
    // present first.
    const ackPrepared: PreparedAction = { alertActionDoc: fakeAuditDoc };
    const unsnoozePrepared: PreparedAction = { alertActionDoc: fakeAuditDoc };

    const ackPrepare = jest.fn().mockReturnValue(ackPrepared);
    const unsnoozePrepare = jest.fn().mockReturnValue(unsnoozePrepared);

    const registry = buildTestRegistry({
      [ALERT_EPISODE_ACTION_TYPE.ACK]: { prepare: ackPrepare },
      [ALERT_EPISODE_ACTION_TYPE.UNSNOOZE]: { prepare: unsnoozePrepare },
    });

    const ackItem = makeAckItem();
    const unsnoozeItem = makeUnsnoozeItem();
    const ctx = makeContext();

    expect(prepareWithHandler(ackItem, ctx, registry)).toBe(ackPrepared);
    expect(prepareWithHandler(unsnoozeItem, ctx, registry)).toBe(unsnoozePrepared);

    expect(ackPrepare).toHaveBeenCalledTimes(1);
    expect(unsnoozePrepare).toHaveBeenCalledTimes(1);
  });

  it('forwards the item and prepare context unchanged to the handler', () => {
    // The handler must see exactly what the orchestrator passed; the
    // helper has no business mutating either argument.
    const prepare = jest.fn().mockReturnValue({ alertActionDoc: fakeAuditDoc });
    const registry = buildTestRegistry({
      [ALERT_EPISODE_ACTION_TYPE.ACK]: { prepare },
    });

    const item = makeAckItem();
    const ctx = makeContext();

    prepareWithHandler(item, ctx, registry);

    expect(prepare).toHaveBeenCalledWith(item, ctx);
  });
});

describe('loadContextPerHandler', () => {
  it("calls each present handler's `loadContext` with its own items + the shared services", async () => {
    const ackContext = { source: 'ack' };
    const unsnoozeContext = { source: 'unsnooze' };

    const ackLoad = jest.fn().mockResolvedValue(ackContext);
    const unsnoozeLoad = jest.fn().mockResolvedValue(unsnoozeContext);

    const registry = buildTestRegistry({
      [ALERT_EPISODE_ACTION_TYPE.ACK]: {
        prepare: () => ({ alertActionDoc: fakeAuditDoc }),
        loadContext: ackLoad,
      },
      [ALERT_EPISODE_ACTION_TYPE.UNSNOOZE]: {
        prepare: () => ({ alertActionDoc: fakeAuditDoc }),
        loadContext: unsnoozeLoad,
      },
    });

    const ackItems = [makeAckItem()];
    const unsnoozeItems = [makeUnsnoozeItem(), makeUnsnoozeItem()];
    const services = makeServices();

    const result = await loadContextPerHandler(
      {
        [ALERT_EPISODE_ACTION_TYPE.ACK]: ackItems,
        [ALERT_EPISODE_ACTION_TYPE.UNSNOOZE]: unsnoozeItems,
      },
      services,
      registry
    );

    expect(result).toEqual({
      [ALERT_EPISODE_ACTION_TYPE.ACK]: ackContext,
      [ALERT_EPISODE_ACTION_TYPE.UNSNOOZE]: unsnoozeContext,
    });
    expect(ackLoad).toHaveBeenCalledWith(ackItems, services);
    expect(unsnoozeLoad).toHaveBeenCalledWith(unsnoozeItems, services);
  });

  it('returns `undefined` for handlers that do not define `loadContext` (no-preload signal)', async () => {
    // The "no preload" handler is a first-class case — the orchestrator
    // passes that `undefined` straight through to `prepare` as
    // `ctx.context`. A missing entry in the result map would force the
    // orchestrator to special-case it.
    const registry = buildTestRegistry({
      [ALERT_EPISODE_ACTION_TYPE.ACK]: {
        prepare: () => ({ alertActionDoc: fakeAuditDoc }),
      },
    });

    const result = await loadContextPerHandler(
      { [ALERT_EPISODE_ACTION_TYPE.ACK]: [makeAckItem()] },
      makeServices(),
      registry
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
    const registry = buildTestRegistry({
      [ALERT_EPISODE_ACTION_TYPE.ACK]: {
        prepare: () => ({ alertActionDoc: fakeAuditDoc }),
        loadContext: ackLoad,
      },
    });

    const result = await loadContextPerHandler({}, makeServices(), registry);

    expect(result).toEqual({});
    expect(ackLoad).not.toHaveBeenCalled();
  });

  it('runs all handlers in parallel rather than sequentially', async () => {
    let ackResolve: (value: unknown) => void;

    const ackLoad = jest.fn().mockReturnValue(
      new Promise((resolve) => {
        ackResolve = resolve;
      })
    );

    const unsnoozeLoad = jest.fn().mockResolvedValue('unsnooze-context');

    const registry = buildTestRegistry({
      [ALERT_EPISODE_ACTION_TYPE.ACK]: {
        prepare: () => ({ alertActionDoc: fakeAuditDoc }),
        loadContext: ackLoad,
      },
      [ALERT_EPISODE_ACTION_TYPE.UNSNOOZE]: {
        prepare: () => ({ alertActionDoc: fakeAuditDoc }),
        loadContext: unsnoozeLoad,
      },
    });

    const pending = loadContextPerHandler(
      {
        [ALERT_EPISODE_ACTION_TYPE.ACK]: [makeAckItem()],
        [ALERT_EPISODE_ACTION_TYPE.UNSNOOZE]: [makeUnsnoozeItem()],
      },
      makeServices(),
      registry
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
