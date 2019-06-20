/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventEmitter } from 'events';

import { events } from './constants/events';
import { Status } from './constants/statuses';
import { Esqueue } from './esqueue';
import { CancellationToken } from './helpers/cancellation_token';
import { AnyObject, EsClient, LogFn } from './misc';

export interface JobOptions {
  client?: EsClient;
  indexSettings?: string;
  created_by?: string;
  timeout?: number;
  max_attempts?: number;
  priority?: number;
  headers?: {
    [key: string]: string;
  };
  logger?: LogFn;
}

type OptionalPropType<T, P> = P extends keyof T ? T[P] : void;

export class Job<P> extends EventEmitter {
  public queue: Esqueue;
  public client: EsClient;
  public id: string;
  public index: string;
  public jobtype: string;
  public payload: P;
  public created_by: string | false; // tslint:disable-line variable-name
  public timeout: number;
  public maxAttempts: number;
  public priority: number;
  public indexSettings: AnyObject;
  public ready: Promise<void>;

  constructor(queue: Esqueue, index: string, type: string, payload: P, options?: JobOptions);

  /**
   * Read the job document out of elasticsearch, includes its current
   * status and posisble result.
   */
  public get(): Promise<{
    // merged in get() method
    index: string;
    id: string;
    type: string;
    version: number;

    // from doc._source
    jobtype: string;
    meta: {
      objectType: OptionalPropType<P, 'type'>;
      layout: OptionalPropType<P, 'layout'>;
    };
    payload: P;
    priority: number;
    created_by: string | false;
    timeout: number;
    process_expiration: string; // use epoch so the job query works
    created_at: string;
    attempts: number;
    max_attempts: number;
    status: Status;
  }>;

  /**
   * Get a plain JavaScript representation of the Job object
   */
  public toJSON(): {
    id: string;
    index: string;
    type: string;
    jobtype: string;
    created_by: string | false;
    payload: P;
    timeout: number;
    max_attempts: number;
    priority: number;
  };

  public on(
    name: typeof events['EVENT_JOB_CREATED'],
    handler: (
      info: {
        id: string;
        type: string;
        index: string;
        version: number;
      }
    ) => void
  ): this;
  public on(name: typeof events['EVENT_JOB_CREATE_ERROR'], handler: (error: Error) => void): this;
  public on(name: string, ...args: any[]): this;
}
