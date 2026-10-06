/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export declare function validateDuration(duration: string): string | undefined;
export declare const taskSchemaV1: import('@kbn/config-schema').ObjectType<{
  taskType: import('@kbn/config-schema').Type<string>;
  scheduledAt: import('@kbn/config-schema').Type<string>;
  startedAt: import('@kbn/config-schema').Type<string | null>;
  retryAt: import('@kbn/config-schema').Type<string | null>;
  runAt: import('@kbn/config-schema').Type<string>;
  schedule: import('@kbn/config-schema').Type<
    | Readonly<
        {} & {
          interval: string;
        }
      >
    | undefined
  >;
  params: import('@kbn/config-schema').Type<string>;
  state: import('@kbn/config-schema').Type<string>;
  stateVersion: import('@kbn/config-schema').Type<number | undefined>;
  traceparent: import('@kbn/config-schema').Type<string>;
  user: import('@kbn/config-schema').Type<string | undefined>;
  scope: import('@kbn/config-schema').Type<string[] | undefined>;
  ownerId: import('@kbn/config-schema').Type<string | null>;
  enabled: import('@kbn/config-schema').Type<boolean | undefined>;
  timeoutOverride: import('@kbn/config-schema').Type<string | undefined>;
  attempts: import('@kbn/config-schema').Type<number>;
  status: import('@kbn/config-schema').Type<
    'claiming' | 'dead_letter' | 'failed' | 'idle' | 'running' | 'unrecognized'
  >;
  version: import('@kbn/config-schema').Type<string | undefined>;
}>;
export declare const taskSchemaV2: import('@kbn/config-schema').ObjectType<
  Omit<
    {
      taskType: import('@kbn/config-schema').Type<string>;
      scheduledAt: import('@kbn/config-schema').Type<string>;
      startedAt: import('@kbn/config-schema').Type<string | null>;
      retryAt: import('@kbn/config-schema').Type<string | null>;
      runAt: import('@kbn/config-schema').Type<string>;
      schedule: import('@kbn/config-schema').Type<
        | Readonly<
            {} & {
              interval: string;
            }
          >
        | undefined
      >;
      params: import('@kbn/config-schema').Type<string>;
      state: import('@kbn/config-schema').Type<string>;
      stateVersion: import('@kbn/config-schema').Type<number | undefined>;
      traceparent: import('@kbn/config-schema').Type<string>;
      user: import('@kbn/config-schema').Type<string | undefined>;
      scope: import('@kbn/config-schema').Type<string[] | undefined>;
      ownerId: import('@kbn/config-schema').Type<string | null>;
      enabled: import('@kbn/config-schema').Type<boolean | undefined>;
      timeoutOverride: import('@kbn/config-schema').Type<string | undefined>;
      attempts: import('@kbn/config-schema').Type<number>;
      status: import('@kbn/config-schema').Type<
        'claiming' | 'dead_letter' | 'failed' | 'idle' | 'running' | 'unrecognized'
      >;
      version: import('@kbn/config-schema').Type<string | undefined>;
    },
    'partition'
  > & {
    partition: import('@kbn/config-schema').Type<number | undefined>;
  }
>;
export declare const taskSchemaV3: import('@kbn/config-schema').ObjectType<
  Omit<
    Omit<
      {
        taskType: import('@kbn/config-schema').Type<string>;
        scheduledAt: import('@kbn/config-schema').Type<string>;
        startedAt: import('@kbn/config-schema').Type<string | null>;
        retryAt: import('@kbn/config-schema').Type<string | null>;
        runAt: import('@kbn/config-schema').Type<string>;
        schedule: import('@kbn/config-schema').Type<
          | Readonly<
              {} & {
                interval: string;
              }
            >
          | undefined
        >;
        params: import('@kbn/config-schema').Type<string>;
        state: import('@kbn/config-schema').Type<string>;
        stateVersion: import('@kbn/config-schema').Type<number | undefined>;
        traceparent: import('@kbn/config-schema').Type<string>;
        user: import('@kbn/config-schema').Type<string | undefined>;
        scope: import('@kbn/config-schema').Type<string[] | undefined>;
        ownerId: import('@kbn/config-schema').Type<string | null>;
        enabled: import('@kbn/config-schema').Type<boolean | undefined>;
        timeoutOverride: import('@kbn/config-schema').Type<string | undefined>;
        attempts: import('@kbn/config-schema').Type<number>;
        status: import('@kbn/config-schema').Type<
          'claiming' | 'dead_letter' | 'failed' | 'idle' | 'running' | 'unrecognized'
        >;
        version: import('@kbn/config-schema').Type<string | undefined>;
      },
      'partition'
    > & {
      partition: import('@kbn/config-schema').Type<number | undefined>;
    },
    'priority'
  > & {
    priority: import('@kbn/config-schema').Type<number | undefined>;
  }
>;
export declare const scheduleIntervalSchema: import('@kbn/config-schema').ObjectType<{
  interval: import('@kbn/config-schema').Type<string>;
}>;
export declare const taskSchemaV4: import('@kbn/config-schema').ObjectType<
  Omit<
    Omit<
      Omit<
        {
          taskType: import('@kbn/config-schema').Type<string>;
          scheduledAt: import('@kbn/config-schema').Type<string>;
          startedAt: import('@kbn/config-schema').Type<string | null>;
          retryAt: import('@kbn/config-schema').Type<string | null>;
          runAt: import('@kbn/config-schema').Type<string>;
          schedule: import('@kbn/config-schema').Type<
            | Readonly<
                {} & {
                  interval: string;
                }
              >
            | undefined
          >;
          params: import('@kbn/config-schema').Type<string>;
          state: import('@kbn/config-schema').Type<string>;
          stateVersion: import('@kbn/config-schema').Type<number | undefined>;
          traceparent: import('@kbn/config-schema').Type<string>;
          user: import('@kbn/config-schema').Type<string | undefined>;
          scope: import('@kbn/config-schema').Type<string[] | undefined>;
          ownerId: import('@kbn/config-schema').Type<string | null>;
          enabled: import('@kbn/config-schema').Type<boolean | undefined>;
          timeoutOverride: import('@kbn/config-schema').Type<string | undefined>;
          attempts: import('@kbn/config-schema').Type<number>;
          status: import('@kbn/config-schema').Type<
            'claiming' | 'dead_letter' | 'failed' | 'idle' | 'running' | 'unrecognized'
          >;
          version: import('@kbn/config-schema').Type<string | undefined>;
        },
        'partition'
      > & {
        partition: import('@kbn/config-schema').Type<number | undefined>;
      },
      'priority'
    > & {
      priority: import('@kbn/config-schema').Type<number | undefined>;
    },
    'apiKey' | 'userScope'
  > & {
    apiKey: import('@kbn/config-schema').Type<string | undefined>;
    userScope: import('@kbn/config-schema').Type<
      | Readonly<
          {} & {
            apiKeyId: string;
            spaceId: string;
            apiKeyCreatedByUser: boolean;
          }
        >
      | undefined
    >;
  }
