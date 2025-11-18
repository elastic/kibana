/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { stateSchemaByVersion } from './task_state';

describe('telemetry task state', () => {
  describe('v1', () => {
    const v1 = stateSchemaByVersion[1];
    it('should work on empty object when running the up migration', () => {
      const result = v1.up({});
      expect(result).toMatchInlineSnapshot(`
        Object {
          "error_messages": undefined,
          "has_errors": false,
          "number_of_enabled_scheduled_reports": 0,
          "number_of_enabled_scheduled_reports_by_type": Object {},
          "number_of_scheduled_reports": 0,
          "number_of_scheduled_reports_by_type": Object {},
          "number_of_scheduled_reports_with_notifications": 0,
          "runs": 0,
        }
      `);
    });

    it(`shouldn't overwrite properties when running the up migration`, () => {
      const state = {
        error_messages: ['foo'],
        has_errors: true,
        number_of_enabled_scheduled_reports: 11,
        number_of_enabled_scheduled_reports_by_type: { csv_searchsource: 12 },
        number_of_scheduled_reports: 22,
        number_of_scheduled_reports_by_type: { printable_pdf: 23 },
        number_of_scheduled_reports_with_notifications: 13,
        runs: 42,
      };
      const result = v1.up(cloneDeep(state));
      expect(result).toEqual(state);
    });

    it('should drop unknown properties when running the up migration', () => {
      const state = { foo: true };
      const result = v1.up(state);
      expect(result).not.toHaveProperty('foo');
    });
  });
});
