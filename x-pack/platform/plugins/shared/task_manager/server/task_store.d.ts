/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subject } from 'rxjs';
import type { SavedObjectError } from '@kbn/core-saved-objects-common';
import type { estypes } from '@elastic/elasticsearch';
import type {
  SavedObjectsBulkDeleteResponse,
  Logger,
  SavedObjectsServiceStart,
  SecurityServiceStart,
  KibanaRequest,
  SavedObject,
  ISavedObjectsSerializer,
  ISavedObjectsRepository,
  ElasticsearchClient,
} from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-shared';
import type { ExecutionContextStart } from '@kbn/core/server';
import type { Result } from './lib/result_type';
import type {
  ConcreteTaskInstance,
  ConcreteTaskInstanceVersion,
  TaskInstance,
  TaskLifecycle,
  SerializedConcreteTaskInstance,
  PartialConcreteTaskInstance,
  PartialSerializedConcreteTaskInstance,
  ApiKeyOptions,
} from './task';
import type { TaskTypeDictionary } from './task_type_dictionary';
import type { AdHocTaskCounter } from './lib/adhoc_task_counter';
import type { TaskValidator } from './task_validator';
import type { ErrorOutput } from './lib/bulk_operation_buffer';
import type { ApiKeyStrategy } from './api_key_strategy';
export interface StoreOpts {
  esClient: ElasticsearchClient;
  index: string;
  taskManagerId: string;
  definitions: TaskTypeDictionary;
  savedObjectsRepository: ISavedObjectsRepository;
  savedObjectsService: SavedObjectsServiceStart;
  serializer: ISavedObjectsSerializer;
  adHocTaskCounter: AdHocTaskCounter;
  allowReadingInvalidState: boolean;
  logger: Logger;
  security: SecurityServiceStart;
  canEncryptSavedObjects?: boolean;
  esoClient?: EncryptedSavedObjectsClient;
  getIsSecurityEnabled: () => boolean;
  executionContext: ExecutionContextStart;
  apiKeyStrategy: ApiKeyStrategy;
}
export interface SearchOpts {
  search_after?: Array<number | string>;
  size?: number;
  sort?: estypes.Sort;
  query?: estypes.QueryDslQueryContainer;
  seq_no_primary_term?: boolean;
}
export interface AggregationOpts {
  aggs: Record<string, estypes.AggregationsAggregationContainer>;
  query?: estypes.QueryDslQueryContainer;
  runtime_mappings?: estypes.MappingRuntimeFields;
  size?: number;
}
export interface FetchResult {
  docs: ConcreteTaskInstance[];
  versionMap: Map<string, ConcreteTaskInstanceVersion>;
}
export interface BulkUpdateOpts {
  validate: boolean;
  mergeAttributes?: boolean;
  options?: ApiKeyOptions;
}
export type BulkUpdateResult = Result<ConcreteTaskInstance, ErrorOutput>;
export type PartialBulkUpdateResult = Result<PartialConcreteTaskInstance, ErrorOutput>;
export type BulkGetResult = Array<
  Result<
    ConcreteTaskInstance,
    {
      type: string;
      id: string;
      error: SavedObjectError;
    }
  >
>;
/**
 * Wraps an elasticsearch connection and provides a task manager-specific
 * interface into the index.
 */
