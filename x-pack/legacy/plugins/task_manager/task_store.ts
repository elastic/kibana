/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * This module contains helpers for managing the task manager storage layer.
 */

import { omit } from 'lodash';
import {
  SavedObjectsClientContract,
  SavedObject,
  SavedObjectAttributes,
  SavedObjectsSerializer,
  SavedObjectsRawDoc,
} from 'src/core/server';
import {
  ConcreteTaskInstance,
  ElasticJs,
  TaskDefinition,
  TaskDictionary,
  TaskInstance,
} from './task';

export interface StoreOpts {
  callCluster: ElasticJs;
  index: string;
  kibanaId: string;
  maxAttempts: number;
  definitions: TaskDictionary<TaskDefinition>;
  savedObjectsRepository: SavedObjectsClientContract;
  serializer: SavedObjectsSerializer;
}

export interface SearchOpts {
  searchAfter?: any[];
  sort?: object | object[];
  query?: object;
  size?: number;
  seq_no_primary_term?: boolean;
  search_after?: any[];
}

export interface FetchOpts extends SearchOpts {
  sort?: object[];
}

export interface UpdateByQueryOpts extends SearchOpts {
  script?: object;
}

export interface OwnershipClaimingOpts {
  retryAt: Date;
  size: number;
}

export interface FetchResult {
  searchAfter: any[];
  docs: ConcreteTaskInstance[];
}

export interface ClaimOwnershipResult {
  claimedTasks: number;
  docs: ConcreteTaskInstance[];
}

export interface UpdateByQueryResult {
  total: number;
}

/**
 * Wraps an elasticsearch connection and provides a task manager-specific
 * interface into the index.
 */
export class TaskStore {
  public readonly maxAttempts: number;
  public readonly index: string;
  public readonly kibanaId: string;
  private callCluster: ElasticJs;
  private definitions: TaskDictionary<TaskDefinition>;
  private savedObjectsRepository: SavedObjectsClientContract;
  private serializer: SavedObjectsSerializer;

  /**
   * Constructs a new TaskStore.
   * @param {StoreOpts} opts
   * @prop {CallCluster} callCluster - The elastic search connection
   * @prop {string} index - The name of the task manager index
   * @prop {number} maxAttempts - The maximum number of attempts before a task will be abandoned
   * @prop {TaskDefinition} definition - The definition of the task being run
   * @prop {serializer} - The saved object serializer
   * @prop {savedObjectsRepository} - An instance to the saved objects repository
   */
  constructor(opts: StoreOpts) {
    this.callCluster = opts.callCluster;
    this.index = opts.index;
    this.kibanaId = opts.kibanaId;
    this.maxAttempts = opts.maxAttempts;
    this.definitions = opts.definitions;
    this.serializer = opts.serializer;
    this.savedObjectsRepository = opts.savedObjectsRepository;

    this.fetchAvailableTasks = this.fetchAvailableTasks.bind(this);
  }

  /**
   * Schedules a task.
   *
   * @param task - The task being scheduled.
   */
  public async schedule(taskInstance: TaskInstance): Promise<ConcreteTaskInstance> {
    if (!this.definitions[taskInstance.taskType]) {
      throw new Error(
        `Unsupported task type "${taskInstance.taskType}". Supported types are ${Object.keys(
          this.definitions
        ).join(', ')}`
      );
    }

    const savedObject = await this.savedObjectsRepository.create(
      'task',
      taskInstanceToAttributes(taskInstance),
      { id: taskInstance.id }
    );

    return savedObjectToConcreteTaskInstance(savedObject);
  }

  /**
   * Fetches a paginatable list of scheduled tasks.
   *
   * @param opts - The query options used to filter tasks
   */
  public async fetch(opts: FetchOpts = {}): Promise<FetchResult> {
    const sort = paginatableSort(opts.sort);
    return this.search({
      sort,
      search_after: opts.searchAfter,
      query: opts.query,
    });
  }

