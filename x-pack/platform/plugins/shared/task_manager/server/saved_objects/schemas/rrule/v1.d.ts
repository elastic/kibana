/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Frequency } from '@kbn/rrule';
export declare function validateTimezone(timezone: string): string | undefined;
export declare const rruleCommon: import('@kbn/config-schema').ObjectType<{
  freq: import('@kbn/config-schema').Type<0 | 1 | 2 | 3 | 4 | 5 | 6>;
  interval: import('@kbn/config-schema').Type<number>;
  tzid: import('@kbn/config-schema').Type<string>;
}>;
export declare const byminute: import('@kbn/config-schema').Type<number[] | undefined>;
export declare const byhour: import('@kbn/config-schema').Type<number[] | undefined>;
export declare const byweekday: import('@kbn/config-schema').Type<string[] | undefined>;
export declare const bymonthday: import('@kbn/config-schema').Type<number[] | undefined>;
export declare const rruleSchedule: import('@kbn/config-schema').Type<
  | Readonly<
      {
        byhour?: number[] | undefined;
        byminute?: number[] | undefined;
        byweekday?: string[] | undefined;
        bymonthday?: number[] | undefined;
      } & {
        interval: number;
        tzid: string;
        freq: Frequency.MONTHLY;
      }
    >
  | Readonly<
      {
        byhour?: number[] | undefined;
        byminute?: number[] | undefined;
        byweekday?: string[] | undefined;
      } & {
        interval: number;
        tzid: string;
        freq: Frequency.WEEKLY;
        bymonthday: never;
      }
    >
  | Readonly<
      {
        byhour?: number[] | undefined;
        byminute?: number[] | undefined;
        byweekday?: string[] | undefined;
      } & {
        interval: number;
        tzid: string;
        freq: Frequency.DAILY;
        bymonthday: never;
      }
    >
>;
export declare const scheduleRruleSchema: import('@kbn/config-schema').ObjectType<{
  rrule: import('@kbn/config-schema').Type<
    | Readonly<
        {
          byhour?: number[] | undefined;
          byminute?: number[] | undefined;
          byweekday?: string[] | undefined;
          bymonthday?: number[] | undefined;
        } & {
          interval: number;
          tzid: string;
          freq: Frequency.MONTHLY;
        }
      >
    | Readonly<
        {
          byhour?: number[] | undefined;
          byminute?: number[] | undefined;
          byweekday?: string[] | undefined;
        } & {
          interval: number;
          tzid: string;
          freq: Frequency.WEEKLY;
          bymonthday: never;
        }
      >
    | Readonly<
        {
          byhour?: number[] | undefined;
          byminute?: number[] | undefined;
          byweekday?: string[] | undefined;
        } & {
          interval: number;
          tzid: string;
          freq: Frequency.DAILY;
          bymonthday: never;
        }
      >
  >;
}>;