export declare class TaskStore {
  readonly index: string;
  readonly taskManagerId: string;
  readonly errors$: Subject<Error>;
  readonly taskValidator: TaskValidator;
  private esClient;
  private esoClient?;
  private definitions;
  private savedObjectsRepository;
  private savedObjectsService;
  private _invalidationSoClient?;
  private serializer;
  private adHocTaskCounter;
  private security;
  private canEncryptSavedObjects?;
  private getIsSecurityEnabled;
  private logger;
  private executionContextRunner;
  private apiKeyStrategy;
  private get invalidationSoClient();
  /**
   * Constructs a new TaskStore.
   * @param {StoreOpts} opts
   * @prop {esClient} esClient - An elasticsearch client
   * @prop {string} index - The name of the task manager index
   * @prop {TaskDefinition} definition - The definition of the task being run
   * @prop {serializer} - The saved object serializer
   * @prop {savedObjectsRepository} - An instance to the saved objects repository
   */
  constructor(opts: StoreOpts);
  registerEncryptedSavedObjectsClient(client: EncryptedSavedObjectsClient): void;
  getEncryptedSavedObjectsClient(): EncryptedSavedObjectsClient | undefined;
  private canEncryptSo;
  private validateCanEncryptSavedObjects;
  private getSoClientForCreate;
  private regenerateApiKeyFromRequest;
  private getSoClientForUpdate;
  /**
   * Whether a scheduling call with these options will grant API keys. Guards on the grant path
   * (like the ensureScheduled existence pre-check) must use this predicate rather than checking
   * the request themselves, so they cannot drift from the grant condition in
   * `grantApiKeysFromRequest`.
   */
  willGrantApiKeys(options?: { request?: KibanaRequest }): boolean;
  private grantApiKeysFromRequest;
  private markApiKeysForInvalidation;
  /**
   * Marks API keys that were granted for a task write that never landed, so the invalidation task
   * can revoke them.
   *
   * API keys are granted before the task document is written, so any failure in between leaves them
   * attached to no task and referenced by nothing. Marking is safe even when a key turns out to be
   * shared with a task that was written successfully (keys are granted per task type, not per task):
   * the invalidation task skips keys still referenced by a live task and retries them later.
   */
  private invalidateUnpersistedApiKeys;
  private bulkGetDecryptedTaskApiKeys;
  private getDecryptedApiKeys;
  private bulkGetAndMergeTasksWithDecryptedApiKey;
  /**
   * Convert ConcreteTaskInstance Ids to match their SavedObject format as serialized
   * in Elasticsearch
   * @param tasks - The task being scheduled.
   */
  convertToSavedObjectIds(
    taskIds: Array<ConcreteTaskInstance['id']>
  ): Array<ConcreteTaskInstance['id']>;
  /**
   * Schedules a task.
   *
   * @param task - The task being scheduled.
   */
  schedule(taskInstance: TaskInstance, options?: ApiKeyOptions): Promise<ConcreteTaskInstance>;
  private _schedule;
  /**
   * Bulk schedules a task.
   *
   * @param tasks - The tasks being scheduled.
   */
  bulkSchedule(
    taskInstances: TaskInstance[],
    options?: ApiKeyOptions
  ): Promise<ConcreteTaskInstance[]>;
  private _bulkSchedule;
  /**
   * Fetches a list of scheduled tasks with default sorting.
   *
   * @param opts - The query options used to filter tasks
   * @param limitResponse - Whether to exclude the task state and params from the source for a smaller respose payload
   */
  fetch({ sort, ...opts }?: SearchOpts, limitResponse?: boolean): Promise<FetchResult>;
  /**
   * Updates the specified doc in the index, returning the doc
   * with its version up to date.
   *
   * @param {TaskDoc} doc
   * @returns {Promise<TaskDoc>}
   */
  update(
    doc: ConcreteTaskInstance,
    options: {
      validate: boolean;
    }
  ): Promise<ConcreteTaskInstance>;
  private _update;
  /**
   * Updates the specified docs in the index, returning the docs
   * with their versions up to date.
   *
   * @param {Array<TaskDoc>} docs
   * @returns {Promise<Array<TaskDoc>>}
   */
  bulkUpdate(docs: ConcreteTaskInstance[], options: BulkUpdateOpts): Promise<BulkUpdateResult[]>;
  private _bulkUpdate;
  bulkPartialUpdate(docs: PartialConcreteTaskInstance[]): Promise<PartialBulkUpdateResult[]>;
  private _bulkPartialUpdate;
  /**
   * Removes the specified task from the index.
   *
   * @param {string} id
   * @returns {Promise<void>}
   */
  remove(id: string): Promise<void>;
  private _remove;
  /**
   * Bulk removes the specified tasks from the index.
   *
   * @param {SavedObjectsBulkDeleteObject[]} savedObjectsToDelete
   * @returns {Promise<SavedObjectsBulkDeleteResponse>}
   */
  bulkRemove(taskIds: string[]): Promise<SavedObjectsBulkDeleteResponse>;
  private _bulkRemove;
  /**
   * Gets a task by id
   *
   * @param {string} id
   * @returns {Promise<ConcreteTaskInstance>}
   */
  get(id: string): Promise<ConcreteTaskInstance>;
  private _get;
  /**
   * Resolves whether a task document exists, without reading or decrypting its API keys.
   *
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  taskExists(id: string): Promise<boolean>;
  private _taskExists;
  /**
   * Gets tasks by ids
   *
   * @param {Array<string>} ids
   * @returns {Promise<BulkGetResult>}
   */
  bulkGet(ids: string[]): Promise<BulkGetResult>;
  private _bulkGet;
  /**
   * Gets task version info by ids
   *
   * @param {Array<string>} esIds
   * @returns {Promise<ConcreteTaskInstanceVersion[]>}
   */
  bulkGetVersions(ids: string[]): Promise<ConcreteTaskInstanceVersion[]>;
  private _bulkGetVersions;
  /**
   * Gets task lifecycle step by id
   *
   * @param {string} id
   * @returns {Promise<void>}
   */
  getLifecycle(id: string): Promise<TaskLifecycle>;
  msearch(opts?: SearchOpts[]): Promise<FetchResult>;
  private _msearch;
  search(opts?: SearchOpts, limitResponse?: boolean): Promise<FetchResult>;
  private _search;
  private filterTasks;
  private addTasksToVersionMap;
  private createVersionMap;
  aggregate<TSearchRequest extends AggregationOpts>({
    aggs,
    query,
    runtime_mappings,
    size,
  }: TSearchRequest): Promise<estypes.SearchResponse<ConcreteTaskInstance>>;
  private _aggregate;
  getDocVersions(esIds: string[]): Promise<Map<string, ConcreteTaskInstanceVersion>>;
  private _getDocVersions;
}
/**
 * Returns true when a task document holds an encrypted API key credential
 * (either an ES API key or a UIAM API key) together with the `userScope`
 * metadata required to process it. Must be kept in sync with every credential
 * field registered for ESO encryption on the `task` saved object type, except
 * `encryptedCredential`, which is never decrypted or re-encrypted on update.
 */
export declare function docHasEncryptedApiKey(
  doc: Pick<ConcreteTaskInstance, 'apiKey' | 'uiamApiKey' | 'userScope'>
): boolean;
export declare function taskInstanceToAttributes(
  doc: TaskInstance,
  id: string
): SerializedConcreteTaskInstance;
export declare function partialTaskInstanceToAttributes(
  doc: PartialConcreteTaskInstance
): PartialSerializedConcreteTaskInstance;
export declare function savedObjectToConcreteTaskInstance(
  savedObject: Omit<SavedObject<SerializedConcreteTaskInstance>, 'references'>
): ConcreteTaskInstance;
