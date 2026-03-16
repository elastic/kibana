/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monotonicFactory } from 'ulid';
import type {
  QueryDslQueryContainer,
  SearchTotalHits,
  SortCombinations,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { type DataStreamDefinition, DataStreamClient } from '@kbn/data-streams';
import type { ClientCreateRequest } from '@kbn/data-streams/src/types/es_api';
import type { Logger } from '@kbn/logging';
import { changeHistoryMappings } from './mappings';
import type {
  ChangeHistoryDocument,
  GetHistoryResult,
  LogChangeHistoryOptions,
  GetChangeHistoryOptions,
  ObjectChange,
} from './types';
import { sha256, standardDiffDocCalculation, maskSensitiveFields } from './utils';

const ulid = monotonicFactory();

export const DATA_STREAM_NAME = '.kibana-change-history';
const START_DATE_META_PROP = 'startDates';
const SEPARATOR_CHAR = '|';
const ECS_VERSION = '9.3.0';
const DEFAULT_RESULT_SIZE = 100;

type ChangeHistoryDataStreamClient = DataStreamClient<
  typeof changeHistoryMappings.v1,
  ChangeHistoryDocument
>;

export interface IChangeHistoryClient {
  isInitialized(): boolean;
  initialize(elasticsearchClient: ElasticsearchClient): void;
  log(change: ObjectChange, opts: LogChangeHistoryOptions): Promise<void>;
  logBulk(changes: ObjectChange[], opts: LogChangeHistoryOptions): Promise<void>;
  getHistory(
    spaceId: string,
    objectType: string,
    objectId: string,
    opts?: GetChangeHistoryOptions
  ): Promise<GetHistoryResult>;
}

export class ChangeHistoryClient implements IChangeHistoryClient {
  static startDates = {} as Record<string, Date>;
  static initializationQueue = [] as string[];

  private module: string;
  private dataset: string;
  private kibanaVersion: string;
  private logger: Logger;
  private client?: ChangeHistoryDataStreamClient;

  /**
   * The date when change tracking started for this module and dataset.
   * Useful when change tracking is introduced halfway through feature lifecycle where objects
   * will have change histories that suddenly stop at a particular date without explanation.
   */
  public get startDate() {
    return ChangeHistoryClient.startDates[`${this.module}${SEPARATOR_CHAR}${this.dataset}`];
  }

  constructor({
    module,
    dataset,
    logger,
    kibanaVersion,
  }: {
    module: string;
    dataset: string;
    logger: Logger;
    kibanaVersion: string;
  }) {
    if (module.includes(SEPARATOR_CHAR))
      throw new Error(
        `Invalid module "${module}". Should not include separator [${SEPARATOR_CHAR}]`
      );
    if (dataset.includes(SEPARATOR_CHAR))
      throw new Error(
        `Invalid dataset "${dataset}". Should not include separator [${SEPARATOR_CHAR}]`
      );
    this.module = module;
    this.dataset = dataset;
    this.kibanaVersion = kibanaVersion;
    this.logger = logger;
    ChangeHistoryClient.initializationQueue.push(`${module}${SEPARATOR_CHAR}${dataset}`);
  }

  /**
   * Check if the change tracking service is initialized.
   * @returns true if the change tracking service is initialized.
   */
  isInitialized() {
    return !!this.client;
  }

  /**
   * Initialize the change tracking service.
   * @param elasticsearchClient The privileged elasticsearch client `core.elasticsearch.client.asInternalUser`.
   * @returns A promise that resolves when the change tracking service is initialized.
   * @throws An error if the data stream is not initialized properly.
   */
  async initialize(elasticsearchClient: ElasticsearchClient) {
    // Step 1: Create data stream definition
    // TODO: What about ILM policy (defaults to none = keep forever)
    const definition: DataStreamDefinition<typeof changeHistoryMappings.v1> = {
      name: DATA_STREAM_NAME,
      version: 1,
      hidden: true,
      template: {
        priority: 100,
        mappings: changeHistoryMappings.v1,
      },
    };

    // Step 2: Initialize data stream
    try {
      this.client = (await DataStreamClient.initialize({
        dataStream: definition,
        elasticsearchClient,
        logger: this.logger,
        lazyCreation: false,
      })) as ChangeHistoryDataStreamClient;
    } catch (error) {
      const err = new Error(
        `Unable to initialize change history data stream for: module [${this.module}] and dataset [${this.dataset}]: ${error}`,
        { cause: error }
      );
      this.logger.error(err);
      throw err;
    }

    // Step 3: Initialize the "start date" when change tracking began for this feature.
    const queue = ChangeHistoryClient.initializationQueue.splice(0);
    // If there are no features left to initialize.
    // This has been done somewhere else so skip next step.
    if (!queue.length) return;
    ChangeHistoryClient.startDates = await this.initializeStartDates(queue, elasticsearchClient);
  }

  /**
   * Gets a list of change tracking dates from the ES index template, sets any to today if not initialized.
   * @param features A list of features to get change tracking start dates for
   * @param elasticsearchClient The ES client. To make queries to elasticsearch.
   * @returns A map of dates for each feature stored in the data steam index template.
   */
  private async initializeStartDates(
    features: string[],
    elasticsearchClient: ElasticsearchClient
  ): Promise<Record<string, Date>> {
    const result = {} as Record<string, Date>;
    try {
      const now = new Date();
      const {
        data_streams: [{ template: templateName }],
      } = await elasticsearchClient.indices.getDataStream(
        { name: DATA_STREAM_NAME },
        { maxRetries: 3 }
      );
      if (templateName) {
        // Check existing start dates stored on index template for this data stream
        const {
          index_templates: [{ index_template: template }],
        } = await elasticsearchClient.indices.getIndexTemplate(
          { name: templateName },
          { maxRetries: 3 }
        );
        if (template) {
          const meta = template._meta ?? {};
          const originalStartDates = (meta[START_DATE_META_PROP] =
            meta[START_DATE_META_PROP] || {});
          for (const feature of features) {
            const startDate = new Date(originalStartDates[feature]);
            result[feature] = startDate.getTime() ? startDate : now;
          }
          // Any changes? If so update the index template.
          // So the metadata reflects actual start dates for all the features
          // stored in the data stream.
          const serialize = JSON.stringify;
          if (serialize(result) !== serialize(originalStartDates)) {
            const _meta = {
              ...template._meta,
              [START_DATE_META_PROP]: result,
            };
            // Clean up
            delete template.created_date;
            delete template.created_date_millis;
            delete template.modified_date;
            delete template.modified_date_millis;
            // eslint-disable-next-line @typescript-eslint/naming-convention
            const ignore_missing_component_templates =
              template.ignore_missing_component_templates as string[] | undefined;
            await elasticsearchClient.indices.putIndexTemplate(
              {
                name: templateName,
                ...template,
                ignore_missing_component_templates,
                _meta,
              },
              { maxRetries: 3 }
            );
          }
        }
      }
    } catch (err) {
      this.logger.error(`Unable to initialize change history start dates. ${err}`);
    }
    return result;
  }

  /**
   * Log a change for a single object.
   * @param change - The changes to object that was affected.
   * @param opts - The options for the change.
   * @returns A promise that resolves when the change is logged.
   * @throws An error if the data stream is not initialized, or if an error occurs while logging the change.
   */
  async log(change: ObjectChange, opts: LogChangeHistoryOptions) {
    return this.logBulk([change], opts);
  }

  /**
   * Log a bulk change for one or more objects.
   * @param changes - The changes to objects that were affected.
   * @param opts - The options for the bulk change.
   * @param opts.action - The action performed (`rule_create`, `rule_update`, `rule_delete`, etc.)
   * @param opts.username - Current login name for the user who performed the change.
   * @param opts.userProfileId - Optional user profile ID (auth realm). See Elastic User Profiles.
   * @param opts.spaceId - The ID of the space that the change belongs to.
   * @param opts.timestamp - Optional timestamp of the change.
   * @param opts.correlationId - Optional correlation ID for the bulk change.
   * @param opts.data - Optional data to merge into the change history document.
   * @param opts.ignoreFields - Optional fields to ignore in the diff calculation.
   * @param opts.maskFields - Optional "sensitive data" fields to mask instead of store in plain form.
   * @param opts.diffDocCalculation - Optional function to calculate the diff between the current and next state of the object.
   * @param opts.refresh - Optional indicator to force an ES refresh after changes (affects perfomance)
   * @returns A promise that resolves when the bulk change is logged.
   * @throws An error if the data stream is not initialized, or if an error occurs while logging the change.
   */
  async logBulk(changes: ObjectChange[], opts: LogChangeHistoryOptions) {
    const { module, dataset, client, kibanaVersion } = this;

    if (!client) {
      const err = new Error(
        `Change history data stream not initialized for: module [${this.module}] and dataset [${this.dataset}]`
      );
      this.logger.error(err);
      throw err;
    }
    const { username, userProfileId, spaceId, correlationId, refresh } = opts;
    const request: ClientCreateRequest<ChangeHistoryDocument> = {
      refresh,
      documents: [],
    };

    for (const change of changes) {
      // Create document and populate
      const { id, objectType, objectId, index, timestamp, sequence } = change;
      const hash = sha256(JSON.stringify(change.after));
      const masked = maskSensitiveFields(change.after, opts.maskFields);
      const fields = { masked: masked.fields, changed: undefined as string[] | undefined };
      const { event, metadata, tags } = opts.data ?? {};
      const created = new Date().toISOString();
      // `eventId` should be scoped by module and dataset so two features do not clash on the same `event.id`
      // If not provided, fallback to `ulid()` to make 'same millisecond' event order deterministic (helps with integration tests)
      const eventId = id ? `${module}${SEPARATOR_CHAR}${dataset}${SEPARATOR_CHAR}${id}` : ulid();
      const document: ChangeHistoryDocument = {
        '@timestamp': new Date(timestamp || created).toISOString(),
        ecs: { version: ECS_VERSION },
        user: { name: username, id: userProfileId },
        event: {
          id: eventId,
          created,
          type: event?.type ?? 'change',
          reason: event?.reason,
          module,
          dataset,
          action: opts.action,
        },
        object: {
          id: objectId,
          type: objectType,
          index,
          hash,
          sequence,
          fields,
          snapshot: masked.snapshot,
        },
        tags,
        metadata,
        kibana: { space_id: spaceId, version: kibanaVersion },
      };
      if (correlationId && !document.event.group) document.event.group = { id: correlationId };
      // Do we have "before" state?
      // Perform diff using diffDocCalculation(), defaulted to standard if not passed in.
      if (change.before) {
        const diffCalc = opts.diffDocCalculation ?? standardDiffDocCalculation;
        try {
          const maskedBefore = maskSensitiveFields(change.before, opts.maskFields);
          const { fieldChanges, oldvalues } = diffCalc({
            a: maskedBefore.snapshot,
            b: masked.snapshot,
            ignoreFields: opts.ignoreFields,
          });
          fields.masked = Array.from(new Set([...maskedBefore.fields, ...masked.fields]));
          fields.changed = fieldChanges;
          document.object = { ...document.object, oldvalues };
        } catch (err) {
          // Uncalculated diff should not be fatal, just log and continue
          this.logger.error(new Error('Unable to calculate change history diff', { cause: err }));
        }
      }
      // Queue operations
      request.documents.push({ _id: document.event.id, ...document });
    }

    try {
      await client.create({ ...request });
    } catch (err) {
      const error = new Error(`Error saving change history: ${err}`, { cause: err });
      this.logger.error(error);
      throw error;
    }
  }

  /**
   * Get the change history of an object.
   * @param spaceId - The kibana space Id where this object exists
   * @param objectType - The type of the object.
   * @param objectId - The ID of the object.
   * @param opts - The options for the history query.
   * @param opts.additionalFilters - Additional filters to apply to the history query.
   * @param opts.sort - The sort order for the history query.
   * @param opts.from - The starting index for the history query.
   * @param opts.size - The number of results to return.
   * @param opts.transportOpts - Additional ES transport options
   * @returns The history of the object.
   * @throws An error if the data stream is not initialized, or if an error occurs while getting the history.
   */
  async getHistory(
    spaceId: string,
    objectType: string,
    objectId: string,
    opts?: GetChangeHistoryOptions
  ): Promise<GetHistoryResult> {
    const client = this.client;
    if (!client) {
      const err = new Error(
        `Change history data stream not initialized for: module [${this.module}] and dataset [${this.dataset}]`
      );
      this.logger.error(err);
      throw err;
    }
    const filter: QueryDslQueryContainer[] = [
      { term: { 'kibana.space_id': spaceId } },
      { term: { 'event.module': this.module } },
      { term: { 'event.dataset': this.dataset } },
      { term: { 'object.type': objectType } },
      { term: { 'object.id': objectId } },
    ];
    if (opts?.additionalFilters) {
      filter.push(...opts.additionalFilters);
    }
    const defaultSort: SortCombinations[] = [
      { 'object.sequence': { order: 'desc', missing: 0 } }, // <-- If available, `sequence` ordering overrides timestamps.
      { '@timestamp': { order: 'desc' } },
      { 'event.id': { order: 'desc' } },
    ];
    const history = await client.search<Record<string, ChangeHistoryDocument>>({
      space: spaceId,
      query: { bool: { filter } },
      sort: opts?.sort ?? defaultSort,
      size: opts?.size ?? DEFAULT_RESULT_SIZE,
      from: opts?.from,
    });
    return {
      startDate: this.startDate,
      total: Number((history.hits.total as SearchTotalHits)?.value) || 0,
      items: history.hits.hits.map((h) => h._source).filter((i) => !!i),
    };
  }
}
