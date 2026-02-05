/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from '@kbn/kibana-utils-plugin/public';
import type { UiActionsEnhancedSerializedEvent } from '@kbn/ui-actions-enhanced-plugin/public';
import { BehaviorSubject } from 'rxjs';
import type { DynamicActionStorageApi } from './dynamic_action_storage';
import { DynamicActionStorage } from './dynamic_action_storage';
// use real const to make test fail in case someone accidentally changes it
import type { DynamicActionsSerializedState } from './types';
import type { SerializedAction } from '@kbn/ui-actions-enhanced-plugin/common/types';
import {
  VALUE_CLICK_TRIGGER,
  SELECT_RANGE_TRIGGER,
  APPLY_FILTER_TRIGGER,
} from '@kbn/ui-actions-plugin/common/trigger_ids';

const getApi = (): DynamicActionStorageApi => {
  const dynamicActionsState$ = new BehaviorSubject<DynamicActionsSerializedState['enhancements']>({
    dynamicActions: { events: [] },
  });
  return {
    setDynamicActions: (newDynamicActions) => {
      dynamicActionsState$.next(newDynamicActions);
    },
    dynamicActionsState$,
  };
};

describe('EmbeddableActionStorage', () => {
  describe('.create()', () => {
    test('method exists', () => {
      const storage = new DynamicActionStorage('testId', () => 'testTitle', getApi());
      expect(typeof storage.create).toBe('function');
    });

    test('can add event to embeddable', async () => {
      const api = getApi();
      const storage = new DynamicActionStorage('testId', () => 'testTitle', api);
      const event: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID',
        triggers: ['TRIGGER-ID'],
        action: {} as SerializedAction,
      };

      const events1 = api.dynamicActionsState$.getValue()?.dynamicActions.events ?? [];
      expect(events1).toEqual([]);

      const spy = jest.spyOn(api, 'setDynamicActions');
      await storage.create(event);
      expect(spy).toBeCalledWith({
        dynamicActions: {
          events: [
            {
              eventId: 'EVENT_ID',
              triggers: ['TRIGGER-ID'],
              action: {} as SerializedAction,
            },
          ],
        },
      });

      const events2 = api.dynamicActionsState$.getValue()?.dynamicActions.events ?? [];
      expect(events2).toEqual([event]);
    });

    test('can create multiple events', async () => {
      const api = getApi();
      const storage = new DynamicActionStorage('testId', () => 'testTitle', api);

      const event1: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID1',
        triggers: ['TRIGGER-ID'],
        action: {} as SerializedAction,
      };
      const event2: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID2',
        triggers: ['TRIGGER-ID'],
        action: {} as SerializedAction,
      };
      const event3: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID3',
        triggers: ['TRIGGER-ID'],
        action: {} as SerializedAction,
      };

      const events1 = api.dynamicActionsState$.getValue()?.dynamicActions.events ?? [];
      expect(events1).toEqual([]);

      await storage.create(event1);

      const events2 = api.dynamicActionsState$.getValue()?.dynamicActions.events ?? [];
      expect(events2).toEqual([event1]);

      await storage.create(event2);
      await storage.create(event3);

      const events3 = api.dynamicActionsState$.getValue()?.dynamicActions.events ?? [];
      expect(events3).toEqual([event1, event2, event3]);
    });

    test('throws when creating an event with the same ID', async () => {
      const storage = new DynamicActionStorage('testId', () => 'testTitle', getApi());

      const event: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID',
        triggers: ['TRIGGER-ID'],
        action: {} as SerializedAction,
      };

      await storage.create(event);
      const [, error] = await of(storage.create(event));

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toMatchInlineSnapshot(
        `"[EEXIST]: Event with [eventId = EVENT_ID] already exists on [embeddable.id = testId, embeddable.title = testTitle]."`
      );
    });
  });

  describe('.update()', () => {
    test('method exists', () => {
      const storage = new DynamicActionStorage('testId', () => 'testTitle', getApi());
      expect(typeof storage.update).toBe('function');
    });

    test('can update an existing event', async () => {
      const api = getApi();
      const storage = new DynamicActionStorage('testId', () => 'testTitle', api);

      const event1: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID',
        triggers: ['TRIGGER-ID'],
        action: {
          name: 'foo',
        } as SerializedAction,
      };
      const event2: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID',
        triggers: ['TRIGGER-ID'],
        action: {
          name: 'bar',
        } as SerializedAction,
      };

      await storage.create(event1);
      await storage.update(event2);

      const events = api.dynamicActionsState$.getValue()?.dynamicActions.events ?? [];
      expect(events).toEqual([event2]);
    });

    test('updates event in place of the old event', async () => {
      const api = getApi();
      const storage = new DynamicActionStorage('testId', () => 'testTitle', api);

      const event1: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID1',
        triggers: ['TRIGGER-ID'],
        action: {
          name: 'foo',
        } as SerializedAction,
      };
      const event2: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID2',
        triggers: ['TRIGGER-ID'],
        action: {
          name: 'bar',
        } as SerializedAction,
      };
      const event22: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID2',
        triggers: ['TRIGGER-ID'],
        action: {
          name: 'baz',
        } as SerializedAction,
      };
      const event3: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID3',
        triggers: ['TRIGGER-ID'],
        action: {
          name: 'qux',
        } as SerializedAction,
      };

      await storage.create(event1);
      await storage.create(event2);
      await storage.create(event3);

      const events1 = api.dynamicActionsState$.getValue()?.dynamicActions.events ?? [];
      expect(events1).toEqual([event1, event2, event3]);

      await storage.update(event22);

      const events2 = api.dynamicActionsState$.getValue()?.dynamicActions.events ?? [];
      expect(events2).toEqual([event1, event22, event3]);

      await storage.update(event2);

      const events3 = api.dynamicActionsState$.getValue()?.dynamicActions.events ?? [];
      expect(events3).toEqual([event1, event2, event3]);
    });

    test('throws when updating event, but storage is empty', async () => {
      const storage = new DynamicActionStorage('testId', () => 'testTitle', getApi());

      const event: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID',
        triggers: ['TRIGGER-ID'],
        action: {} as SerializedAction,
      };

      const [, error] = await of(storage.update(event));

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toMatchInlineSnapshot(
        `"[ENOENT]: Event with [eventId = EVENT_ID] could not be updated as it does not exist in [embeddable.id = testId, embeddable.title = testTitle]."`
      );
    });

    test('throws when updating event with ID that is not stored', async () => {
      const api = getApi();
      const storage = new DynamicActionStorage('testId', () => 'testTitle', api);

      const event1: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID1',
        triggers: ['TRIGGER-ID'],
        action: {} as SerializedAction,
      };
      const event2: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID2',
        triggers: ['TRIGGER-ID'],
        action: {} as SerializedAction,
      };

      await storage.create(event1);
      const [, error] = await of(storage.update(event2));

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toMatchInlineSnapshot(
        `"[ENOENT]: Event with [eventId = EVENT_ID2] could not be updated as it does not exist in [embeddable.id = testId, embeddable.title = testTitle]."`
      );
    });
  });

  describe('.remove()', () => {
    test('method exists', () => {
      const storage = new DynamicActionStorage('testId', () => 'testTitle', getApi());
      expect(typeof storage.remove).toBe('function');
    });

    test('can remove existing event', async () => {
      const api = getApi();
      const storage = new DynamicActionStorage('testId', () => 'testTitle', api);

      const event: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID',
        triggers: ['TRIGGER-ID'],
        action: {} as SerializedAction,
      };

      await storage.create(event);
      await storage.remove(event.eventId);

      const events = api.dynamicActionsState$.getValue()?.dynamicActions.events ?? [];
      expect(events).toEqual([]);
    });

    test('removes correct events in a list of events', async () => {
      const api = getApi();
      const storage = new DynamicActionStorage('testId', () => 'testTitle', api);

      const event1: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID1',
        triggers: ['TRIGGER-ID'],
        action: {
          name: 'foo',
        } as SerializedAction,
      };
      const event2: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID2',
        triggers: ['TRIGGER-ID'],
        action: {
          name: 'bar',
        } as SerializedAction,
      };
      const event3: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID3',
        triggers: ['TRIGGER-ID'],
        action: {
          name: 'qux',
        } as SerializedAction,
      };

      await storage.create(event1);
      await storage.create(event2);
      await storage.create(event3);

      const events1 = api.dynamicActionsState$.getValue()?.dynamicActions.events ?? [];
      expect(events1).toEqual([event1, event2, event3]);

      await storage.remove(event2.eventId);

      const events2 = api.dynamicActionsState$.getValue()?.dynamicActions.events ?? [];
      expect(events2).toEqual([event1, event3]);

      await storage.remove(event3.eventId);

      const events3 = api.dynamicActionsState$.getValue()?.dynamicActions.events ?? [];
      expect(events3).toEqual([event1]);

      await storage.remove(event1.eventId);

      const events4 = api.dynamicActionsState$.getValue()?.dynamicActions.events ?? [];
      expect(events4).toEqual([]);
    });

    test('throws when removing an event from an empty storage', async () => {
      const storage = new DynamicActionStorage('testId', () => 'testTitle', getApi());

      const [, error] = await of(storage.remove('EVENT_ID'));

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toMatchInlineSnapshot(
        `"[ENOENT]: Event with [eventId = EVENT_ID] could not be removed as it does not exist in [embeddable.id = testId, embeddable.title = testTitle]."`
      );
    });

    test('throws when removing with ID that does not exist in storage', async () => {
      const storage = new DynamicActionStorage('testId', () => 'testTitle', getApi());

      const event: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID',
        triggers: ['TRIGGER-ID'],
        action: {} as SerializedAction,
      };

      await storage.create(event);
      const [, error] = await of(storage.remove('WRONG_ID'));
      await storage.remove(event.eventId);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toMatchInlineSnapshot(
        `"[ENOENT]: Event with [eventId = WRONG_ID] could not be removed as it does not exist in [embeddable.id = testId, embeddable.title = testTitle]."`
      );
    });
  });

  describe('.read()', () => {
    test('method exists', () => {
      const storage = new DynamicActionStorage('testId', () => 'testTitle', getApi());
      expect(typeof storage.read).toBe('function');
    });

    test('can read an existing event out of storage', async () => {
      const storage = new DynamicActionStorage('testId', () => 'testTitle', getApi());

      const event: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID',
        triggers: ['TRIGGER-ID'],
        action: {} as SerializedAction,
      };

      await storage.create(event);
      const event2 = await storage.read(event.eventId);

      expect(event2).toEqual(event);
    });

    test('throws when reading from empty storage', async () => {
      const storage = new DynamicActionStorage('testId', () => 'testTitle', getApi());

      const [, error] = await of(storage.read('EVENT_ID'));

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toMatchInlineSnapshot(
        `"[ENOENT]: Event with [eventId = EVENT_ID] could not be found in [embeddable.id = testId, embeddable.title = testTitle]."`
      );
    });

    test('throws when reading event with ID not existing in storage', async () => {
      const storage = new DynamicActionStorage('testId', () => 'testTitle', getApi());

      const event: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID',
        triggers: ['TRIGGER-ID'],
        action: {} as SerializedAction,
      };

      await storage.create(event);
      const [, error] = await of(storage.read('WRONG_ID'));

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toMatchInlineSnapshot(
        `"[ENOENT]: Event with [eventId = WRONG_ID] could not be found in [embeddable.id = testId, embeddable.title = testTitle]."`
      );
    });

    test('returns correct event when multiple events are stored', async () => {
      const storage = new DynamicActionStorage('testId', () => 'testTitle', getApi());

      const event1: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID1',
        triggers: ['TRIGGER-ID'],
        action: {} as SerializedAction,
      };
      const event2: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID2',
        triggers: ['TRIGGER-ID'],
        action: {} as SerializedAction,
      };
      const event3: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID3',
        triggers: ['TRIGGER-ID'],
        action: {} as SerializedAction,
      };

      await storage.create(event1);
      await storage.create(event2);
      await storage.create(event3);

      const event12 = await storage.read(event1.eventId);
      const event22 = await storage.read(event2.eventId);
      const event32 = await storage.read(event3.eventId);

      expect(event12).toEqual(event1);
      expect(event22).toEqual(event2);
      expect(event32).toEqual(event3);

      expect(event12).not.toEqual(event2);
    });
  });

  describe('.count()', () => {
    test('method exists', () => {
      const storage = new DynamicActionStorage('testId', () => 'testTitle', getApi());
      expect(typeof storage.count).toBe('function');
    });

    test('returns 0 when storage is empty', async () => {
      const storage = new DynamicActionStorage('testId', () => 'testTitle', getApi());
      const count = await storage.count();
      expect(count).toBe(0);
    });

    test('returns correct number of events in storage', async () => {
      const storage = new DynamicActionStorage('testId', () => 'testTitle', getApi());
      expect(await storage.count()).toBe(0);

      await storage.create({
        eventId: 'EVENT_ID1',
        triggers: ['TRIGGER-ID'],
        action: {} as SerializedAction,
      });
      expect(await storage.count()).toBe(1);

      await storage.create({
        eventId: 'EVENT_ID2',
        triggers: ['TRIGGER-ID'],
        action: {} as SerializedAction,
      });
      expect(await storage.count()).toBe(2);

      await storage.remove('EVENT_ID1');
      expect(await storage.count()).toBe(1);

      await storage.remove('EVENT_ID2');
      expect(await storage.count()).toBe(0);
    });
  });

  describe('.list()', () => {
    test('method exists', () => {
      const storage = new DynamicActionStorage('testId', () => 'testTitle', getApi());
      expect(typeof storage.list).toBe('function');
    });

    test('returns empty array when storage is empty', async () => {
      const storage = new DynamicActionStorage('testId', () => 'testTitle', getApi());
      const list = await storage.list();
      expect(list).toEqual([]);
    });

    test('returns correct list of events in storage', async () => {
      const storage = new DynamicActionStorage('testId', () => 'testTitle', getApi());

      const event1: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID1',
        triggers: ['TRIGGER-ID'],
        action: {} as SerializedAction,
      };

      const event2: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID2',
        triggers: ['TRIGGER-ID'],
        action: {} as SerializedAction,
      };

      expect(await storage.list()).toEqual([]);

      await storage.create(event1);
      expect(await storage.list()).toEqual([event1]);

      await storage.create(event2);
      expect(await storage.list()).toEqual([event1, event2]);

      await storage.remove('EVENT_ID1');
      expect(await storage.list()).toEqual([event2]);

      await storage.remove('EVENT_ID2');
      expect(await storage.list()).toEqual([]);
    });
  });

  describe('migrate', () => {
    test('DASHBOARD_TO_DASHBOARD_DRILLDOWN triggers migration', async () => {
      const api = getApi();
      const storage = new DynamicActionStorage('testId', () => 'testTitle', api);

      const OTHER_TRIGGER = 'OTHER_TRIGGER';
      api.setDynamicActions({
        dynamicActions: {
          events: [
            {
              eventId: '1',
              triggers: [OTHER_TRIGGER, VALUE_CLICK_TRIGGER],
              action: {
                factoryId: 'DASHBOARD_TO_DASHBOARD_DRILLDOWN',
                name: '',
                config: {},
              },
            },
            {
              eventId: '3',
              triggers: [OTHER_TRIGGER, SELECT_RANGE_TRIGGER],
              action: {
                factoryId: 'DASHBOARD_TO_DASHBOARD_DRILLDOWN',
                name: '',
                config: {},
              },
            },
            {
              eventId: '3',
              triggers: [OTHER_TRIGGER],
              action: {
                factoryId: 'SOME_OTHER',
                name: '',
                config: {},
              },
            },
          ],
        },
      });

      const [event1, event2, event3] = await storage.list();
      expect(event1.triggers).toEqual([OTHER_TRIGGER, APPLY_FILTER_TRIGGER]);
      expect(event2.triggers).toEqual([OTHER_TRIGGER, APPLY_FILTER_TRIGGER]);
      expect(event3.triggers).toEqual([OTHER_TRIGGER]);
    });
  });
});