>;
export declare const taskSchemaV5: import('@kbn/config-schema').ObjectType<
  Omit<
    Omit<
      Omit<
        Omit<
          {
            taskType: import('@kbn/config-schema').Type<string>;
            scheduledAt: import('@kbn/config-schema').Type<string>;
            startedAt: import('@kbn/config-schema').Type<string | null>;
            retryAt: import('@kbn/config-schema').Type<string | null>;
            runAt: import('@kbn/config-schema').Type<string>;
            schedule: import('@kbn/config-schema').Type<
              | Readonly<
                  {} & {
                    interval: string;
                  }
                >
              | undefined
            >;
            params: import('@kbn/config-schema').Type<string>;
            state: import('@kbn/config-schema').Type<string>;
            stateVersion: import('@kbn/config-schema').Type<number | undefined>;
            traceparent: import('@kbn/config-schema').Type<string>;
            user: import('@kbn/config-schema').Type<string | undefined>;
            scope: import('@kbn/config-schema').Type<string[] | undefined>;
            ownerId: import('@kbn/config-schema').Type<string | null>;
            enabled: import('@kbn/config-schema').Type<boolean | undefined>;
            timeoutOverride: import('@kbn/config-schema').Type<string | undefined>;
            attempts: import('@kbn/config-schema').Type<number>;
            status: import('@kbn/config-schema').Type<
              'claiming' | 'dead_letter' | 'failed' | 'idle' | 'running' | 'unrecognized'
            >;
            version: import('@kbn/config-schema').Type<string | undefined>;
          },
          'partition'
        > & {
          partition: import('@kbn/config-schema').Type<number | undefined>;
        },
        'priority'
      > & {
        priority: import('@kbn/config-schema').Type<number | undefined>;
      },
      'apiKey' | 'userScope'
    > & {
      apiKey: import('@kbn/config-schema').Type<string | undefined>;
      userScope: import('@kbn/config-schema').Type<
        | Readonly<
            {} & {
              apiKeyId: string;
              spaceId: string;
              apiKeyCreatedByUser: boolean;
            }
          >
        | undefined
      >;
    },
    'schedule'
  > & {
    schedule: import('@kbn/config-schema').Type<
      | Readonly<
          {} & {
            interval: string;
          }
        >
      | Readonly<
          {} & {
            rrule:
              | Readonly<
                  {
                    byhour?: number[] | undefined;
                    byminute?: number[] | undefined;
                    byweekday?: string[] | undefined;
                    bymonthday?: number[] | undefined;
                  } & {
                    interval: number;
                    tzid: string;
                    freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                    freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                    freq: import('@kbn/rrule').Frequency.DAILY;
                    bymonthday: never;
                  }
                >;
          }
        >
      | undefined
    >;
  }
>;
export declare const taskSchemaV6: import('@kbn/config-schema').ObjectType<
  Omit<
    Omit<
      Omit<
        Omit<
          Omit<
            {
              taskType: import('@kbn/config-schema').Type<string>;
              scheduledAt: import('@kbn/config-schema').Type<string>;
              startedAt: import('@kbn/config-schema').Type<string | null>;
              retryAt: import('@kbn/config-schema').Type<string | null>;
              runAt: import('@kbn/config-schema').Type<string>;
              schedule: import('@kbn/config-schema').Type<
                | Readonly<
                    {} & {
                      interval: string;
                    }
                  >
                | undefined
              >;
              params: import('@kbn/config-schema').Type<string>;
              state: import('@kbn/config-schema').Type<string>;
              stateVersion: import('@kbn/config-schema').Type<number | undefined>;
              traceparent: import('@kbn/config-schema').Type<string>;
              user: import('@kbn/config-schema').Type<string | undefined>;
              scope: import('@kbn/config-schema').Type<string[] | undefined>;
              ownerId: import('@kbn/config-schema').Type<string | null>;
              enabled: import('@kbn/config-schema').Type<boolean | undefined>;
              timeoutOverride: import('@kbn/config-schema').Type<string | undefined>;
              attempts: import('@kbn/config-schema').Type<number>;
              status: import('@kbn/config-schema').Type<
                'claiming' | 'dead_letter' | 'failed' | 'idle' | 'running' | 'unrecognized'
              >;
              version: import('@kbn/config-schema').Type<string | undefined>;
            },
            'partition'
          > & {
            partition: import('@kbn/config-schema').Type<number | undefined>;
          },
          'priority'
        > & {
          priority: import('@kbn/config-schema').Type<number | undefined>;
        },
        'apiKey' | 'userScope'
      > & {
        apiKey: import('@kbn/config-schema').Type<string | undefined>;
        userScope: import('@kbn/config-schema').Type<
          | Readonly<
              {} & {
                apiKeyId: string;
                spaceId: string;
                apiKeyCreatedByUser: boolean;
              }
            >
          | undefined
        >;
      },
      'schedule'
    > & {
      schedule: import('@kbn/config-schema').Type<
        | Readonly<
            {} & {
              interval: string;
            }
          >
        | Readonly<
            {} & {
              rrule:
                | Readonly<
                    {
                      byhour?: number[] | undefined;
                      byminute?: number[] | undefined;
                      byweekday?: string[] | undefined;
                      bymonthday?: number[] | undefined;
                    } & {
                      interval: number;
                      tzid: string;
                      freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                      freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                      freq: import('@kbn/rrule').Frequency.DAILY;
                      bymonthday: never;
                    }
                  >;
            }
          >
        | undefined
      >;
    },
    'schedule'
  > & {
    schedule: import('@kbn/config-schema').Type<
      | Readonly<
          {} & {
            interval: string;
          }
        >
      | Readonly<
          {} & {
            rrule:
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
                    freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                    freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                    freq: import('@kbn/rrule').Frequency.DAILY;
                    bymonthday: never;
                  }
                >;
          }
        >
      | undefined
    >;
  }
