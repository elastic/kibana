/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type TypeOf } from '@kbn/config-schema';
import type * as v3 from './v3';
export declare const stateSchemaByVersion: {
  1: {
    up: typeof import('./v1/migration').upMigration;
    schema: import('@kbn/config-schema').ObjectType<{
      alertTypeState: import('@kbn/config-schema').Type<Record<string, any> | undefined>;
      alertInstances: import('@kbn/config-schema').Type<
        | Record<
            string,
            Readonly<
              {
                meta?:
                  | Readonly<
                      {
                        lastScheduledActions?:
                          | Readonly<
                              {
                                subgroup?: string | undefined;
                                actions?:
                                  | Record<
                                      string,
                                      Readonly<
                                        {} & {
                                          date: string;
                                        }
                                      >
                                    >
                                  | undefined;
                              } & {
                                group: string;
                                date: string;
                              }
                            >
                          | undefined;
                        flappingHistory?: boolean[] | undefined;
                        flapping?: boolean | undefined;
                        maintenanceWindowIds?: string[] | undefined;
                        maintenanceWindowNames?: string[] | undefined;
                        pendingRecoveredCount?: number | undefined;
                        uuid?: string | undefined;
                        activeCount?: number | undefined;
                      } & {}
                    >
                  | undefined;
                state?: Record<string, any> | undefined;
              } & {}
            >
          >
        | undefined
      >;
      alertRecoveredInstances: import('@kbn/config-schema').Type<
        | Record<
            string,
            Readonly<
              {
                meta?:
                  | Readonly<
                      {
                        lastScheduledActions?:
                          | Readonly<
                              {
                                subgroup?: string | undefined;
                                actions?:
                                  | Record<
                                      string,
                                      Readonly<
                                        {} & {
                                          date: string;
                                        }
                                      >
                                    >
                                  | undefined;
                              } & {
                                group: string;
                                date: string;
                              }
                            >
                          | undefined;
                        flappingHistory?: boolean[] | undefined;
                        flapping?: boolean | undefined;
                        maintenanceWindowIds?: string[] | undefined;
                        maintenanceWindowNames?: string[] | undefined;
                        pendingRecoveredCount?: number | undefined;
                        uuid?: string | undefined;
                        activeCount?: number | undefined;
                      } & {}
                    >
                  | undefined;
                state?: Record<string, any> | undefined;
              } & {}
            >
          >
        | undefined
      >;
      previousStartedAt: import('@kbn/config-schema').Type<string | null | undefined>;
      summaryActions: import('@kbn/config-schema').Type<
        | Record<
            string,
            Readonly<
              {} & {
                date: string;
              }
            >
          >
        | undefined
      >;
    }>;
  };
  2: {
    up: typeof import('./v2/migration').upMigration;
    schema: import('@kbn/config-schema').ObjectType<
      Omit<
        {
          alertTypeState: import('@kbn/config-schema').Type<Record<string, any> | undefined>;
          alertInstances: import('@kbn/config-schema').Type<
            | Record<
                string,
                Readonly<
                  {
                    meta?:
                      | Readonly<
                          {
                            lastScheduledActions?:
                              | Readonly<
                                  {
                                    subgroup?: string | undefined;
                                    actions?:
                                      | Record<
                                          string,
                                          Readonly<
                                            {} & {
                                              date: string;
                                            }
                                          >
                                        >
                                      | undefined;
                                  } & {
                                    group: string;
                                    date: string;
                                  }
                                >
                              | undefined;
                            flappingHistory?: boolean[] | undefined;
                            flapping?: boolean | undefined;
                            maintenanceWindowIds?: string[] | undefined;
                            maintenanceWindowNames?: string[] | undefined;
                            pendingRecoveredCount?: number | undefined;
                            uuid?: string | undefined;
                            activeCount?: number | undefined;
                          } & {}
                        >
                      | undefined;
                    state?: Record<string, any> | undefined;
                  } & {}
                >
              >
            | undefined
          >;
          alertRecoveredInstances: import('@kbn/config-schema').Type<
            | Record<
                string,
                Readonly<
                  {
                    meta?:
                      | Readonly<
                          {
                            lastScheduledActions?:
                              | Readonly<
                                  {
                                    subgroup?: string | undefined;
                                    actions?:
                                      | Record<
                                          string,
                                          Readonly<
                                            {} & {
                                              date: string;
                                            }
                                          >
                                        >
                                      | undefined;
                                  } & {
                                    group: string;
                                    date: string;
                                  }
                                >
                              | undefined;
                            flappingHistory?: boolean[] | undefined;
                            flapping?: boolean | undefined;
                            maintenanceWindowIds?: string[] | undefined;
                            maintenanceWindowNames?: string[] | undefined;
                            pendingRecoveredCount?: number | undefined;
                            uuid?: string | undefined;
                            activeCount?: number | undefined;
                          } & {}
                        >
                      | undefined;
                    state?: Record<string, any> | undefined;
                  } & {}
                >
              >
            | undefined
          >;
          previousStartedAt: import('@kbn/config-schema').Type<string | null | undefined>;
          summaryActions: import('@kbn/config-schema').Type<
            | Record<
                string,
                Readonly<
                  {} & {
                    date: string;
                  }
                >
              >
            | undefined
          >;
        },
        'trackedExecutions'
      > & {
        trackedExecutions: import('@kbn/config-schema').Type<string[] | undefined>;
      }
    >;
  };
  3: {
    up: typeof import('./v3/migration').upMigration;
    schema: import('@kbn/config-schema').ObjectType<{
      alertTypeState: import('@kbn/config-schema').Type<Record<string, any> | undefined>;
      alertInstances: import('@kbn/config-schema').Type<
        | Record<
            string,
            Readonly<
              {
                meta?:
                  | Readonly<
                      {
                        lastScheduledActions?:
                          | Readonly<
                              {
                                subgroup?: string | undefined;
                                actions?:
                                  | Record<
                                      string,
                                      Readonly<
                                        {} & {
                                          date: string;
                                        }
                                      >
                                    >
                                  | undefined;
                              } & {
                                group: string;
                                date: string;
                              }
                            >
                          | undefined;
                        flappingHistory?: boolean[] | undefined;
                        flapping?: boolean | undefined;
                        maintenanceWindowIds?: string[] | undefined;
                        maintenanceWindowNames?: string[] | undefined;
                        pendingRecoveredCount?: number | undefined;
                        uuid?: string | undefined;
                        activeCount?: number | undefined;
                      } & {}
                    >
                  | undefined;
                state?: Record<string, any> | undefined;
              } & {}
            >
          >
        | undefined
      >;
      alertRecoveredInstances: import('@kbn/config-schema').Type<
        | Record<
            string,
            Readonly<
              {
                meta?:
                  | Readonly<
                      {
                        lastScheduledActions?:
                          | Readonly<
                              {
                                subgroup?: string | undefined;
                                actions?:
                                  | Record<
                                      string,
                                      Readonly<
                                        {} & {
                                          date: string;
                                        }
                                      >
                                    >
                                  | undefined;
                              } & {
                                group: string;
                                date: string;
                              }
                            >
                          | undefined;
                        flappingHistory?: boolean[] | undefined;
                        flapping?: boolean | undefined;
                        maintenanceWindowIds?: string[] | undefined;
                        maintenanceWindowNames?: string[] | undefined;
                        pendingRecoveredCount?: number | undefined;
                        uuid?: string | undefined;
                        activeCount?: number | undefined;
                      } & {}
                    >
                  | undefined;
                state?: Record<string, any> | undefined;
              } & {}
            >
          >
        | undefined
      >;
      previousStartedAt: import('@kbn/config-schema').Type<string | null | undefined>;
      summaryActions: import('@kbn/config-schema').Type<
        | Record<
            string,
            Readonly<
              {} & {
                date: string;
              }
            >
          >
        | undefined
      >;
    }>;
  };
};
declare const latest: typeof v3;
/**
 * WARNING: Do not modify the code below when doing a new version.
 * Update the "latest" variable instead.
 */