  /**
   * Fetches tasks from the index, which are ready to be run.
   * - runAt is now or past
   * - id is not currently running in this instance of Kibana
   * - has a type that is in our task definitions
   *
   * @param {TaskQuery} query
   * @prop {string[]} types - Task types to be queried
   * @prop {number} size - The number of task instances to retrieve
   * @returns {Promise<ConcreteTaskInstance[]>}
   */
  public async fetchAvailableTasks(): Promise<ConcreteTaskInstance[]> {
    const { docs } = await this.search({
      query: {
        bool: {
          must: [
            // Either a task with idle status and runAt <= now or
            // status running with a retryAt <= now.
            {
              bool: {
                should: [
                  {
                    bool: {
                      must: [
                        { term: { 'task.status': 'idle' } },
                        { range: { 'task.runAt': { lte: 'now' } } },
                      ],
                    },
                  },
                  {
                    bool: {
                      must: [
                        { term: { 'task.status': 'running' } },
                        { range: { 'task.retryAt': { lte: 'now' } } },
                      ],
                    },
                  },
                ],
              },
            },
            // Either task has an interval or the attempts < the maximum configured
            {
              bool: {
                should: [
                  { exists: { field: 'task.interval' } },
                  ...Object.entries(this.definitions).map(([type, definition]) => ({
                    bool: {
                      must: [
                        { term: { 'task.taskType': type } },
                        {
                          range: {
                            'task.attempts': {
                              lt: definition.maxAttempts || this.maxAttempts,
                            },
                          },
                        },
                      ],
                    },
                  })),
                ],
              },
            },
          ],
        },
      },
      size: 10,
      sort: {
        _script: {
          type: 'number',
          order: 'asc',
          script: {
            lang: 'expression',
            source: `doc['task.retryAt'].value || doc['task.runAt'].value`,
          },
        },
      },
      seq_no_primary_term: true,
    });

    return docs;
  }

  /**
   * Claims available tasks from the index, which are ready to be run.
   * - runAt is now or past
   * - is not currently claimed by any instance of Kibana
   * - has a type that is in our task definitions
   *
   * @param {OwnershipClaimingOpts} options
   * @returns {Promise<ClaimOwnershipResult>}
   */
  public async claimAvailableTasks(opts: OwnershipClaimingOpts): Promise<ClaimOwnershipResult> {
    const claimedTasks = await this.markAvailableTasksAsClaimed(opts);
    const docs = claimedTasks > 0 ? await this.sweepForClaimedTasks(opts) : [];
    return {
      claimedTasks,
      docs,
    };
  }

  private async markAvailableTasksAsClaimed({
    size,
    retryAt,
  }: OwnershipClaimingOpts): Promise<number> {
    const { total } = await this.updateByQuery({
      query: {
        bool: {
          must: [
            // Either a task with idle status and runAt <= now or
            // status running with a retryAt <= now.
            {
              bool: {
                should: [
                  {
                    bool: {
                      must: [
                        { term: { 'task.status': 'idle' } },
                        { range: { 'task.runAt': { lte: 'now' } } },
                      ],
                    },
                  },
                  {
                    bool: {
                      must: [
                        {
                          bool: {
                            should: [
                              { term: { 'task.status': 'running' } },
                              { term: { 'task.status': 'claiming' } },
                            ],
                          },
                        },
                        { range: { 'task.retryAt': { lte: 'now' } } },
                      ],
                    },
                  },
                ],
              },
            },
            // Either task has an interval or the attempts < the maximum configured
            {
              bool: {
                should: [
                  { exists: { field: 'task.interval' } },
                  ...Object.entries(this.definitions).map(([type, definition]) => ({
                    bool: {
                      must: [
                        { term: { 'task.taskType': type } },
                        {
                          range: {
                            'task.attempts': {
                              lt: definition.maxAttempts || this.maxAttempts,
                            },
                          },
                        },
                      ],
                    },
                  })),
                ],
              },
            },
          ],
        },
      },
      size,
      sort: {
        _script: {
          type: 'number',
          order: 'asc',
          script: {
            lang: 'expression',
            source: `doc['task.retryAt'].value || doc['task.runAt'].value`,
          },
        },
      },
      seq_no_primary_term: true,
      script: {
        source: `ctx._source.owner=params.ownerId; ctx._source.status=params.status; ctx._source.retryAt=params.retryAt;`,
        lang: 'painless',
        params: {
          ownerId: this.kibanaId,
          retryAt,
          status: 'claiming',
        },
      },
    });
    return total;
  }