>;
export declare const taskSchemaV7: import('@kbn/config-schema').ObjectType<
  Omit<
    Omit<
      Omit<
        Omit<
          Omit<
            Omit<
              {
                taskType: import('@kbn/config-schema').Type<string>;
                scheduledAt: import('@kbn/config-schema').Type<string>;
                startedAt: import('@kbn/config-schema').Type<string | null>;
                retryAt: import('@kbn/config-schema').Type<string | null>;
                runAt: import('@kbn/config-schema').Type<string>;
                schedule: import('@kbn/config-schema').Type<
                  | Readonly<
                      {} & {
                        interval: string;
                      }
                    >
                  | undefined
                >;
                params: import('@kbn/config-schema').Type<string>;
                state: import('@kbn/config-schema').Type<string>;
                stateVersion: import('@kbn/config-schema').Type<number | undefined>;
                traceparent: import('@kbn/config-schema').Type<string>;
                user: import('@kbn/config-schema').Type<string | undefined>;
                scope: import('@kbn/config-schema').Type<string[] | undefined>;
                ownerId: import('@kbn/config-schema').Type<string | null>;
                enabled: import('@kbn/config-schema').Type<boolean | undefined>;
                timeoutOverride: import('@kbn/config-schema').Type<string | undefined>;
                attempts: import('@kbn/config-schema').Type<number>;
                status: import('@kbn/config-schema').Type<
                  'claiming' | 'dead_letter' | 'failed' | 'idle' | 'running' | 'unrecognized'
                >;
                version: import('@kbn/config-schema').Type<string | undefined>;
              },
              'partition'
            > & {
              partition: import('@kbn/config-schema').Type<number | undefined>;
            },
            'priority'
          > & {
            priority: import('@kbn/config-schema').Type<number | undefined>;
          },
          'apiKey' | 'userScope'
        > & {
          apiKey: import('@kbn/config-schema').Type<string | undefined>;
          userScope: import('@kbn/config-schema').Type<
            | Readonly<
                {} & {
                  apiKeyId: string;
                  spaceId: string;
                  apiKeyCreatedByUser: boolean;
                }
              >
            | undefined
          >;
        },
        'schedule'
      > & {
        schedule: import('@kbn/config-schema').Type<
          | Readonly<
              {} & {
                interval: string;
              }
            >
          | Readonly<
              {} & {
                rrule:
                  | Readonly<
                      {
                        byhour?: number[] | undefined;
                        byminute?: number[] | undefined;
                        byweekday?: string[] | undefined;
                        bymonthday?: number[] | undefined;
                      } & {
                        interval: number;
                        tzid: string;
                        freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                        freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                        freq: import('@kbn/rrule').Frequency.DAILY;
                        bymonthday: never;
                      }
                    >;
              }
            >
          | undefined
        >;
      },
      'schedule'
    > & {
      schedule: import('@kbn/config-schema').Type<
        | Readonly<
            {} & {
              interval: string;
            }
          >
        | Readonly<
            {} & {
              rrule:
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
                      freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                      freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                      freq: import('@kbn/rrule').Frequency.DAILY;
                      bymonthday: never;
                    }
                  >;
            }
          >
        | undefined
      >;
    },
    'schedule'
  > & {
    schedule: import('@kbn/config-schema').Type<
      | Readonly<
          {} & {
            interval: string;
          }
        >
      | Readonly<
          {} & {
            rrule:
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
                    freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                    freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                    freq: import('@kbn/rrule').Frequency.DAILY;
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
                    freq: import('@kbn/rrule').Frequency.HOURLY;
                    byhour: never;
                    byweekday: never;
                    bymonthday: never;
                  }
                >;
          }
        >
      | undefined
    >;
  }
>;
export declare const taskSchemaV8: import('@kbn/config-schema').ObjectType<
  Omit<
    Omit<
      Omit<
        Omit<
          Omit<
            Omit<
              Omit<
                {
                  taskType: import('@kbn/config-schema').Type<string>;
                  scheduledAt: import('@kbn/config-schema').Type<string>;
                  startedAt: import('@kbn/config-schema').Type<string | null>;
                  retryAt: import('@kbn/config-schema').Type<string | null>;
                  runAt: import('@kbn/config-schema').Type<string>;
                  schedule: import('@kbn/config-schema').Type<
                    | Readonly<
                        {} & {
                          interval: string;
                        }
                      >
                    | undefined
                  >;
                  params: import('@kbn/config-schema').Type<string>;
                  state: import('@kbn/config-schema').Type<string>;
                  stateVersion: import('@kbn/config-schema').Type<number | undefined>;
                  traceparent: import('@kbn/config-schema').Type<string>;
                  user: import('@kbn/config-schema').Type<string | undefined>;
                  scope: import('@kbn/config-schema').Type<string[] | undefined>;
                  ownerId: import('@kbn/config-schema').Type<string | null>;
                  enabled: import('@kbn/config-schema').Type<boolean | undefined>;
                  timeoutOverride: import('@kbn/config-schema').Type<string | undefined>;
                  attempts: import('@kbn/config-schema').Type<number>;
                  status: import('@kbn/config-schema').Type<
                    'claiming' | 'dead_letter' | 'failed' | 'idle' | 'running' | 'unrecognized'
                  >;
                  version: import('@kbn/config-schema').Type<string | undefined>;
                },
                'partition'
              > & {
                partition: import('@kbn/config-schema').Type<number | undefined>;
              },
              'priority'
            > & {
              priority: import('@kbn/config-schema').Type<number | undefined>;
            },
            'apiKey' | 'userScope'
          > & {
            apiKey: import('@kbn/config-schema').Type<string | undefined>;
            userScope: import('@kbn/config-schema').Type<
              | Readonly<
                  {} & {
                    apiKeyId: string;
                    spaceId: string;
                    apiKeyCreatedByUser: boolean;
                  }
                >
              | undefined
            >;
          },
          'schedule'
        > & {
          schedule: import('@kbn/config-schema').Type<
            | Readonly<
                {} & {
                  interval: string;
                }
              >
            | Readonly<
                {} & {
                  rrule:
                    | Readonly<
                        {
                          byhour?: number[] | undefined;
                          byminute?: number[] | undefined;
                          byweekday?: string[] | undefined;
                          bymonthday?: number[] | undefined;
                        } & {
                          interval: number;
                          tzid: string;
                          freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                          freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                          freq: import('@kbn/rrule').Frequency.DAILY;
                          bymonthday: never;
                        }
                      >;
                }
              >
            | undefined
          >;
        },
        'schedule'
      > & {
        schedule: import('@kbn/config-schema').Type<
          | Readonly<
              {} & {
                interval: string;
              }
            >
          | Readonly<
              {} & {
                rrule:
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
                        freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                        freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                        freq: import('@kbn/rrule').Frequency.DAILY;
                        bymonthday: never;
                      }
                    >;
              }
            >
          | undefined
        >;
      },
      'schedule'
    > & {
      schedule: import('@kbn/config-schema').Type<
        | Readonly<
            {} & {
              interval: string;
            }
          >
        | Readonly<
            {} & {
              rrule:
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
                      freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                      freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                      freq: import('@kbn/rrule').Frequency.DAILY;
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
                      freq: import('@kbn/rrule').Frequency.HOURLY;
                      byhour: never;
                      byweekday: never;
                      bymonthday: never;
                    }
                  >;
            }
          >
        | undefined
      >;
    },
    'cost'
  > & {
    cost: import('@kbn/config-schema').Type<'extralarge' | 'normal' | 'tiny' | undefined>;
  }
