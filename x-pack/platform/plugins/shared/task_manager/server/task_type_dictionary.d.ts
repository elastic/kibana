/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObjectType } from '@kbn/config-schema';
import type { Logger } from '@kbn/core/server';
import type { TaskDefinition, TaskRunCreatorFunction, TaskPriority, TaskCost } from './task';
/**
 * Types that are no longer registered and will be marked as unregistered
 */
export declare const REMOVED_TYPES: string[];
export declare const SHARED_CONCURRENCY_TASKS: string[][];
/**
 * Defines a task which can be scheduled and run by the Kibana
 * task manager.
 */
export interface TaskRegisterDefinition {
  /**
   * A brief, human-friendly title for this task.
   */
  title?: string;
  /**
   * How long, in minutes or seconds, the system should wait for the task to complete
   * before it is considered to be timed out. (e.g. '5m', the default). If
   * the task takes longer than this, Kibana will send it a kill command and
   * the task will be re-attempted.
   */
  timeout?: string;
  /**
   * An optional definition of task priority. Tasks will be sorted by priority prior to claiming
   * so high priority tasks will always be claimed before normal priority, which will always be
   * claimed before low priority
   */
  priority?: TaskPriority;
  /**
   * An optional definition of the cost associated with running the task.
   */
  cost?: TaskCost;
  /**
   * An optional more detailed description of what this task does.
   */
  description?: string;
  /**
   * Creates an object that has a run function which performs the task's work,
   * and an optional cancel function which cancels the task.
   */
  createTaskRunner: TaskRunCreatorFunction;
  /**
   * Up to how many times the task should retry when it fails to run. This will
   * default to the global variable. The default value, if not specified, is 1.
   */
  maxAttempts?: number;
  /**
   * The maximum number tasks of this type that can be run concurrently per Kibana instance.
   * Setting this value will force Task Manager to poll for this task type separately from other task types
   * which can add significant load to the ES cluster, so please use this configuration only when absolutely necessary.
   * The default value, if not given, is 0.
   */
  maxConcurrency?: number;
  stateSchemaByVersion?: Record<
    number,
    {
      schema: ObjectType;
      up: (state: Record<string, unknown>) => Record<string, unknown>;
    }
  >;
  paramsSchema?: ObjectType;
}
/**
 * A mapping of task type id to the task definition.
 */
export type TaskDefinitionRegistry = Record<string, TaskRegisterDefinition>;
export declare class TaskTypeDictionary {
  private definitions;
  private logger;
  constructor(logger: Logger);
  [Symbol.iterator](): MapIterator<[string, TaskDefinition]>;
  getAllTypes(): string[];
  getAllDefinitions(): TaskDefinition[];
  has(type: string): boolean;
  size(): number;
  get(type: string): TaskDefinition | undefined;
  ensureHas(type: string): void;
  /**
   * Method for allowing consumers to register task definitions into the system.
   * @param taskDefinitions - The Kibana task definitions dictionary
   */
  registerTaskDefinitions(taskDefinitions: TaskDefinitionRegistry): void;
  private verifySharedConcurrencyAndCost;
}
/**
 * Sanitizes the system's task definitions. Task definitions have optional properties, and
 * this ensures they all are given a reasonable default.
 *
 * @param taskDefinitions - The Kibana task definitions dictionary
 */
export declare function sanitizeTaskDefinitions(
  taskDefinitions: TaskDefinitionRegistry
): TaskDefinition[];
export declare function sharedConcurrencyTaskTypes(taskType: string): string[] | undefined;
