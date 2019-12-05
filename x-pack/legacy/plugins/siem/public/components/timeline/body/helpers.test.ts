/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ecs } from '../../../graphql/types';

import {
  DEFAULT_ACTIONS_COLUMN_WIDTH,
  DEFAULT_COLUMN_MIN_WIDTH,
  DEFAULT_DATE_COLUMN_MIN_WIDTH,
  EVENTS_VIEWER_ACTIONS_COLUMN_WIDTH,
  eventHasNotes,
  eventIsPinned,
  getActionsColumnWidth,
  getColumnWidthFromType,
  getPinTooltip,
  stringifyEvent,
  SHOW_CHECK_BOXES_COLUMN_WIDTH,
} from './helpers';

describe('helpers', () => {
  describe('stringifyEvent', () => {
    test('it omits __typename when it appears at arbitrary levels', () => {
      const toStringify: Ecs = {
        __typename: 'level 0',
        _id: '4',
        timestamp: '2018-11-08T19:03:25.937Z',
        host: {
          __typename: 'level 1',
          name: ['suricata'],
          ip: ['192.168.0.1'],
        },
        event: {
          id: ['4'],
          category: ['Attempted Administrator Privilege Gain'],
          type: ['Alert'],
          module: ['suricata'],
          severity: [1],
        },
        source: {
          ip: ['192.168.0.3'],
          port: [53],
        },
        destination: {
          ip: ['192.168.0.3'],
          port: [6343],
        },
        suricata: {
          eve: {
            flow_id: [4],
            proto: [''],
            alert: {
              signature: ['ET PHONE HOME Stack Overflow (CVE-2019-90210)'],
              signature_id: [4],
              __typename: 'level 2',
            },
          },
        },
        user: {
          id: ['4'],
          name: ['jack.black'],
        },
        geo: {
          region_name: ['neither'],
          country_iso_code: ['sasquatch'],
        },
      } as Ecs; // as cast so that `__typename` can be added for the tests even though it is not part of ECS
      const expected: Ecs = {
        _id: '4',
        timestamp: '2018-11-08T19:03:25.937Z',
        host: {
          name: ['suricata'],
          ip: ['192.168.0.1'],
        },
        event: {
          id: ['4'],
          category: ['Attempted Administrator Privilege Gain'],
          type: ['Alert'],
          module: ['suricata'],
          severity: [1],
        },
        source: {
          ip: ['192.168.0.3'],
          port: [53],
        },
        destination: {
          ip: ['192.168.0.3'],
          port: [6343],
        },
        suricata: {
          eve: {
            flow_id: [4],
            proto: [''],
            alert: {
              signature: ['ET PHONE HOME Stack Overflow (CVE-2019-90210)'],
              signature_id: [4],
            },
          },
        },
        user: {
          id: ['4'],
          name: ['jack.black'],
        },
        geo: {
          region_name: ['neither'],
          country_iso_code: ['sasquatch'],
        },
      };
      expect(JSON.parse(stringifyEvent(toStringify))).toEqual(expected);
    });

    test('it omits null and undefined values at arbitrary levels, for arbitrary data types', () => {
      const expected: Ecs = {
        _id: '4',
        host: {},
        event: {
          id: ['4'],
          category: ['theory'],
          type: ['Alert'],
          module: ['me'],
          severity: [1],
        },
        source: {
          port: [53],
        },
        destination: {
          ip: ['192.168.0.3'],
          port: [6343],
        },
        suricata: {
          eve: {
            flow_id: [4],
            proto: [''],
            alert: {
              signature: ['dance moves'],
            },
          },
        },
        user: {
          id: ['4'],
          name: ['no use for a'],
        },
        geo: {
          region_name: ['bizzaro'],
          country_iso_code: ['world'],
        },
      };
      const toStringify: Ecs = {
        _id: '4',
        timestamp: null,
        host: {
          name: null,
          ip: null,
        },
        event: {
          id: ['4'],
          category: ['theory'],
          type: ['Alert'],
          module: ['me'],
          severity: [1],
        },
        source: {
          ip: undefined,
          port: [53],
        },
        destination: {
          ip: ['192.168.0.3'],
          port: [6343],
        },
        suricata: {
          eve: {
            flow_id: [4],
            proto: [''],
            alert: {
              signature: ['dance moves'],
              signature_id: undefined,
            },
          },
        },
        user: {
          id: ['4'],
          name: ['no use for a'],
        },
        geo: {
          region_name: ['bizzaro'],
          country_iso_code: ['world'],
        },
      };
      expect(JSON.parse(stringifyEvent(toStringify))).toEqual(expected);
    });
  });

  describe('eventHasNotes', () => {
    test('it returns false for when notes is empty', () => {
      expect(eventHasNotes([])).toEqual(false);
    });

    test('it returns true when notes is non-empty', () => {
      expect(eventHasNotes(['8af859e2-e4f8-4754-b702-4f227f15aae5'])).toEqual(true);
    });
  });

  describe('getPinTooltip', () => {
    test('it informs the user the event may not be unpinned when the event is pinned and has notes', () => {
      expect(getPinTooltip({ isPinned: true, eventHasNotes: true })).toEqual(
        'This event cannot be unpinned because it has notes'
      );
    });

    test('it tells the user the event is persisted when the event is pinned, but has no notes', () => {
      expect(getPinTooltip({ isPinned: true, eventHasNotes: false })).toEqual(
        'This event is persisted with the timeline'
      );
    });

    test('it tells the user the event is NOT persisted when the event is not pinned, but it has notes', () => {
      expect(getPinTooltip({ isPinned: false, eventHasNotes: true })).toEqual(
        'This is event is NOT persisted with the timeline'
      );
    });

    test('it tells the user the event is NOT persisted when the event is not pinned, and has no notes', () => {
      expect(getPinTooltip({ isPinned: false, eventHasNotes: false })).toEqual(
        'This is event is NOT persisted with the timeline'
      );
    });
  });

  describe('eventIsPinned', () => {
    test('returns true when the specified event id is contained in the pinnedEventIds', () => {
      const eventId = 'race-for-the-prize';
      const pinnedEventIds = { [eventId]: true, 'waiting-for-superman': true };

      expect(eventIsPinned({ eventId, pinnedEventIds })).toEqual(true);
    });

    test('returns false when the specified event id is NOT contained in the pinnedEventIds', () => {
      const eventId = 'safety-pin';
      const pinnedEventIds = { 'thumb-tack': true };

      expect(eventIsPinned({ eventId, pinnedEventIds })).toEqual(false);
    });
  });

  describe('getColumnWidthFromType', () => {
    test('it returns the expected width for a non-date column', () => {
      expect(getColumnWidthFromType('keyword')).toEqual(DEFAULT_COLUMN_MIN_WIDTH);
    });

    test('it returns the expected width for a date column', () => {
      expect(getColumnWidthFromType('date')).toEqual(DEFAULT_DATE_COLUMN_MIN_WIDTH);
    });
  });

  describe('getActionsColumnWidth', () => {
    test('returns the default actions column width when isEventViewer is false', () => {
      expect(getActionsColumnWidth(false)).toEqual(DEFAULT_ACTIONS_COLUMN_WIDTH);
    });

    test('returns the default actions column width + checkbox width when isEventViewer is false and showCheckboxes is true', () => {
      expect(getActionsColumnWidth(false, true)).toEqual(
        DEFAULT_ACTIONS_COLUMN_WIDTH + SHOW_CHECK_BOXES_COLUMN_WIDTH
      );
    });

    test('returns the events viewer actions column width when isEventViewer is true', () => {
      expect(getActionsColumnWidth(true)).toEqual(EVENTS_VIEWER_ACTIONS_COLUMN_WIDTH);
    });

    test('returns the events viewer actions column width + checkbox width when isEventViewer is true and showCheckboxes is true', () => {
      expect(getActionsColumnWidth(true, true)).toEqual(
        EVENTS_VIEWER_ACTIONS_COLUMN_WIDTH + SHOW_CHECK_BOXES_COLUMN_WIDTH
      );
    });
  });
});
