/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flow } from 'fp-ts/function';
import { createDeserializer } from '../form';

import {
  formDataToAbsoluteTimings,
  calculateRelativeFromAbsoluteMilliseconds,
} from './absolute_timing_to_relative_timing';

const deserializer = createDeserializer(false);

export const calculateRelativeTimingMs = flow(
  formDataToAbsoluteTimings,
  calculateRelativeFromAbsoluteMilliseconds
);

describe('Conversion of absolute policy timing to relative timing', () => {
  describe('calculateRelativeTimingMs', () => {
    describe('policy that never deletes data (keep forever)', () => {
      test('always hot', () => {
        expect(
          calculateRelativeTimingMs(
            deserializer({
              name: 'test',
              phases: {
                hot: {
                  min_age: '0ms',
                  actions: {},
                },
              },
            })
          )
        ).toEqual({ total: Infinity, phases: { hot: Infinity, warm: undefined, cold: undefined } });
      });

      test('hot, then always warm', () => {
        expect(
          calculateRelativeTimingMs(
            deserializer({
              name: 'test',
              phases: {
                hot: {
                  min_age: '0ms',
                  actions: {},
                },
                warm: {
                  actions: {},
                },
              },
            })
          )
        ).toEqual({ total: Infinity, phases: { hot: 0, warm: Infinity, cold: undefined } });
      });

      test('hot, then warm, then always cold', () => {
        expect(
          calculateRelativeTimingMs(
            deserializer({
              name: 'test',
              phases: {
                hot: {
                  min_age: '0ms',
                  actions: {},
                },
                warm: {
                  min_age: '1M',
                  actions: {},
                },
                cold: {
                  min_age: '34d',
                  actions: {},
                },
              },
            })
          )
        ).toEqual({
          total: Infinity,
          phases: {
            hot: 2592000000,
            warm: 345600000,
            cold: Infinity,
          },
        });
      });

      test('hot, then always cold', () => {
        expect(
          calculateRelativeTimingMs(
            deserializer({
              name: 'test',
              phases: {
                hot: {
                  min_age: '0ms',
                  actions: {},
                },
                cold: {
                  min_age: '34d',
                  actions: {},
                },
              },
            })
          )
        ).toEqual({
          total: Infinity,
          phases: { hot: 2937600000, warm: undefined, cold: Infinity },
        });
      });
    });

    describe('policy that deletes data', () => {
      test('hot, then delete', () => {
        expect(
          calculateRelativeTimingMs(
            deserializer({
              name: 'test',
              phases: {
                hot: {
                  min_age: '0ms',
                  actions: {},
                },
                delete: {
                  min_age: '1M',
                  actions: {},
                },
              },
            })
          )
        ).toEqual({
          total: 2592000000,
          phases: {
            hot: 2592000000,
            warm: undefined,
            cold: undefined,
          },
        });
      });

      test('hot, then warm, then delete', () => {
        expect(
          calculateRelativeTimingMs(
            deserializer({
              name: 'test',
              phases: {
                hot: {
                  min_age: '0ms',
                  actions: {},
                },
                warm: {
                  min_age: '24d',
                  actions: {},
                },
                delete: {
                  min_age: '1M',
                  actions: {},
                },
              },
            })
          )
        ).toEqual({
          total: 2592000000,
          phases: {
            hot: 2073600000,
            warm: 518400000,
            cold: undefined,
          },
        });
      });

      test('hot, then warm, then cold, then delete', () => {
        expect(
          calculateRelativeTimingMs(
            deserializer({
              name: 'test',
              phases: {
                hot: {
                  min_age: '0ms',
                  actions: {},
                },
                warm: {
                  min_age: '24d',
                  actions: {},
                },
                cold: {
                  min_age: '2M',
                  actions: {},
                },
                delete: {
                  min_age: '2d',
                  actions: {},
                },
              },
            })
          )
        ).toEqual({
          total: 5270400000,
          phases: {
            hot: 2073600000,
            warm: 3196800000,
            cold: 0,
          },
        });
      });

      test('hot, then cold, then delete', () => {
        expect(
          calculateRelativeTimingMs(
            deserializer({
              name: 'test',
              phases: {
                hot: {
                  min_age: '0ms',
                  actions: {},
                },
                cold: {
                  min_age: '2M',
                  actions: {},
                },
                delete: {
                  min_age: '2d',
                  actions: {},
                },
              },
            })
          )
        ).toEqual({
          total: 5270400000,
          phases: {
            hot: 5270400000,
            warm: undefined,
            cold: 0,
          },
        });
      });

      test('hot, then long warm, then short cold, then delete', () => {
        expect(
          calculateRelativeTimingMs(
            deserializer({
              name: 'test',
              phases: {
                hot: {
                  min_age: '0ms',
                  actions: {},
                },
                warm: {
                  min_age: '2M',
                  actions: {},
                },
                cold: {
                  min_age: '1d',
                  actions: {},
                },
                delete: {
                  min_age: '2d',
                  actions: {},
                },
              },
            })
          )
        ).toEqual({
          total: 5270400000,
          phases: {
            hot: 5270400000,
            warm: 0,
            cold: 0,
          },
        });
      });
    });
  });
});
