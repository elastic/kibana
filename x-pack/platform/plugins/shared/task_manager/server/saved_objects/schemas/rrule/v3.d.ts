/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Frequency } from '@kbn/rrule';
export declare const rruleSchedule: import('@kbn/config-schema').Type<
  | Readonly<
      {
        bymonthday?: number[] | undefined;
        byweekday?: string[] | undefined;
        byhour?: number[] | undefined;
        byminute?: number[] | undefined;
        dtstart?: string | undefined;
      } & {
        interval: number;
        freq: Frequency.MONTHLY;
        tzid: string;
      }
    >
  | Readonly<
      {
        byweekday?: string[] | undefined;
        byhour?: number[] | undefined;
        byminute?: number[] | undefined;
        dtstart?: string | undefined;
      } & {
        interval: number;
        bymonthday: never;
        freq: Frequency.WEEKLY;
        tzid: string;
      }
    >
  | Readonly<
      {
        byweekday?: string[] | undefined;
        byhour?: number[] | undefined;
        byminute?: number[] | undefined;
        dtstart?: string | undefined;
      } & {
        interval: number;
        bymonthday: never;
        freq: Frequency.DAILY;
        tzid: string;
      }
    >
  | Readonly<
      {
        byminute?: number[] | undefined;
        dtstart?: string | undefined;
      } & {
        interval: number;
        bymonthday: never;
        byweekday: never;
        byhour: never;
        freq: Frequency.HOURLY;
        tzid: string;
      }
    >
>;
export declare const scheduleRruleSchema: import('@kbn/config-schema').ObjectType<{
  rrule: import('@kbn/config-schema').Type<
    | Readonly<
        {
          bymonthday?: number[] | undefined;
          byweekday?: string[] | undefined;
          byhour?: number[] | undefined;
          byminute?: number[] | undefined;
          dtstart?: string | undefined;
        } & {
          interval: number;
          freq: Frequency.MONTHLY;
          tzid: string;
        }
      >
    | Readonly<
        {
          byweekday?: string[] | undefined;
          byhour?: number[] | undefined;
          byminute?: number[] | undefined;
          dtstart?: string | undefined;
        } & {
          interval: number;
          bymonthday: never;
          freq: Frequency.WEEKLY;
          tzid: string;
        }
      >
    | Readonly<
        {
          byweekday?: string[] | undefined;
          byhour?: number[] | undefined;
          byminute?: number[] | undefined;
          dtstart?: string | undefined;
        } & {
          interval: number;
          bymonthday: never;
          freq: Frequency.DAILY;
          tzid: string;
        }
      >
    | Readonly<
        {
          byminute?: number[] | undefined;
          dtstart?: string | undefined;
        } & {
          interval: number;
          bymonthday: never;
          byweekday: never;
          byhour: never;
          freq: Frequency.HOURLY;
          tzid: string;
        }
      >
  >;
}>;