  /**
   * Fetches tasks from the index, which are owned by the current Kibana instance
   */
  private async sweepForClaimedTasks({
    size,
  }: OwnershipClaimingOpts): Promise<ConcreteTaskInstance[]> {
    const { docs } = await this.search({
      query: {
        bool: {
          filter: {
            term: {
              owner: this.kibanaId,
            },
          },
        },
      },
      size,
      sort: {
        _script: {
          type: 'number',
          order: 'asc',
          script: {
            lang: 'expression',
            source: `doc['task.retryAt'].value || doc['task.runAt'].value`,
          },
        },
      },
      seq_no_primary_term: true,
    });

    return docs;
  }
  /**
   * Updates the specified doc in the index, returning the doc
   * with its version up to date.
   *
   * @param {TaskDoc} doc
   * @returns {Promise<TaskDoc>}
   */
  public async update(doc: ConcreteTaskInstance): Promise<ConcreteTaskInstance> {
    const updatedSavedObject = await this.savedObjectsRepository.update(
      'task',
      doc.id,
      taskInstanceToAttributes(doc),
      { version: doc.version }
    );

    return savedObjectToConcreteTaskInstance(updatedSavedObject);
  }

  /**
   * Removes the specified task from the index.
   *
   * @param {string} id
   * @returns {Promise<void>}
   */
  public async remove(id: string): Promise<void> {
    await this.savedObjectsRepository.delete('task', id);
  }

  private async search(opts: SearchOpts = {}): Promise<FetchResult> {
    const { query } = ensureQueryOnlyReturnsTaskObjects(opts);

    const result = await this.callCluster('search', {
      index: this.index,
      ignoreUnavailable: true,
      body: {
        ...opts,
        query,
      },
    });

    const rawDocs = result.hits.hits;

    return {
      docs: (rawDocs as SavedObjectsRawDoc[])
        .map(doc => this.serializer.rawToSavedObject(doc))
        .map(doc => omit(doc, 'namespace') as SavedObject)
        .map(savedObjectToConcreteTaskInstance),
      searchAfter: (rawDocs.length && rawDocs[rawDocs.length - 1].sort) || [],
    };
  }

  private async updateByQuery(opts: UpdateByQueryOpts = {}): Promise<UpdateByQueryResult> {
    const { query } = ensureQueryOnlyReturnsTaskObjects(opts);
    const result = await this.callCluster('updateByQuery', {
      index: this.index,
      ignoreUnavailable: true,
      body: {
        ...opts,
        query,
      },
    });

    const { total } = result;
    return {
      total,
    };
  }
}

function paginatableSort(sort: any[] = []) {
  const sortById = { _id: 'desc' };

  if (!sort.length) {
    return [{ 'task.runAt': 'asc' }, sortById];
  }

  if (sort.find(({ _id }) => !!_id)) {
    return sort;
  }

  return [...sort, sortById];
}

function taskInstanceToAttributes(doc: TaskInstance): SavedObjectAttributes {
  return {
    ...omit(doc, 'id', 'version'),
    params: JSON.stringify(doc.params || {}),
    state: JSON.stringify(doc.state || {}),
    attempts: (doc as ConcreteTaskInstance).attempts || 0,
    scheduledAt: (doc.scheduledAt || new Date()).toISOString(),
    startedAt: (doc.startedAt && doc.startedAt.toISOString()) || null,
    retryAt: (doc.retryAt && doc.retryAt.toISOString()) || null,
    runAt: (doc.runAt || new Date()).toISOString(),
    status: (doc as ConcreteTaskInstance).status || 'idle',
  };
}

function savedObjectToConcreteTaskInstance(savedObject: SavedObject): ConcreteTaskInstance {
  return {
    ...savedObject.attributes,
    id: savedObject.id,
    version: savedObject.version,
    scheduledAt: new Date(savedObject.attributes.scheduledAt),
    runAt: new Date(savedObject.attributes.runAt),
    startedAt: savedObject.attributes.startedAt && new Date(savedObject.attributes.startedAt),
    retryAt: savedObject.attributes.retryAt && new Date(savedObject.attributes.retryAt),
    state: parseJSONField(savedObject.attributes.state, 'state', savedObject.id),
    params: parseJSONField(savedObject.attributes.params, 'params', savedObject.id),
  };
}

function parseJSONField(json: string, fieldName: string, id: string) {
  try {
    return json ? JSON.parse(json) : {};
  } catch (error) {
    throw new Error(`Task "${id}"'s ${fieldName} field has invalid JSON: ${json}`);
  }
}

function ensureQueryOnlyReturnsTaskObjects(opts: SearchOpts): SearchOpts {
  const originalQuery = opts.query;
  const queryOnlyTasks = { term: { type: 'task' } };
  const query = originalQuery
    ? { bool: { must: [queryOnlyTasks, originalQuery] } }
    : queryOnlyTasks;

  return {
    ...opts,
    query,
  };
}