declare const latestTaskStateSchema: import('@kbn/config-schema').ObjectType<{
  alertTypeState: import('@kbn/config-schema').Type<Record<string, any> | undefined>;
  alertInstances: import('@kbn/config-schema').Type<
    | Record<
        string,
        Readonly<
          {
            meta?:
              | Readonly<
                  {
                    lastScheduledActions?:
                      | Readonly<
                          {
                            subgroup?: string | undefined;
                            actions?:
                              | Record<
                                  string,
                                  Readonly<
                                    {} & {
                                      date: string;
                                    }
                                  >
                                >
                              | undefined;
                          } & {
                            group: string;
                            date: string;
                          }
                        >
                      | undefined;
                    flappingHistory?: boolean[] | undefined;
                    flapping?: boolean | undefined;
                    maintenanceWindowIds?: string[] | undefined;
                    maintenanceWindowNames?: string[] | undefined;
                    pendingRecoveredCount?: number | undefined;
                    uuid?: string | undefined;
                    activeCount?: number | undefined;
                  } & {}
                >
              | undefined;
            state?: Record<string, any> | undefined;
          } & {}
        >
      >
    | undefined
  >;
  alertRecoveredInstances: import('@kbn/config-schema').Type<
    | Record<
        string,
        Readonly<
          {
            meta?:
              | Readonly<
                  {
                    lastScheduledActions?:
                      | Readonly<
                          {
                            subgroup?: string | undefined;
                            actions?:
                              | Record<
                                  string,
                                  Readonly<
                                    {} & {
                                      date: string;
                                    }
                                  >
                                >
                              | undefined;
                          } & {
                            group: string;
                            date: string;
                          }
                        >
                      | undefined;
                    flappingHistory?: boolean[] | undefined;
                    flapping?: boolean | undefined;
                    maintenanceWindowIds?: string[] | undefined;
                    maintenanceWindowNames?: string[] | undefined;
                    pendingRecoveredCount?: number | undefined;
                    uuid?: string | undefined;
                    activeCount?: number | undefined;
                  } & {}
                >
              | undefined;
            state?: Record<string, any> | undefined;
          } & {}
        >
      >
    | undefined
  >;
  previousStartedAt: import('@kbn/config-schema').Type<string | null | undefined>;
  summaryActions: import('@kbn/config-schema').Type<
    | Record<
        string,
        Readonly<
          {} & {
            date: string;
          }
        >
      >
    | undefined
  >;
}>;
export type LatestTaskStateSchema = TypeOf<typeof latestTaskStateSchema>;
export type LatestRawAlertInstanceSchema = TypeOf<typeof latest.rawAlertInstanceSchema>;
export type LatestAlertInstanceMetaSchema = TypeOf<typeof latest.metaSchema>;
export type LatestAlertInstanceStateSchema = TypeOf<typeof latest.alertStateSchema>;
export type LatestThrottledActionSchema = TypeOf<typeof latest.throttledActionSchema>;
export type LatestLastScheduledActionsSchema = TypeOf<typeof latest.lastScheduledActionsSchema>;
export declare const emptyState: LatestTaskStateSchema;
type Mutable<T> = {
  -readonly [k in keyof T]: Mutable<T[k]>;
};
export type MutableLatestTaskStateSchema = Mutable<LatestTaskStateSchema>;
export type MutableLatestAlertInstanceMetaSchema = Mutable<LatestAlertInstanceMetaSchema>;
export {};
