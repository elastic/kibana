/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Alert } from '../../alert';
import type {
  AlertInstanceState,
  AlertInstanceContext,
  DefaultActionGroupId,
} from '../../../common';
import { isAlertFlapping } from './is_alert_flapping';
import { DEFAULT_FLAPPING_SETTINGS } from '../../../common/rules_settings';

describe('setFlapping', () => {
  describe('isAlertFlapping', () => {
    describe('not currently flapping', () => {
      test('returns true if the flap count exceeds the threshold', () => {
        const flappingHistory = [true, true, true, true].concat(new Array(16).fill(false));
        const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>(
          '1',
          {
            meta: { flappingHistory },
          }
        );
        expect(isAlertFlapping(DEFAULT_FLAPPING_SETTINGS, alert)).toEqual(true);
      });

      test("returns false the flap count doesn't exceed the threshold", () => {
        const flappingHistory = [true, true].concat(new Array(20).fill(false));
        const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>(
          '1',
          {
            meta: { flappingHistory },
          }
        );
        expect(isAlertFlapping(DEFAULT_FLAPPING_SETTINGS, alert)).toEqual(false);
      });

      test('returns true if not at capacity and the flap count exceeds the threshold', () => {
        const flappingHistory = new Array(5).fill(true);
        const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>(
          '1',
          {
            meta: { flappingHistory },
          }
        );
        expect(isAlertFlapping(DEFAULT_FLAPPING_SETTINGS, alert)).toEqual(true);
      });
    });

    describe('currently flapping', () => {
      test('returns true if at capacity and the flap count exceeds the threshold', () => {
        const flappingHistory = new Array(16).fill(false).concat([true, true, true, true]);
        const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>(
          '1',
          {
            meta: { flappingHistory, flapping: true },
          }
        );
        expect(isAlertFlapping(DEFAULT_FLAPPING_SETTINGS, alert)).toEqual(true);
      });

      test("returns true if not at capacity and the flap count doesn't exceed the threshold", () => {
        const flappingHistory = new Array(16).fill(false);
        const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>(
          '1',
          {
            meta: { flappingHistory, flapping: true },
          }
        );
        expect(isAlertFlapping(DEFAULT_FLAPPING_SETTINGS, alert)).toEqual(true);
      });

      test('returns true if not at capacity and the flap count exceeds the threshold', () => {
        const flappingHistory = new Array(10).fill(false).concat([true, true, true, true]);
        const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>(
          '1',
          {
            meta: { flappingHistory, flapping: true },
          }
        );
        expect(isAlertFlapping(DEFAULT_FLAPPING_SETTINGS, alert)).toEqual(true);
      });

      test("returns false if at capacity and the flap count doesn't exceed the threshold", () => {
        const flappingHistory = new Array(20).fill(false);
        const alert = new Alert<AlertInstanceState, AlertInstanceContext, DefaultActionGroupId>(
          '1',
          {
            meta: { flappingHistory, flapping: true },
          }
        );
        expect(isAlertFlapping(DEFAULT_FLAPPING_SETTINGS, alert)).toEqual(false);
      });
    });
  });
});
