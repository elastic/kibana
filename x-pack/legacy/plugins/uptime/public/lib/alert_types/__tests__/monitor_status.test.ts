/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validate, initMonitorStatusAlertType } from '../monitor_status';

describe('monitor status alert type', () => {
  describe('validate', () => {
    let params: any;

    beforeEach(() => {
      params = {
        numTimes: 5,
        timerange: {
          from: 'now-15m',
          to: 'now',
        },
      };
    });

    it('missing timerange', () => {
      delete params.timerange;
      expect(validate(params)).toMatchInlineSnapshot(`
        Object {
          "errors": Object {
            "noTimeRange": "No time range specified",
          },
        }
      `);
    });

    it('timerange missing `from` or `to` value', () => {
      expect(
        validate({
          ...params,
          timerange: {},
        })
      ).toMatchInlineSnapshot(`
        Object {
          "errors": Object {
            "noTimeRangeEnd": "Specified time range has no end time",
            "noTimeRangeStart": "Specified time range has no start time",
          },
        }
      `);
    });

    it('invalid time range', () => {
      expect(
        validate({
          ...params,
          timerange: {
            from: 'now',
            to: 'now-15m',
          },
        })
      ).toMatchInlineSnapshot(`
        Object {
          "errors": Object {
            "invalidTimeRange": "Time range start cannot exceed time range end",
          },
        }
      `);
    });

    it('missing numTimes', () => {
      delete params.numTimes;
      expect(validate(params)).toMatchInlineSnapshot(`
        Object {
          "errors": Object {
            "invalidNumTimes": "Number of alert check down times must be an integer greater than 0",
          },
        }
      `);
    });

    it('NaN numTimes', () => {
      expect(validate({ ...params, numTimes: `this isn't a number` })).toMatchInlineSnapshot(`
        Object {
          "errors": Object {
            "invalidNumTimes": "Number of alert check down times must be an integer greater than 0",
          },
        }
      `);
    });

    it('numTimes < 1', () => {
      expect(validate({ ...params, numTimes: 0 })).toMatchInlineSnapshot(`
        Object {
          "errors": Object {
            "invalidNumTimes": "Number of alert check down times must be an integer greater than 0",
          },
        }
      `);
    });
  });

  describe('initMonitorStatusAlertType', () => {
    expect(initMonitorStatusAlertType({ autocomplete: {} })).toMatchInlineSnapshot(`
      Object {
        "alertParamsExpression": [Function],
        "defaultActionMessage": "Monitor [{{ctx.metadata.name}}] is down",
        "iconClass": "uptimeApp",
        "id": "xpack.uptime.alerts.downMonitor",
        "name": "Uptime Monitor Status",
        "validate": [Function],
      }
    `);
  });
});
