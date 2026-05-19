/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  versionSchema,
  throttledActionSchema,
  rawAlertInstanceSchema,
  metaSchema,
  alertStateSchema,
  lastScheduledActionsSchema,
} from './schema';
export declare const versionDefinition: {
  up: (state: Record<string, unknown>) => Readonly<
    {
      alertTypeState?: Record<string, any> | undefined;
      alertInstances?:
        | Record<
            string,
            Readonly<
              {
                meta?:
                  | Readonly<
                      {
                        flappingHistory?: boolean[] | undefined;
                        flapping?: boolean | undefined;
                        pendingRecoveredCount?: number | undefined;
                        activeCount?: number | undefined;
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
                                date: string;
                                group: string;
                              }
                            >
                          | undefined;
                        maintenanceWindowIds?: string[] | undefined;
                        maintenanceWindowNames?: string[] | undefined;
                        uuid?: string | undefined;
                      } & {}
                    >
                  | undefined;
                state?: Record<string, any> | undefined;
              } & {}
            >
          >
        | undefined;
      alertRecoveredInstances?:
        | Record<
            string,
            Readonly<
              {
                meta?:
                  | Readonly<
                      {
                        flappingHistory?: boolean[] | undefined;
                        flapping?: boolean | undefined;
                        pendingRecoveredCount?: number | undefined;
                        activeCount?: number | undefined;
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
                                date: string;
                                group: string;
                              }
                            >
                          | undefined;
                        maintenanceWindowIds?: string[] | undefined;
                        maintenanceWindowNames?: string[] | undefined;
                        uuid?: string | undefined;
                      } & {}
                    >
                  | undefined;
                state?: Record<string, any> | undefined;
              } & {}
            >
          >
        | undefined;
      previousStartedAt?: string | null | undefined;
      summaryActions?:
        | Record<
            string,
            Readonly<
              {} & {
                date: string;
              }
            >
          >
        | undefined;
      trackedExecutions?: string[] | undefined;
    } & {}
  >;
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
                          flappingHistory?: boolean[] | undefined;
                          flapping?: boolean | undefined;
                          pendingRecoveredCount?: number | undefined;
                          activeCount?: number | undefined;
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
                                  date: string;
                                  group: string;
                                }
                              >
                            | undefined;
                          maintenanceWindowIds?: string[] | undefined;
                          maintenanceWindowNames?: string[] | undefined;
                          uuid?: string | undefined;
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
                          flappingHistory?: boolean[] | undefined;
                          flapping?: boolean | undefined;
                          pendingRecoveredCount?: number | undefined;
                          activeCount?: number | undefined;
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
                                  date: string;
                                  group: string;
                                }
                              >
                            | undefined;
                          maintenanceWindowIds?: string[] | undefined;
                          maintenanceWindowNames?: string[] | undefined;
                          uuid?: string | undefined;
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