>;
export declare const taskSchemaV9: import('@kbn/config-schema').ObjectType<
  Omit<
    Omit<
      Omit<
        Omit<
          Omit<
            Omit<
              Omit<
                Omit<
                  {
                    taskType: import('@kbn/config-schema').Type<string>;
                    scheduledAt: import('@kbn/config-schema').Type<string>;
                    startedAt: import('@kbn/config-schema').Type<string | null>;
                    retryAt: import('@kbn/config-schema').Type<string | null>;
                    runAt: import('@kbn/config-schema').Type<string>;
                    schedule: import('@kbn/config-schema').Type<
                      | Readonly<
                          {} & {
                            interval: string;
                          }
                        >
                      | undefined
                    >;
                    params: import('@kbn/config-schema').Type<string>;
                    state: import('@kbn/config-schema').Type<string>;
                    stateVersion: import('@kbn/config-schema').Type<number | undefined>;
                    traceparent: import('@kbn/config-schema').Type<string>;
                    user: import('@kbn/config-schema').Type<string | undefined>;
                    scope: import('@kbn/config-schema').Type<string[] | undefined>;
                    ownerId: import('@kbn/config-schema').Type<string | null>;
                    enabled: import('@kbn/config-schema').Type<boolean | undefined>;
                    timeoutOverride: import('@kbn/config-schema').Type<string | undefined>;
                    attempts: import('@kbn/config-schema').Type<number>;
                    status: import('@kbn/config-schema').Type<
                      'claiming' | 'dead_letter' | 'failed' | 'idle' | 'running' | 'unrecognized'
                    >;
                    version: import('@kbn/config-schema').Type<string | undefined>;
                  },
                  'partition'
                > & {
                  partition: import('@kbn/config-schema').Type<number | undefined>;
                },
                'priority'
              > & {
                priority: import('@kbn/config-schema').Type<number | undefined>;
              },
              'apiKey' | 'userScope'
            > & {
              apiKey: import('@kbn/config-schema').Type<string | undefined>;
              userScope: import('@kbn/config-schema').Type<
                | Readonly<
                    {} & {
                      apiKeyId: string;
                      spaceId: string;
                      apiKeyCreatedByUser: boolean;
                    }
                  >
                | undefined
              >;
            },
            'schedule'
          > & {
            schedule: import('@kbn/config-schema').Type<
              | Readonly<
                  {} & {
                    interval: string;
                  }
                >
              | Readonly<
                  {} & {
                    rrule:
                      | Readonly<
                          {
                            byhour?: number[] | undefined;
                            byminute?: number[] | undefined;
                            byweekday?: string[] | undefined;
                            bymonthday?: number[] | undefined;
                          } & {
                            interval: number;
                            tzid: string;
                            freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                            freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                            freq: import('@kbn/rrule').Frequency.DAILY;
                            bymonthday: never;
                          }
                        >;
                  }
                >
              | undefined
            >;
          },
          'schedule'
        > & {
          schedule: import('@kbn/config-schema').Type<
            | Readonly<
                {} & {
                  interval: string;
                }
              >
            | Readonly<
                {} & {
                  rrule:
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
                          freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                          freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                          freq: import('@kbn/rrule').Frequency.DAILY;
                          bymonthday: never;
                        }
                      >;
                }
              >
            | undefined
          >;
        },
        'schedule'
      > & {
        schedule: import('@kbn/config-schema').Type<
          | Readonly<
              {} & {
                interval: string;
              }
            >
          | Readonly<
              {} & {
                rrule:
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
                        freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                        freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                        freq: import('@kbn/rrule').Frequency.DAILY;
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
                        freq: import('@kbn/rrule').Frequency.HOURLY;
                        byhour: never;
                        byweekday: never;
                        bymonthday: never;
                      }
                    >;
              }
            >
          | undefined
        >;
      },
      'cost'
    > & {
      cost: import('@kbn/config-schema').Type<'extralarge' | 'normal' | 'tiny' | undefined>;
    },
    'uiamApiKey' | 'userScope'
  > & {
    uiamApiKey: import('@kbn/config-schema').Type<string | undefined>;
    userScope: import('@kbn/config-schema').Type<
      | Readonly<
          {
            uiamApiKeyId?: string | undefined;
          } & {
            apiKeyId: string;
            spaceId: string;
            apiKeyCreatedByUser: boolean;
          }
        >
      | undefined
    >;
  }
