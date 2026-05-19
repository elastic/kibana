/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export declare const throttledActionSchema: import('@kbn/config-schema').Type<
  Record<
    string,
    Readonly<
      {} & {
        date: string;
      }
    >
  >
>;
export declare const alertStateSchema: import('@kbn/config-schema').Type<Record<string, any>>;
export declare const lastScheduledActionsSchema: import('@kbn/config-schema').ObjectType<{
  subgroup: import('@kbn/config-schema').Type<string | undefined>;
  group: import('@kbn/config-schema').Type<string>;
  date: import('@kbn/config-schema').Type<string>;
  actions: import('@kbn/config-schema').Type<
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
export declare const metaSchema: import('@kbn/config-schema').ObjectType<{
  lastScheduledActions: import('@kbn/config-schema').Type<
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
    | undefined
  >;
  flappingHistory: import('@kbn/config-schema').Type<boolean[] | undefined>;
  flapping: import('@kbn/config-schema').Type<boolean | undefined>;
  maintenanceWindowIds: import('@kbn/config-schema').Type<string[] | undefined>;
  maintenanceWindowNames: import('@kbn/config-schema').Type<string[] | undefined>;
  pendingRecoveredCount: import('@kbn/config-schema').Type<number | undefined>;
  uuid: import('@kbn/config-schema').Type<string | undefined>;
  activeCount: import('@kbn/config-schema').Type<number | undefined>;
}>;
export declare const rawAlertInstanceSchema: import('@kbn/config-schema').ObjectType<{
  meta: import('@kbn/config-schema').Type<
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
    | undefined
  >;
  state: import('@kbn/config-schema').Type<Record<string, any> | undefined>;
}>;
export declare const versionSchema: import('@kbn/config-schema').ObjectType<{
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
}>;
