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
        dtstart?: string | undefined;
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
        dtstart?: string | undefined;
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
        dtstart?: string | undefined;
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
  | Readonly<
      {
        dtstart?: string | undefined;
        byminute?: number[] | undefined;
      } & {
        interval: number;
        tzid: string;
        freq: Frequency.HOURLY;
        byhour: never;
        byweekday: never;
        bymonthday: never;
      }
    >
>;
export declare const scheduleRruleSchema: import('@kbn/config-schema').ObjectType<{
  rrule: import('@kbn/config-schema').Type<
    | Readonly<
        {
          dtstart?: string | undefined;
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
          dtstart?: string | undefined;
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
          dtstart?: string | undefined;
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
    | Readonly<
        {
          dtstart?: string | undefined;
          byminute?: number[] | undefined;
        } & {
          interval: number;
          tzid: string;
          freq: Frequency.HOURLY;
          byhour: never;
          byweekday: never;
          bymonthday: never;
        }
      >
  >;
}>;