>;
export declare const taskSchemaV10: import('@kbn/config-schema').ObjectType<
  Omit<
    Omit<
      Omit<
        Omit<
          Omit<
            Omit<
              Omit<
                Omit<
                  Omit<
                    {
                      taskType: import('@kbn/config-schema').Type<string>;
                      scheduledAt: import('@kbn/config-schema').Type<string>;
                      startedAt: import('@kbn/config-schema').Type<string | null>;
                      retryAt: import('@kbn/config-schema').Type<string | null>;
                      runAt: import('@kbn/config-schema').Type<string>;
                      schedule: import('@kbn/config-schema').Type<
                        | Readonly<
                            {} & {
                              interval: string;
                            }
                          >
                        | undefined
                      >;
                      params: import('@kbn/config-schema').Type<string>;
                      state: import('@kbn/config-schema').Type<string>;
                      stateVersion: import('@kbn/config-schema').Type<number | undefined>;
                      traceparent: import('@kbn/config-schema').Type<string>;
                      user: import('@kbn/config-schema').Type<string | undefined>;
                      scope: import('@kbn/config-schema').Type<string[] | undefined>;
                      ownerId: import('@kbn/config-schema').Type<string | null>;
                      enabled: import('@kbn/config-schema').Type<boolean | undefined>;
                      timeoutOverride: import('@kbn/config-schema').Type<string | undefined>;
                      attempts: import('@kbn/config-schema').Type<number>;
                      status: import('@kbn/config-schema').Type<
                        'claiming' | 'dead_letter' | 'failed' | 'idle' | 'running' | 'unrecognized'
                      >;
                      version: import('@kbn/config-schema').Type<string | undefined>;
                    },
                    'partition'
                  > & {
                    partition: import('@kbn/config-schema').Type<number | undefined>;
                  },
                  'priority'
                > & {
                  priority: import('@kbn/config-schema').Type<number | undefined>;
                },
                'apiKey' | 'userScope'
              > & {
                apiKey: import('@kbn/config-schema').Type<string | undefined>;
                userScope: import('@kbn/config-schema').Type<
                  | Readonly<
                      {} & {
                        apiKeyId: string;
                        spaceId: string;
                        apiKeyCreatedByUser: boolean;
                      }
                    >
                  | undefined
                >;
              },
              'schedule'
            > & {
              schedule: import('@kbn/config-schema').Type<
                | Readonly<
                    {} & {
                      interval: string;
                    }
                  >
                | Readonly<
                    {} & {
                      rrule:
                        | Readonly<
                            {
                              byhour?: number[] | undefined;
                              byminute?: number[] | undefined;
                              byweekday?: string[] | undefined;
                              bymonthday?: number[] | undefined;
                            } & {
                              interval: number;
                              tzid: string;
                              freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                              freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                              freq: import('@kbn/rrule').Frequency.DAILY;
                              bymonthday: never;
                            }
                          >;
                    }
                  >
                | undefined
              >;
            },
            'schedule'
          > & {
            schedule: import('@kbn/config-schema').Type<
              | Readonly<
                  {} & {
                    interval: string;
                  }
                >
              | Readonly<
                  {} & {
                    rrule:
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
                            freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                            freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                            freq: import('@kbn/rrule').Frequency.DAILY;
                            bymonthday: never;
                          }
                        >;
                  }
                >
              | undefined
            >;
          },
          'schedule'
        > & {
          schedule: import('@kbn/config-schema').Type<
            | Readonly<
                {} & {
                  interval: string;
                }
              >
            | Readonly<
                {} & {
                  rrule:
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
                          freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                          freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                          freq: import('@kbn/rrule').Frequency.DAILY;
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
                          freq: import('@kbn/rrule').Frequency.HOURLY;
                          byhour: never;
                          byweekday: never;
                          bymonthday: never;
                        }
                      >;
                }
              >
            | undefined
          >;
        },
        'cost'
      > & {
        cost: import('@kbn/config-schema').Type<'extralarge' | 'normal' | 'tiny' | undefined>;
      },
      'uiamApiKey' | 'userScope'
    > & {
      uiamApiKey: import('@kbn/config-schema').Type<string | undefined>;
      userScope: import('@kbn/config-schema').Type<
        | Readonly<
            {
              uiamApiKeyId?: string | undefined;
            } & {
              apiKeyId: string;
              spaceId: string;
              apiKeyCreatedByUser: boolean;
            }
          >
        | undefined
      >;
    },
    'cost'
  > & {
    cost: import('@kbn/config-schema').Type<string | undefined>;
  }
>;
export declare const taskSchemaV11: import('@kbn/config-schema').ObjectType<
  Omit<
    Omit<
      Omit<
        Omit<
          Omit<
            Omit<
              Omit<
                Omit<
                  Omit<
                    Omit<
                      {
                        taskType: import('@kbn/config-schema').Type<string>;
                        scheduledAt: import('@kbn/config-schema').Type<string>;
                        startedAt: import('@kbn/config-schema').Type<string | null>;
                        retryAt: import('@kbn/config-schema').Type<string | null>;
                        runAt: import('@kbn/config-schema').Type<string>;
                        schedule: import('@kbn/config-schema').Type<
                          | Readonly<
                              {} & {
                                interval: string;
                              }
                            >
                          | undefined
                        >;
                        params: import('@kbn/config-schema').Type<string>;
                        state: import('@kbn/config-schema').Type<string>;
                        stateVersion: import('@kbn/config-schema').Type<number | undefined>;
                        traceparent: import('@kbn/config-schema').Type<string>;
                        user: import('@kbn/config-schema').Type<string | undefined>;
                        scope: import('@kbn/config-schema').Type<string[] | undefined>;
                        ownerId: import('@kbn/config-schema').Type<string | null>;
                        enabled: import('@kbn/config-schema').Type<boolean | undefined>;
                        timeoutOverride: import('@kbn/config-schema').Type<string | undefined>;
                        attempts: import('@kbn/config-schema').Type<number>;
                        status: import('@kbn/config-schema').Type<
                          | 'claiming'
                          | 'dead_letter'
                          | 'failed'
                          | 'idle'
                          | 'running'
                          | 'unrecognized'
                        >;
                        version: import('@kbn/config-schema').Type<string | undefined>;
                      },
                      'partition'
                    > & {
                      partition: import('@kbn/config-schema').Type<number | undefined>;
                    },
                    'priority'
                  > & {
                    priority: import('@kbn/config-schema').Type<number | undefined>;
                  },
                  'apiKey' | 'userScope'
                > & {
                  apiKey: import('@kbn/config-schema').Type<string | undefined>;
                  userScope: import('@kbn/config-schema').Type<
                    | Readonly<
                        {} & {
                          apiKeyId: string;
                          spaceId: string;
                          apiKeyCreatedByUser: boolean;
                        }
                      >
                    | undefined
                  >;
                },
                'schedule'
              > & {
                schedule: import('@kbn/config-schema').Type<
                  | Readonly<
                      {} & {
                        interval: string;
                      }
                    >
                  | Readonly<
                      {} & {
                        rrule:
                          | Readonly<
                              {
                                byhour?: number[] | undefined;
                                byminute?: number[] | undefined;
                                byweekday?: string[] | undefined;
                                bymonthday?: number[] | undefined;
                              } & {
                                interval: number;
                                tzid: string;
                                freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                                freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                                freq: import('@kbn/rrule').Frequency.DAILY;
                                bymonthday: never;
                              }
                            >;
                      }
                    >
                  | undefined
                >;
              },
              'schedule'
            > & {
              schedule: import('@kbn/config-schema').Type<
                | Readonly<
                    {} & {
                      interval: string;
                    }
                  >
                | Readonly<
                    {} & {
                      rrule:
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
                              freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                              freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                              freq: import('@kbn/rrule').Frequency.DAILY;
                              bymonthday: never;
                            }
                          >;
                    }
                  >
                | undefined
              >;
            },
            'schedule'
          > & {
            schedule: import('@kbn/config-schema').Type<
              | Readonly<
                  {} & {
                    interval: string;
                  }
                >
              | Readonly<
                  {} & {
                    rrule:
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
                            freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                            freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                            freq: import('@kbn/rrule').Frequency.DAILY;
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
                            freq: import('@kbn/rrule').Frequency.HOURLY;
                            byhour: never;
                            byweekday: never;
                            bymonthday: never;
                          }
                        >;
                  }
                >
              | undefined
            >;
          },
          'cost'
        > & {
          cost: import('@kbn/config-schema').Type<'extralarge' | 'normal' | 'tiny' | undefined>;
        },
        'uiamApiKey' | 'userScope'
      > & {
        uiamApiKey: import('@kbn/config-schema').Type<string | undefined>;
        userScope: import('@kbn/config-schema').Type<
          | Readonly<
              {
                uiamApiKeyId?: string | undefined;
              } & {
                apiKeyId: string;
                spaceId: string;
                apiKeyCreatedByUser: boolean;
              }
            >
          | undefined
        >;
      },
      'cost'
    > & {
      cost: import('@kbn/config-schema').Type<string | undefined>;
    },
    'userScope'
  > & {
    userScope: import('@kbn/config-schema').Type<
      | Readonly<
          {
            uiamApiKeyId?: string | undefined;
            userProfileId?: string | undefined;
          } & {
            apiKeyId: string;
            spaceId: string;
            apiKeyCreatedByUser: boolean;
          }
        >
      | undefined
    >;
  }
