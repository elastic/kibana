/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { upMigration } from './migration';
export {
  versionSchema,
  throttledActionSchema,
  rawAlertInstanceSchema,
  metaSchema,
  alertStateSchema,
  lastScheduledActionsSchema,
} from './schema';
export declare const versionDefinition: {
  up: typeof upMigration;
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
