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
    'failed' | 'claiming' | 'idle' | 'running' | 'unrecognized' | 'dead_letter'
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
        'failed' | 'claiming' | 'idle' | 'running' | 'unrecognized' | 'dead_letter'
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
          'failed' | 'claiming' | 'idle' | 'running' | 'unrecognized' | 'dead_letter'
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
            'failed' | 'claiming' | 'idle' | 'running' | 'unrecognized' | 'dead_letter'
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
    'userScope' | 'apiKey'
  > & {
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
    apiKey: import('@kbn/config-schema').Type<string | undefined>;
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
              'failed' | 'claiming' | 'idle' | 'running' | 'unrecognized' | 'dead_letter'
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
      'userScope' | 'apiKey'
    > & {
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
      apiKey: import('@kbn/config-schema').Type<string | undefined>;
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
                    bymonthday?: number[] | undefined;
                    byweekday?: string[] | undefined;
                    byhour?: number[] | undefined;
                    byminute?: number[] | undefined;
                  } & {
                    interval: number;
                    freq: import('@kbn/rrule').Frequency.MONTHLY;
                    tzid: string;
                  }
                >
              | Readonly<
                  {
                    byweekday?: string[] | undefined;
                    byhour?: number[] | undefined;
                    byminute?: number[] | undefined;
                  } & {
                    interval: number;
                    bymonthday: never;
                    freq: import('@kbn/rrule').Frequency.WEEKLY;
                    tzid: string;
                  }
                >
              | Readonly<
                  {
                    byweekday?: string[] | undefined;
                    byhour?: number[] | undefined;
                    byminute?: number[] | undefined;
                  } & {
                    interval: number;
                    bymonthday: never;
                    freq: import('@kbn/rrule').Frequency.DAILY;
                    tzid: string;
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
                'failed' | 'claiming' | 'idle' | 'running' | 'unrecognized' | 'dead_letter'
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
        'userScope' | 'apiKey'
      > & {
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
        apiKey: import('@kbn/config-schema').Type<string | undefined>;
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
                      bymonthday?: number[] | undefined;
                      byweekday?: string[] | undefined;
                      byhour?: number[] | undefined;
                      byminute?: number[] | undefined;
                    } & {
                      interval: number;
                      freq: import('@kbn/rrule').Frequency.MONTHLY;
                      tzid: string;
                    }
                  >
                | Readonly<
                    {
                      byweekday?: string[] | undefined;
                      byhour?: number[] | undefined;
                      byminute?: number[] | undefined;
                    } & {
                      interval: number;
                      bymonthday: never;
                      freq: import('@kbn/rrule').Frequency.WEEKLY;
                      tzid: string;
                    }
                  >
                | Readonly<
                    {
                      byweekday?: string[] | undefined;
                      byhour?: number[] | undefined;
                      byminute?: number[] | undefined;
                    } & {
                      interval: number;
                      bymonthday: never;
                      freq: import('@kbn/rrule').Frequency.DAILY;
                      tzid: string;
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
                    bymonthday?: number[] | undefined;
                    byweekday?: string[] | undefined;
                    byhour?: number[] | undefined;
                    byminute?: number[] | undefined;
                    dtstart?: string | undefined;
                  } & {
                    interval: number;
                    freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                    freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                    freq: import('@kbn/rrule').Frequency.DAILY;
                    tzid: string;
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
                  'failed' | 'claiming' | 'idle' | 'running' | 'unrecognized' | 'dead_letter'
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
          'userScope' | 'apiKey'
        > & {
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
          apiKey: import('@kbn/config-schema').Type<string | undefined>;
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
                        bymonthday?: number[] | undefined;
                        byweekday?: string[] | undefined;
                        byhour?: number[] | undefined;
                        byminute?: number[] | undefined;
                      } & {
                        interval: number;
                        freq: import('@kbn/rrule').Frequency.MONTHLY;
                        tzid: string;
                      }
                    >
                  | Readonly<
                      {
                        byweekday?: string[] | undefined;
                        byhour?: number[] | undefined;
                        byminute?: number[] | undefined;
                      } & {
                        interval: number;
                        bymonthday: never;
                        freq: import('@kbn/rrule').Frequency.WEEKLY;
                        tzid: string;
                      }
                    >
                  | Readonly<
                      {
                        byweekday?: string[] | undefined;
                        byhour?: number[] | undefined;
                        byminute?: number[] | undefined;
                      } & {
                        interval: number;
                        bymonthday: never;
                        freq: import('@kbn/rrule').Frequency.DAILY;
                        tzid: string;
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
                      bymonthday?: number[] | undefined;
                      byweekday?: string[] | undefined;
                      byhour?: number[] | undefined;
                      byminute?: number[] | undefined;
                      dtstart?: string | undefined;
                    } & {
                      interval: number;
                      freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                      freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                      freq: import('@kbn/rrule').Frequency.DAILY;
                      tzid: string;
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
                    bymonthday?: number[] | undefined;
                    byweekday?: string[] | undefined;
                    byhour?: number[] | undefined;
                    byminute?: number[] | undefined;
                    dtstart?: string | undefined;
                  } & {
                    interval: number;
                    freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                    freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                    freq: import('@kbn/rrule').Frequency.DAILY;
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
                    freq: import('@kbn/rrule').Frequency.HOURLY;
                    tzid: string;
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
                    'failed' | 'claiming' | 'idle' | 'running' | 'unrecognized' | 'dead_letter'
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
            'userScope' | 'apiKey'
          > & {
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
            apiKey: import('@kbn/config-schema').Type<string | undefined>;
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
                          bymonthday?: number[] | undefined;
                          byweekday?: string[] | undefined;
                          byhour?: number[] | undefined;
                          byminute?: number[] | undefined;
                        } & {
                          interval: number;
                          freq: import('@kbn/rrule').Frequency.MONTHLY;
                          tzid: string;
                        }
                      >
                    | Readonly<
                        {
                          byweekday?: string[] | undefined;
                          byhour?: number[] | undefined;
                          byminute?: number[] | undefined;
                        } & {
                          interval: number;
                          bymonthday: never;
                          freq: import('@kbn/rrule').Frequency.WEEKLY;
                          tzid: string;
                        }
                      >
                    | Readonly<
                        {
                          byweekday?: string[] | undefined;
                          byhour?: number[] | undefined;
                          byminute?: number[] | undefined;
                        } & {
                          interval: number;
                          bymonthday: never;
                          freq: import('@kbn/rrule').Frequency.DAILY;
                          tzid: string;
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
                        bymonthday?: number[] | undefined;
                        byweekday?: string[] | undefined;
                        byhour?: number[] | undefined;
                        byminute?: number[] | undefined;
                        dtstart?: string | undefined;
                      } & {
                        interval: number;
                        freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                        freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                        freq: import('@kbn/rrule').Frequency.DAILY;
                        tzid: string;
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
                      bymonthday?: number[] | undefined;
                      byweekday?: string[] | undefined;
                      byhour?: number[] | undefined;
                      byminute?: number[] | undefined;
                      dtstart?: string | undefined;
                    } & {
                      interval: number;
                      freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                      freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                      freq: import('@kbn/rrule').Frequency.DAILY;
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
                      freq: import('@kbn/rrule').Frequency.HOURLY;
                      tzid: string;
                    }
                  >;
            }
          >
        | undefined
      >;
    },
    'cost'
  > & {
    cost: import('@kbn/config-schema').Type<'tiny' | 'normal' | 'extralarge' | undefined>;
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
                      'failed' | 'claiming' | 'idle' | 'running' | 'unrecognized' | 'dead_letter'
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
              'userScope' | 'apiKey'
            > & {
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
              apiKey: import('@kbn/config-schema').Type<string | undefined>;
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
                            bymonthday?: number[] | undefined;
                            byweekday?: string[] | undefined;
                            byhour?: number[] | undefined;
                            byminute?: number[] | undefined;
                          } & {
                            interval: number;
                            freq: import('@kbn/rrule').Frequency.MONTHLY;
                            tzid: string;
                          }
                        >
                      | Readonly<
                          {
                            byweekday?: string[] | undefined;
                            byhour?: number[] | undefined;
                            byminute?: number[] | undefined;
                          } & {
                            interval: number;
                            bymonthday: never;
                            freq: import('@kbn/rrule').Frequency.WEEKLY;
                            tzid: string;
                          }
                        >
                      | Readonly<
                          {
                            byweekday?: string[] | undefined;
                            byhour?: number[] | undefined;
                            byminute?: number[] | undefined;
                          } & {
                            interval: number;
                            bymonthday: never;
                            freq: import('@kbn/rrule').Frequency.DAILY;
                            tzid: string;
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
                          bymonthday?: number[] | undefined;
                          byweekday?: string[] | undefined;
                          byhour?: number[] | undefined;
                          byminute?: number[] | undefined;
                          dtstart?: string | undefined;
                        } & {
                          interval: number;
                          freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                          freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                          freq: import('@kbn/rrule').Frequency.DAILY;
                          tzid: string;
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
                        bymonthday?: number[] | undefined;
                        byweekday?: string[] | undefined;
                        byhour?: number[] | undefined;
                        byminute?: number[] | undefined;
                        dtstart?: string | undefined;
                      } & {
                        interval: number;
                        freq: import('@kbn/rrule').Frequency.MONTHLY;
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
                        freq: import('@kbn/rrule').Frequency.WEEKLY;
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
                        freq: import('@kbn/rrule').Frequency.DAILY;
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
                        freq: import('@kbn/rrule').Frequency.HOURLY;
                        tzid: string;
                      }
                    >;
              }
            >
          | undefined
        >;
      },
      'cost'
    > & {
      cost: import('@kbn/config-schema').Type<'tiny' | 'normal' | 'extralarge' | undefined>;
    },
    'userScope' | 'uiamApiKey'
  > & {
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
    uiamApiKey: import('@kbn/config-schema').Type<string | undefined>;
  }
>;