>;
export declare const taskSchemaV12: import('@kbn/config-schema').ObjectType<
  Omit<
    Omit<
      Omit<
        Omit<
          Omit<
            Omit<
              Omit<
                Omit<
                  Omit<
                    Omit<
                      Omit<
                        {
                          taskType: import('@kbn/config-schema').Type<string>;
                          scheduledAt: import('@kbn/config-schema').Type<string>;
                          startedAt: import('@kbn/config-schema').Type<string | null>;
                          retryAt: import('@kbn/config-schema').Type<string | null>;
                          runAt: import('@kbn/config-schema').Type<string>;
                          schedule: import('@kbn/config-schema').Type<
                            | Readonly<
                                {} & {
                                  interval: string;
                                }
                              >
                            | undefined
                          >;
                          params: import('@kbn/config-schema').Type<string>;
                          state: import('@kbn/config-schema').Type<string>;
                          stateVersion: import('@kbn/config-schema').Type<number | undefined>;
                          traceparent: import('@kbn/config-schema').Type<string>;
                          user: import('@kbn/config-schema').Type<string | undefined>;
                          scope: import('@kbn/config-schema').Type<string[] | undefined>;
                          ownerId: import('@kbn/config-schema').Type<string | null>;
                          enabled: import('@kbn/config-schema').Type<boolean | undefined>;
                          timeoutOverride: import('@kbn/config-schema').Type<string | undefined>;
                          attempts: import('@kbn/config-schema').Type<number>;
                          status: import('@kbn/config-schema').Type<
                            | 'claiming'
                            | 'dead_letter'
                            | 'failed'
                            | 'idle'
                            | 'running'
                            | 'unrecognized'
                          >;
                          version: import('@kbn/config-schema').Type<string | undefined>;
                        },
                        'partition'
                      > & {
                        partition: import('@kbn/config-schema').Type<number | undefined>;
                      },
                      'priority'
                    > & {
                      priority: import('@kbn/config-schema').Type<number | undefined>;
                    },
                    'apiKey' | 'userScope'
                  > & {
                    apiKey: import('@kbn/config-schema').Type<string | undefined>;
                    userScope: import('@kbn/config-schema').Type<
                      | Readonly<
                          {} & {
                            apiKeyId: string;
                            spaceId: string;
                            apiKeyCreatedByUser: boolean;
                          }
                        >
                      | undefined
                    >;
                  },
                  'schedule'
                > & {
                  schedule: import('@kbn/config-schema').Type<
                    | Readonly<
                        {} & {
                          interval: string;
                        }
                      >
                    | Readonly<
                        {} & {
                          rrule:
                            | Readonly<
                                {
                                  byhour?: number[] | undefined;
                                  byminute?: number[] | undefined;
                                  byweekday?: string[] | undefined;
                                  bymonthday?: number[] | undefined;
                                } & {
                                  interval: number;
                                  tzid: string;
                                  freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                                  freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                                  freq: import('@kbn/rrule').Frequency.DAILY;
                                  bymonthday: never;
                                }
                              >;
                        }
                      >
                    | undefined
                  >;
                },
                'schedule'
              > & {
                schedule: import('@kbn/config-schema').Type<
                  | Readonly<
                      {} & {
                        interval: string;
                      }
                    >
                  | Readonly<
                      {} & {
                        rrule:
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
                                freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                                freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                                freq: import('@kbn/rrule').Frequency.DAILY;
                                bymonthday: never;
                              }
                            >;
                      }
                    >
                  | undefined
                >;
              },
              'schedule'
            > & {
              schedule: import('@kbn/config-schema').Type<
                | Readonly<
                    {} & {
                      interval: string;
                    }
                  >
                | Readonly<
                    {} & {
                      rrule:
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
                              freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                              freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                              freq: import('@kbn/rrule').Frequency.DAILY;
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
                              freq: import('@kbn/rrule').Frequency.HOURLY;
                              byhour: never;
                              byweekday: never;
                              bymonthday: never;
                            }
                          >;
                    }
                  >
                | undefined
              >;
            },
            'cost'
          > & {
            cost: import('@kbn/config-schema').Type<'extralarge' | 'normal' | 'tiny' | undefined>;
          },
          'uiamApiKey' | 'userScope'
        > & {
          uiamApiKey: import('@kbn/config-schema').Type<string | undefined>;
          userScope: import('@kbn/config-schema').Type<
            | Readonly<
                {
                  uiamApiKeyId?: string | undefined;
                } & {
                  apiKeyId: string;
                  spaceId: string;
                  apiKeyCreatedByUser: boolean;
                }
              >
            | undefined
          >;
        },
        'cost'
      > & {
        cost: import('@kbn/config-schema').Type<string | undefined>;
      },
      'userScope'
    > & {
      userScope: import('@kbn/config-schema').Type<
        | Readonly<
            {
              uiamApiKeyId?: string | undefined;
              userProfileId?: string | undefined;
            } & {
              apiKeyId: string;
              spaceId: string;
              apiKeyCreatedByUser: boolean;
            }
          >
        | undefined
      >;
    },
    'userScope'
  > & {
    userScope: import('@kbn/config-schema').Type<
      | Readonly<
          {
            uiamApiKeyId?: string | undefined;
            userProfileId?: string | undefined;
            userName?: string | undefined;
          } & {
            apiKeyId: string;
            spaceId: string;
            apiKeyCreatedByUser: boolean;
          }
        >
      | undefined
    >;
  }
