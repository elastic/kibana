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
        locations: [],
        numTimes: 5,
        timerange: {
          from: 'now-15m',
          to: 'now',
        },
      };
    });

    it(`doesn't throw on empty set`, () => {
      expect(validate({})).toMatchInlineSnapshot(`
        Object {
          "errors": Object {},
        }
      `);
    });

    it('missing timerange', () => {
      delete params.timerange;
      expect(() => validate(params)).toThrowErrorMatchingInlineSnapshot(
        `"Invalid value undefined supplied to : (Partial<{ filters: string }> & { locations: Array<string>, numTimes: number, timerange: { from: string, to: string } })/1: { locations: Array<string>, numTimes: number, timerange: { from: string, to: string } }/timerange: { from: string, to: string }"`
      );
    });

    it('timerange missing `from` or `to` value', () => {
      expect(() =>
        validate({
          ...params,
          timerange: {},
        })
      ).toThrowErrorMatchingInlineSnapshot(`
"Invalid value undefined supplied to : (Partial<{ filters: string }> & { locations: Array<string>, numTimes: number, timerange: { from: string, to: string } })/1: { locations: Array<string>, numTimes: number, timerange: { from: string, to: string } }/timerange: { from: string, to: string }/from: string
Invalid value undefined supplied to : (Partial<{ filters: string }> & { locations: Array<string>, numTimes: number, timerange: { from: string, to: string } })/1: { locations: Array<string>, numTimes: number, timerange: { from: string, to: string } }/timerange: { from: string, to: string }/to: string"
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
      expect(() => validate(params)).toThrowErrorMatchingInlineSnapshot(
        `"Invalid value undefined supplied to : (Partial<{ filters: string }> & { locations: Array<string>, numTimes: number, timerange: { from: string, to: string } })/1: { locations: Array<string>, numTimes: number, timerange: { from: string, to: string } }/numTimes: number"`
      );
    });

    it('NaN numTimes', () => {
      expect(() =>
        validate({ ...params, numTimes: `this isn't a number` })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid value \\"this isn't a number\\" supplied to : (Partial<{ filters: string }> & { locations: Array<string>, numTimes: number, timerange: { from: string, to: string } })/1: { locations: Array<string>, numTimes: number, timerange: { from: string, to: string } }/numTimes: number"`
      );
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