>;
export declare const taskSchemaV13: import('@kbn/config-schema').ObjectType<
  Omit<
    Omit<
      Omit<
        Omit<
          Omit<
            Omit<
              Omit<
                Omit<
                  Omit<
                    Omit<
                      Omit<
                        Omit<
                          {
                            taskType: import('@kbn/config-schema').Type<string>;
                            scheduledAt: import('@kbn/config-schema').Type<string>;
                            startedAt: import('@kbn/config-schema').Type<string | null>;
                            retryAt: import('@kbn/config-schema').Type<string | null>;
                            runAt: import('@kbn/config-schema').Type<string>;
                            schedule: import('@kbn/config-schema').Type<
                              | Readonly<
                                  {} & {
                                    interval: string;
                                  }
                                >
                              | undefined
                            >;
                            params: import('@kbn/config-schema').Type<string>;
                            state: import('@kbn/config-schema').Type<string>;
                            stateVersion: import('@kbn/config-schema').Type<number | undefined>;
                            traceparent: import('@kbn/config-schema').Type<string>;
                            user: import('@kbn/config-schema').Type<string | undefined>;
                            scope: import('@kbn/config-schema').Type<string[] | undefined>;
                            ownerId: import('@kbn/config-schema').Type<string | null>;
                            enabled: import('@kbn/config-schema').Type<boolean | undefined>;
                            timeoutOverride: import('@kbn/config-schema').Type<string | undefined>;
                            attempts: import('@kbn/config-schema').Type<number>;
                            status: import('@kbn/config-schema').Type<
                              | 'claiming'
                              | 'dead_letter'
                              | 'failed'
                              | 'idle'
                              | 'running'
                              | 'unrecognized'
                            >;
                            version: import('@kbn/config-schema').Type<string | undefined>;
                          },
                          'partition'
                        > & {
                          partition: import('@kbn/config-schema').Type<number | undefined>;
                        },
                        'priority'
                      > & {
                        priority: import('@kbn/config-schema').Type<number | undefined>;
                      },
                      'apiKey' | 'userScope'
                    > & {
                      apiKey: import('@kbn/config-schema').Type<string | undefined>;
                      userScope: import('@kbn/config-schema').Type<
                        | Readonly<
                            {} & {
                              apiKeyId: string;
                              spaceId: string;
                              apiKeyCreatedByUser: boolean;
                            }
                          >
                        | undefined
                      >;
                    },
                    'schedule'
                  > & {
                    schedule: import('@kbn/config-schema').Type<
                      | Readonly<
                          {} & {
                            interval: string;
                          }
                        >
                      | Readonly<
                          {} & {
                            rrule:
                              | Readonly<
                                  {
                                    byhour?: number[] | undefined;
                                    byminute?: number[] | undefined;
                                    byweekday?: string[] | undefined;
                                    bymonthday?: number[] | undefined;
                                  } & {
                                    interval: number;
                                    tzid: string;
                                    freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                                    freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                                    freq: import('@kbn/rrule').Frequency.DAILY;
                                    bymonthday: never;
                                  }
                                >;
                          }
                        >
                      | undefined
                    >;
                  },
                  'schedule'
                > & {
                  schedule: import('@kbn/config-schema').Type<
                    | Readonly<
                        {} & {
                          interval: string;
                        }
                      >
                    | Readonly<
                        {} & {
                          rrule:
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
                                  freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                                  freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                                  freq: import('@kbn/rrule').Frequency.DAILY;
                                  bymonthday: never;
                                }
                              >;
                        }
                      >
                    | undefined
                  >;
                },
                'schedule'
              > & {
                schedule: import('@kbn/config-schema').Type<
                  | Readonly<
                      {} & {
                        interval: string;
                      }
                    >
                  | Readonly<
                      {} & {
                        rrule:
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
                                freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                                freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                                freq: import('@kbn/rrule').Frequency.DAILY;
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
                                freq: import('@kbn/rrule').Frequency.HOURLY;
                                byhour: never;
                                byweekday: never;
                                bymonthday: never;
                              }
                            >;
                      }
                    >
                  | undefined
                >;
              },
              'cost'
            > & {
              cost: import('@kbn/config-schema').Type<'extralarge' | 'normal' | 'tiny' | undefined>;
            },
            'uiamApiKey' | 'userScope'
          > & {
            uiamApiKey: import('@kbn/config-schema').Type<string | undefined>;
            userScope: import('@kbn/config-schema').Type<
              | Readonly<
                  {
                    uiamApiKeyId?: string | undefined;
                  } & {
                    apiKeyId: string;
                    spaceId: string;
                    apiKeyCreatedByUser: boolean;
                  }
                >
              | undefined
            >;
          },
          'cost'
        > & {
          cost: import('@kbn/config-schema').Type<string | undefined>;
        },
        'userScope'
      > & {
        userScope: import('@kbn/config-schema').Type<
          | Readonly<
              {
                uiamApiKeyId?: string | undefined;
                userProfileId?: string | undefined;
              } & {
                apiKeyId: string;
                spaceId: string;
                apiKeyCreatedByUser: boolean;
              }
            >
          | undefined
        >;
      },
      'userScope'
    > & {
      userScope: import('@kbn/config-schema').Type<
        | Readonly<
            {
              uiamApiKeyId?: string | undefined;
              userProfileId?: string | undefined;
              userName?: string | undefined;
            } & {
              apiKeyId: string;
              spaceId: string;
              apiKeyCreatedByUser: boolean;
            }
          >
        | undefined
      >;
    },
    'userScope'
  > & {
    userScope: import('@kbn/config-schema').Type<
      | Readonly<
          {
            uiamApiKeyId?: string | undefined;
            uiamApiKeyExternal?: boolean | undefined;
            userProfileId?: string | undefined;
            userName?: string | undefined;
          } & {
            apiKeyId: string;
            spaceId: string;
            apiKeyCreatedByUser: boolean;
          }
        >
      | undefined
    >;
  }
>;
export declare const taskSchemaV14: import('@kbn/config-schema').ObjectType<
  Omit<
    Omit<
      Omit<
        Omit<
          Omit<
            Omit<
              Omit<
                Omit<
                  Omit<
                    Omit<
                      Omit<
                        Omit<
                          Omit<
                            {
                              taskType: import('@kbn/config-schema').Type<string>;
                              scheduledAt: import('@kbn/config-schema').Type<string>;
                              startedAt: import('@kbn/config-schema').Type<string | null>;
                              retryAt: import('@kbn/config-schema').Type<string | null>;
                              runAt: import('@kbn/config-schema').Type<string>;
                              schedule: import('@kbn/config-schema').Type<
                                | Readonly<
                                    {} & {
                                      interval: string;
                                    }
                                  >
                                | undefined
                              >;
                              params: import('@kbn/config-schema').Type<string>;
                              state: import('@kbn/config-schema').Type<string>;
                              stateVersion: import('@kbn/config-schema').Type<number | undefined>;
                              traceparent: import('@kbn/config-schema').Type<string>;
                              user: import('@kbn/config-schema').Type<string | undefined>;
                              scope: import('@kbn/config-schema').Type<string[] | undefined>;
                              ownerId: import('@kbn/config-schema').Type<string | null>;
                              enabled: import('@kbn/config-schema').Type<boolean | undefined>;
                              timeoutOverride: import('@kbn/config-schema').Type<
                                string | undefined
                              >;
                              attempts: import('@kbn/config-schema').Type<number>;
                              status: import('@kbn/config-schema').Type<
                                | 'claiming'
                                | 'dead_letter'
                                | 'failed'
                                | 'idle'
                                | 'running'
                                | 'unrecognized'
                              >;
                              version: import('@kbn/config-schema').Type<string | undefined>;
                            },
                            'partition'
                          > & {
                            partition: import('@kbn/config-schema').Type<number | undefined>;
                          },
                          'priority'
                        > & {
                          priority: import('@kbn/config-schema').Type<number | undefined>;
                        },
                        'apiKey' | 'userScope'
                      > & {
                        apiKey: import('@kbn/config-schema').Type<string | undefined>;
                        userScope: import('@kbn/config-schema').Type<
                          | Readonly<
                              {} & {
                                apiKeyId: string;
                                spaceId: string;
                                apiKeyCreatedByUser: boolean;
                              }
                            >
                          | undefined
                        >;
                      },
                      'schedule'
                    > & {
                      schedule: import('@kbn/config-schema').Type<
                        | Readonly<
                            {} & {
                              interval: string;
                            }
                          >
                        | Readonly<
                            {} & {
                              rrule:
                                | Readonly<
                                    {
                                      byhour?: number[] | undefined;
                                      byminute?: number[] | undefined;
                                      byweekday?: string[] | undefined;
                                      bymonthday?: number[] | undefined;
                                    } & {
                                      interval: number;
                                      tzid: string;
                                      freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                                      freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                                      freq: import('@kbn/rrule').Frequency.DAILY;
                                      bymonthday: never;
                                    }
                                  >;
                            }
                          >
                        | undefined
                      >;
                    },
                    'schedule'
                  > & {
                    schedule: import('@kbn/config-schema').Type<
                      | Readonly<
                          {} & {
                            interval: string;
                          }
                        >
                      | Readonly<
                          {} & {
                            rrule:
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
                                    freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                                    freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                                    freq: import('@kbn/rrule').Frequency.DAILY;
                                    bymonthday: never;
                                  }
                                >;
                          }
                        >
                      | undefined
                    >;
                  },
                  'schedule'
                > & {
                  schedule: import('@kbn/config-schema').Type<
                    | Readonly<
                        {} & {
                          interval: string;
                        }
                      >
                    | Readonly<
                        {} & {
                          rrule:
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
                                  freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                                  freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                                  freq: import('@kbn/rrule').Frequency.DAILY;
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
                                  freq: import('@kbn/rrule').Frequency.HOURLY;
                                  byhour: never;
                                  byweekday: never;
                                  bymonthday: never;
                                }
                              >;
                        }
                      >
                    | undefined
                  >;
                },
                'cost'
              > & {
                cost: import('@kbn/config-schema').Type<
                  'extralarge' | 'normal' | 'tiny' | undefined
                >;
              },
              'uiamApiKey' | 'userScope'
            > & {
              uiamApiKey: import('@kbn/config-schema').Type<string | undefined>;
              userScope: import('@kbn/config-schema').Type<
                | Readonly<
                    {
                      uiamApiKeyId?: string | undefined;
                    } & {
                      apiKeyId: string;
                      spaceId: string;
                      apiKeyCreatedByUser: boolean;
                    }
                  >
                | undefined
              >;
            },
            'cost'
          > & {
            cost: import('@kbn/config-schema').Type<string | undefined>;
          },
          'userScope'
        > & {
          userScope: import('@kbn/config-schema').Type<
            | Readonly<
                {
                  uiamApiKeyId?: string | undefined;
                  userProfileId?: string | undefined;
                } & {
                  apiKeyId: string;
                  spaceId: string;
                  apiKeyCreatedByUser: boolean;
                }
              >
            | undefined
          >;
        },
        'userScope'
      > & {
        userScope: import('@kbn/config-schema').Type<
          | Readonly<
              {
                uiamApiKeyId?: string | undefined;
                userProfileId?: string | undefined;
                userName?: string | undefined;
              } & {
                apiKeyId: string;
                spaceId: string;
                apiKeyCreatedByUser: boolean;
              }
            >
          | undefined
        >;
      },
      'userScope'
    > & {
      userScope: import('@kbn/config-schema').Type<
        | Readonly<
            {
              uiamApiKeyId?: string | undefined;
              uiamApiKeyExternal?: boolean | undefined;
              userProfileId?: string | undefined;
              userName?: string | undefined;
            } & {
              apiKeyId: string;
              spaceId: string;
              apiKeyCreatedByUser: boolean;
            }
          >
        | undefined
      >;
    },
    'credential' | 'encryptedCredential'
  > & {
    credential: import('@kbn/config-schema').Type<
      | Readonly<
          {
            workloadType?: string | undefined;
            workloadId?: string | undefined;
            spaceId?: string | undefined;
            expectedServiceAccountId?: string | null | undefined;
          } & {
            type: string;
          }
        >
      | undefined
    >;
    encryptedCredential: import('@kbn/config-schema').Type<string | undefined>;
  }
>;
