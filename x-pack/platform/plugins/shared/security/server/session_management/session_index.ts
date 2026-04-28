/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type {
  AggregateName,
  AggregationsMultiTermsAggregate,
  BulkOperationContainer,
  IndicesCreateRequest,
  MsearchRequestItem,
  SearchHit,
  SortResults,
} from '@elastic/elasticsearch/lib/api/types';
import semver from 'semver';

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AuditLogger } from '@kbn/security-plugin-types-server';
import type { RunContext } from '@kbn/task-manager-plugin/server';

import type { AuthenticationProvider } from '../../common';
import { sessionCleanupConcurrentLimitEvent, sessionCleanupEvent } from '../audit';
import { AnonymousAuthenticationProvider } from '../authentication';
import type { ConfigType } from '../config';
import { getDetailedErrorMessage, getErrorStatusCode } from '../errors';

export interface SessionIndexOptions {
  readonly elasticsearchClient: ElasticsearchClient;
  readonly kibanaIndexName: string;
  readonly config: Pick<ConfigType, 'session' | 'authc'>;
  readonly logger: Logger;
  readonly auditLogger: AuditLogger;
}

/**
 * Filter provided for the `SessionIndex.invalidate` method that determines which session index
 * values should be invalidated (removed from the index). It can have three possible types:
 *   - `all` means that all existing active and inactive sessions should be invalidated.
 *   - `sid` means that only session with the specified SID should be invalidated.
 *   - `query` means that only sessions that match specified query should be invalidated.
 */
export type InvalidateSessionsFilter =
  | { match: 'all' }
  | { match: 'sid'; sid: string }
  | { match: 'query'; query: { provider: { type: string; name?: string }; usernameHash?: string } };

/**
 * Version of the current session index template.
 */
const SESSION_INDEX_TEMPLATE_VERSION = 1;

/**
 * The current version of the session index mappings.
 */
const SESSION_INDEX_MAPPINGS_VERSION = '8.7.0';

/**
 * Name of the session index mappings _meta field storing session index version. Named after a field used for the
 * Elasticsearch security-specific indices with the same purpose.
 */
export const SESSION_INDEX_MAPPINGS_VERSION_META_FIELD_NAME = 'security-version';

/**
 * Number of sessions to remove per batch during cleanup.
 */
const SESSION_INDEX_CLEANUP_BATCH_SIZE = 10_000;

/**
 * Maximum number of batches per cleanup.
 * If the batch size is 10,000 and this limit is 10, then Kibana will remove up to 100k sessions per cleanup.
 */
const SESSION_INDEX_CLEANUP_BATCH_LIMIT = 10;

/**
 * How long the session cleanup search point-in-time should be kept alive.
 */
const SESSION_INDEX_CLEANUP_KEEP_ALIVE = '5m';

/**
 * Returns index settings that are used for the current version of the session index.
 */
export function getSessionIndexSettings({
  indexName,
  aliasName,
}: {
  indexName: string;
  aliasName: string;
}): IndicesCreateRequest {
  return Object.freeze({
    index: indexName,
    settings: {
      number_of_shards: 1,
      number_of_replicas: 0,
      auto_expand_replicas: '0-1',
      priority: 1000,
      hidden: true,
    },
    aliases: {
      [aliasName]: {
        is_write_index: true,
      },
    },
    mappings: {
      dynamic: 'strict' as const,
      _meta: { [SESSION_INDEX_MAPPINGS_VERSION_META_FIELD_NAME]: SESSION_INDEX_MAPPINGS_VERSION },
      properties: {
        usernameHash: { type: 'keyword' as const },
        provider: {
          properties: { name: { type: 'keyword' as const }, type: { type: 'keyword' as const } },
        },
        idleTimeoutExpiration: { type: 'date' as const },
        createdAt: { type: 'date' as const },
        lifespanExpiration: { type: 'date' as const },
        accessAgreementAcknowledged: { type: 'boolean' as const },
        content: { type: 'binary' as const },
      },
    },
  });
}

/**
 * Represents shape of the session value stored in the index.
 */
export interface SessionIndexValue {
  /**
   * Unique session ID.
   */
  sid: string;

  /**
   * Hash of the username. It's defined only if session is authenticated, otherwise session
   * is considered unauthenticated (e.g. intermediate session used during SSO handshake).
   */
  usernameHash?: string;

  /**
   * Name and type of the provider this session belongs to.
   */
  provider: AuthenticationProvider;

  /**
   * The Unix time in ms when the session should be considered expired. If `null`, session will stay
   * active until the browser is closed.
   */
  idleTimeoutExpiration: number | null;

  /**
   * The Unix time in ms which is the max total lifespan of the session. If `null`, session expire
   * time can be extended indefinitely.
   */
  lifespanExpiration: number | null;

  /**
   * The Unix time in ms which is the time when the session was initially created. The missing value indicates that the
   * session was created before `createdAt` was introduced.
   */
  createdAt?: number;

  /**
   * Indicates whether user acknowledged access agreement or not.
   */
  accessAgreementAcknowledged?: boolean;

  /**
   * Content of the session value represented as an encrypted JSON string.
   */
  content: string;

  /**
   * Additional index specific information about the session value.
   */
  metadata: SessionIndexValueMetadata;
}

/**
 * Subset of the `SessionIndexValue` fields required for session cleanup.
 */
type SessionIndexValueDescriptor = Pick<SessionIndexValue, 'sid' | 'usernameHash' | 'provider'>;

/**
 * Additional index specific information about the session value.
 */
interface SessionIndexValueMetadata {
  /**
   * Primary term of the last modification of the document.
   */
  primaryTerm: number;

  /**
   * Sequence number of the last modification of the document.
   */
  sequenceNumber: number;
}

export class SessionIndex {
  /**
   * Name of the index to store session information in.
   */
  private readonly indexName: string;

  /**
   * Name of the write alias to store session information in.
   */
  private readonly aliasName: string;

  /**
   * Promise that tracks session index initialization process. We'll need to get rid of this as soon
   * as Core provides support for plugin statuses (https://github.com/elastic/kibana/issues/41983).
   * With this we won't mark Security as `Green` until index is fully initialized and hence consumers
   * won't be able to call any APIs we provide.
   */
  private indexInitialization?: Promise<void>;

  constructor(private readonly options: Readonly<SessionIndexOptions>) {
    this.indexName = `${this.options.kibanaIndexName}_security_session_${SESSION_INDEX_TEMPLATE_VERSION}`;
    this.aliasName = `${this.options.kibanaIndexName}_security_session`;
  }

  /**
   * Retrieves session value with the specified ID from the index. If session value isn't found
   * `null` will be returned.
   * @param sid Session ID.
   */
  async get(sid: string) {
    try {
      const { body: response, statusCode } =
        await this.options.elasticsearchClient.get<SessionIndexValue>(
          { id: sid, index: this.aliasName },
          { ignore: [404], meta: true }
        );

      const docNotFound = response.found === false;
      const indexNotFound = statusCode === 404;
      if (docNotFound || indexNotFound) {
        this.options.logger.debug('Cannot find session value with the specified ID.');
        return null;
      }

      return {
        ...response._source,
        sid,
        metadata: { primaryTerm: response._primary_term, sequenceNumber: response._seq_no },
      } as Readonly<SessionIndexValue>;
    } catch (err) {
      this.options.logger.error(`Failed to retrieve session value: ${err.message}`);
      throw err;
    }
  }

  /**
   * Creates a new document for the specified session value.
   * @param sessionValue Session index value.
   */
  async create(sessionValue: Readonly<Omit<SessionIndexValue, 'metadata'>>) {
    if (this.indexInitialization) {
      this.options.logger.warn(
        'Attempted to create a new session while session index is initializing.'
      );
      await this.indexInitialization;
    }

    try {
      let { body, statusCode } = await this.writeNewSessionDocument(sessionValue, {
        ignore404: true,
      });

      if (statusCode === 404) {
        this.options.logger.warn(
          'Attempted to create a new session, but session index or alias was missing.'
        );
        await this.ensureSessionIndexExists();
        ({ body, statusCode } = await this.writeNewSessionDocument(sessionValue, {
          ignore404: false,
        }));
        if (statusCode !== 201) {
          this.options.logger.error(
            `Failed to write a new session (status code: ${statusCode}): ${JSON.stringify(body)}.`
          );
        }
      }

      return {
        ...sessionValue,
        metadata: { primaryTerm: body._primary_term, sequenceNumber: body._seq_no },
      } as SessionIndexValue;
    } catch (err) {
      this.options.logger.error(`Failed to create session value: ${err.message}`);
      throw err;
    }
  }

  /**
   * Re-indexes updated session value.
   * @param sessionValue Session index value.
   */
  async update(sessionValue: Readonly<SessionIndexValue>) {
    try {
      let { body: response, statusCode } = await this.updateExistingSessionDocument(sessionValue, {
        ignore404: true,
      });

      if (statusCode === 404) {
        this.options.logger.warn(
          'Attempted to update an existing session, but session index or alias was missing.'
        );
        await this.ensureSessionIndexExists();
        ({ body: response, statusCode } = await this.updateExistingSessionDocument(sessionValue, {
          ignore404: false,
        }));
      }

      // We don't want to override changes that were made after we fetched session value or
      // re-create it if has been deleted already. If we detect such a case we discard changes and
      // return latest copy of the session value instead or `null` if doesn't exist anymore.
      const sessionIndexValueUpdateConflict = statusCode === 409;
      if (sessionIndexValueUpdateConflict) {
        this.options.logger.debug(
          'Cannot update session value due to conflict, session either does not exist or was already updated.'
        );
        return await this.get(sessionValue.sid);
      }

      return {
        ...sessionValue,
        metadata: { primaryTerm: response._primary_term, sequenceNumber: response._seq_no },
      } as SessionIndexValue;
    } catch (err) {
      this.options.logger.error(`Failed to update session value: ${err.message}`);
      throw err;
    }
  }

  /**
   * Clears session value(s) determined by the specified filter.
   * @param filter Filter that narrows down the list of the session values that should be cleared.
   */
  async invalidate(filter: InvalidateSessionsFilter) {
    if (filter.match === 'sid') {
      try {
        // We don't specify primary term and sequence number as delete should always take precedence
        // over any updates that could happen in the meantime.
        const { statusCode } = await this.options.elasticsearchClient.delete(
          { id: filter.sid, index: this.aliasName, refresh: false },
          { ignore: [404], meta: true }
        );

        // 404 means the session with such SID wasn't found and hence nothing was removed.
        return statusCode !== 404 ? 1 : 0;
      } catch (err) {
        this.options.logger.error(`Failed to clear session value: ${err.message}`);
        throw err;
      }
    }

    // If filter is specified we should clear only session values that are matched by the filter.
    // Otherwise all session values should be cleared.
    let deleteQuery;
    if (filter.match === 'query') {
      deleteQuery = {
        bool: {
          must: [
            { term: { 'provider.type': filter.query.provider.type } },
            ...(filter.query.provider.name
              ? [{ term: { 'provider.name': filter.query.provider.name } }]
              : []),
            ...(filter.query.usernameHash
              ? [{ term: { usernameHash: filter.query.usernameHash } }]
              : []),
          ],
        },
      };
    } else {
      deleteQuery = { match_all: {} };
    }

    try {
      const response = await this.options.elasticsearchClient.deleteByQuery({
        index: this.aliasName,
        refresh: false,
        query: deleteQuery,
      });
      return response.deleted as number;
    } catch (err) {
      this.options.logger.error(`Failed to clear session value(s): ${err.message}`);
      throw err;
    }
  }

  /**
   * Initializes index that is used to store session values.
   */
  async initialize() {
    if (this.indexInitialization) {
      return await this.indexInitialization;
    }

    const sessionIndexTemplateName = `${this.options.kibanaIndexName}_security_session_index_template_${SESSION_INDEX_TEMPLATE_VERSION}`;
    return (this.indexInitialization = new Promise<void>(async (resolve, reject) => {
      try {
        // Check if legacy index template exists, and remove it if it does.
        let legacyIndexTemplateExists = false;
        try {
          legacyIndexTemplateExists = await this.options.elasticsearchClient.indices.existsTemplate(
            {
              name: sessionIndexTemplateName,
            }
          );
        } catch (err) {
          // The Template API is deprecated and may become unavailable at some point (404 Not Found). It's also
          // unavailable in the Serverless offering (410 Gone). In either of these cases, we should disregard the error.
          const errorStatusCode = getErrorStatusCode(err);
          if (errorStatusCode !== 404 && errorStatusCode !== 410) {
            this.options.logger.error(
              `Failed to check if session legacy index template exists: ${err.message}`
            );
            return reject(err);
          }
        }

        if (legacyIndexTemplateExists) {
          try {
            await this.options.elasticsearchClient.indices.deleteTemplate({
              name: sessionIndexTemplateName,
            });
            this.options.logger.debug('Successfully deleted session legacy index template.');
          } catch (err) {
            this.options.logger.error(
              `Failed to delete session legacy index template: ${err.message}`
            );
            return reject(err);
          }
        }

        // Check if index template exists.
        let indexTemplateExists = false;
        try {
          indexTemplateExists = await this.options.elasticsearchClient.indices.existsIndexTemplate({
            name: sessionIndexTemplateName,
          });
        } catch (err) {
          this.options.logger.error(
            `Failed to check if session index template exists: ${err.message}`
          );
          return reject(err);
        }

        // Delete index template if it does.
        if (indexTemplateExists) {
          this.options.logger.debug('Deleting unused session index template.');
          try {
            await this.options.elasticsearchClient.indices.deleteIndexTemplate({
              name: sessionIndexTemplateName,
            });
            this.options.logger.debug('Successfully deleted session index template.');
          } catch (err) {
            this.options.logger.error(`Failed to delete session index template: ${err.message}`);
            return reject(err);
          }
        }

        await this.ensureSessionIndexExists();

        // Notify any consumers that are awaiting on this promise and immediately reset it.
        resolve();
      } catch (error) {
        reject(error);
      }
    }).finally(() => {
      this.indexInitialization = undefined;
    }));
  }

  /**
   * Trigger a removal of any outdated session values.
   */
  async cleanUp(taskManagerRunContext: RunContext) {
    const { taskInstance } = taskManagerRunContext;
    const { auditLogger, logger } = this.options;
    logger.debug('Running cleanup routine.');

    let error: Error | undefined;
    let indexNeedsRefresh = false;
    let shardMissingCounter = taskInstance.state?.shardMissingCounter ?? 0;

    try {
      for await (const sessionValues of this.getSessionValuesInBatches()) {
        const operations = sessionValues.map(({ _id, _source }) => {
          const { usernameHash, provider } = _source!;
          auditLogger.log(sessionCleanupEvent({ sessionId: _id!, usernameHash, provider }));
          return { delete: { _id } };
        });

        indexNeedsRefresh = (await this.bulkDeleteSessions(operations)) || indexNeedsRefresh;
      }
    } catch (err) {
      if (
        err instanceof errors.ResponseError &&
        err.statusCode === 503 &&
        err.message.includes('no_shard_available_action_exception')
      ) {
        shardMissingCounter++;
        if (shardMissingCounter < 10) {
          logger.warn(
            `No shards found for session index, skipping session cleanup. This operation has failed ${shardMissingCounter} time(s)`
          );
          return {
            state: {
              shardMissingCounter,
            },
          };
        }

        const errorMesage = `Failed to clean up sessions: Shards for session index are missing. Cleanup routine has failed ${shardMissingCounter} times. ${getDetailedErrorMessage(
          err
        )}`;
        logger.error(errorMesage);
        return {
          error: errorMesage,
          state: {
            shardMissingCounter: 0,
          },
        };
      } else {
        logger.error(`Failed to clean up sessions: ${err.message}`);
        error = err;
      }
    }

    // Only refresh the index if we have actually deleted one or more sessions. The index will auto-refresh eventually anyway, this just
    // ensures that searches after the cleanup process are accurate, and this only impacts integration tests.
    if (indexNeedsRefresh) {
      await this.refreshSessionIndex();
    }

    // Once index refresh is complete we can check if there are sessions left that exceed concurrent sessions limit.
    try {
      indexNeedsRefresh = false;

      const operations = (await this.getSessionsOutsideConcurrentSessionLimit()).map((session) => {
        auditLogger.log(
          sessionCleanupConcurrentLimitEvent({
            sessionId: session.sid,
            usernameHash: session.usernameHash,
            provider: session.provider,
          })
        );
        return { delete: { _id: session.sid } };
      });

      if (operations.length > 0) {
        // Limit max number of documents to delete to 10_000 to avoid massively large delete request payloads (10k batch
        // delete request payload is about 700kb).
        const batchSize = SESSION_INDEX_CLEANUP_BATCH_SIZE;
        for (let i = 0; i < operations.length; i += batchSize) {
          indexNeedsRefresh =
            (await this.bulkDeleteSessions(operations.slice(i, i + batchSize))) ||
            indexNeedsRefresh;
        }
      }
    } catch (err) {
      logger.error(
        `Failed to clean up sessions that exceeded concurrent sessions limit: ${err.message}`
      );
      error = err;
    }

    if (indexNeedsRefresh) {
      await this.refreshSessionIndex();
    }

    if (error) {
      logger.error(`Cleanup routine failed: ${getDetailedErrorMessage(error)}.`);
      // If we couldn't fetch or delete sessions, throw an error so the task will be retried.
      throw error;
    }

    logger.debug('Cleanup routine successfully completed.');
    return {
      state: {
        shardMissingCounter: 0,
      },
    };
  }

  /**
   * Checks whether specific session is within a concurrent sessions limit.
   * @param sessionValue Session index value to check against concurrent sessions limit.
   */
  async isWithinConcurrentSessionLimit(sessionValue: Readonly<SessionIndexValue>) {
    // Concurrent user sessions limit doesn't apply if it's not configured, or session isn't authenticated, or session
    // belongs to the anonymous user.
    const maxConcurrentSessions = this.options.config.session.concurrentSessions?.maxSessions;
    if (
      maxConcurrentSessions == null ||
      !sessionValue.usernameHash ||
      sessionValue.provider.type === AnonymousAuthenticationProvider.type
    ) {
      return true;
    }

    let sessionsOutsideLimit: Array<SearchHit<SessionIndexValue>>;
    try {
      const searchResponse = await this.options.elasticsearchClient.search<SessionIndexValue>({
        index: this.aliasName,

        // Find all sessions created for the same user by the same authentication provider.
        query: {
          bool: {
            filter: [
              { term: { usernameHash: sessionValue.usernameHash } },
              { term: { 'provider.type': sessionValue.provider.type } },
              { term: { 'provider.name': sessionValue.provider.name } },
            ],
          },
        },

        // Sort sessions by creation date in descending order to get the most recent session that's also outside the
        // limit. This query relies on a default value for `missing` sort parameter which is `_last`, meaning that
        // sessions without `createdAt` field ("legacy" sessions) are always considered older than the ones that have
        // this field populated. For example, if the limit is 2 the resulting set might look like this:
        // { createdAt: 3 } <-- the most recent session (within the limit, not returned because of `from`)
        // { createdAt: 2 } <-- the second most recent session (within the limit, not returned because of `from`)
        // { createdAt: 1 } <-- the third most recent session (outside the limit, *returned*)
        // { createdAt: undefined } <--- the oldest "legacy" session (outside the limit, not returned because of `size`)
        sort: [{ createdAt: { order: 'desc' } }],

        // Improve performance by fetching just one field of one outside-the-limit session and not tracking total hits.
        _source_includes: 'createdAt',
        filter_path: 'hits.hits._source',
        from: maxConcurrentSessions,
        size: 1,
        track_total_hits: false,
      });
      sessionsOutsideLimit = searchResponse.hits?.hits ?? [];
    } catch (err) {
      this.options.logger.error(
        `Failed to fetch user sessions to check concurrent sessions limit: ${err.message}.`
      );
      throw err;
    }

    // If all sessions are within the limit, then the provided one should be within the limit as well.
    if (sessionsOutsideLimit.length === 0) {
      return true;
    }

    // If there is any session that is outside the limit and the provided session is "legacy" session (doesn't have a
    // `createdAt` field populated), then we can safely treat it as outside-the-limit session (all "legacy" sessions are
    // treated equally).
    if (!sessionValue.createdAt) {
      return false;
    }

    // If the first outside-the-limit session doesn't have `createdAt` then all other sessions with `createdAt` are
    // within the limit, otherwise the specified session is outside the limit only if it was created before or at the
    // same time as the first outside-the-limit session.
    const [{ _source: sessionOutsideLimit }] = sessionsOutsideLimit;
    return (
      !sessionOutsideLimit?.createdAt || sessionValue.createdAt > sessionOutsideLimit.createdAt
    );
  }

  private async attachAliasToIndex() {
    // Prior to https://github.com/elastic/kibana/pull/134900, sessions would be written directly against the session index.
    // Now, we write sessions against a new session index alias. This call ensures that the alias exists, and is attached to the index.
    // This operation is safe to repeat, even if the alias already exists. This seems safer than retrieving the index details, and inspecting
    // it to see if the alias already exists.
    try {
      await this.options.elasticsearchClient.indices.putAlias({
        index: this.indexName,
        name: this.aliasName,
      });
    } catch (err) {
      this.options.logger.error(`Failed to attach alias to session index: ${err.message}`);
      throw err;
    }
  }

  /**
   * Creates the session index if it doesn't already exist.
   */
  private async ensureSessionIndexExists() {
    // Check if required index exists.
    // It is possible for users to migrate from older versions of Kibana where the session index was created without
    // an alias (pre-8.4). In this case, we need to check if the index exists under the alias name, or the index name.
    // If the index exists under the alias name, we can assume that the alias is already attached.
    let indexExists = false;
    try {
      indexExists =
        (await this.options.elasticsearchClient.indices.exists({ index: this.aliasName })) ||
        (await this.options.elasticsearchClient.indices.exists({ index: this.indexName }));
    } catch (err) {
      this.options.logger.error(`Failed to check if session index exists: ${err.message}`);
      throw err;
    }

    const sessionIndexSettings = getSessionIndexSettings({
      indexName: this.indexName,
      aliasName: this.aliasName,
    });

    // Initialize session index:
    // Ensure the alias is attached to the already existing index and field mappings are up-to-date,
    // or create a new index if it doesn't exist.
    if (!indexExists) {
      try {
        await this.options.elasticsearchClient.indices.create(sessionIndexSettings);
        this.options.logger.debug('Successfully created session index.');
      } catch (err) {
        // There can be a race condition if index is created by another Kibana instance.
        if (err?.body?.error?.type === 'resource_already_exists_exception') {
          this.options.logger.debug('Session index already exists.');
        } else {
          this.options.logger.error(`Failed to create session index: ${err.message}`);
          throw err;
        }
      }

      return;
    }

    const isIndexNameAlias = await this.options.elasticsearchClient.indices.existsAlias({
      name: this.aliasName,
    });

    if (!isIndexNameAlias) {
      this.options.logger.debug(
        'Session index already exists with no alias. Attaching alias to the index.'
      );

      await this.attachAliasToIndex();
    }

    this.options.logger.debug(
      'Session index already exists. Ensuring up-to-date index mappings...'
    );

    let indexMappingsVersion: string | undefined;
    try {
      const indexMappings = await this.options.elasticsearchClient.indices.getMapping({
        index: this.aliasName,
      });
      indexMappingsVersion =
        indexMappings[this.indexName]?.mappings?._meta?.[
          SESSION_INDEX_MAPPINGS_VERSION_META_FIELD_NAME
        ];
    } catch (err) {
      this.options.logger.error(`Failed to retrieve session index metadata: ${err.message}`);
      throw err;
    }

    if (!indexMappingsVersion || semver.lt(indexMappingsVersion, SESSION_INDEX_MAPPINGS_VERSION)) {
      this.options.logger.debug(
        `Updating session index mappings from ${
          indexMappingsVersion ?? 'unknown'
        } to ${SESSION_INDEX_MAPPINGS_VERSION} version.`
      );
      try {
        await this.options.elasticsearchClient.indices.putMapping({
          index: this.aliasName,
          ...sessionIndexSettings.mappings,
        });
        this.options.logger.debug('Successfully updated session index mappings.');
      } catch (err) {
        this.options.logger.error(`Failed to update session index mappings: ${err.message}`);
        throw err;
      }
    }
  }

  private async writeNewSessionDocument(
    sessionValue: Readonly<Omit<SessionIndexValue, 'metadata'>>,
    { ignore404 }: { ignore404: boolean }
  ) {
    const { sid, ...sessionValueToStore } = sessionValue;

    const { body, statusCode } = await this.options.elasticsearchClient.create(
      {
        id: sid,
        // We write to the alias for `create` operations so that we can prevent index auto-creation in the event it is missing.
        index: this.aliasName,
        document: sessionValueToStore,
        refresh: false,
        require_alias: true,
      },
      { meta: true, ignore: ignore404 ? [404] : [] }
    );

    return { body, statusCode };
  }

  private async updateExistingSessionDocument(
    sessionValue: Readonly<SessionIndexValue>,
    { ignore404 }: { ignore404: boolean }
  ) {
    const { sid, metadata, ...sessionValueToStore } = sessionValue;

    const { body, statusCode } = await this.options.elasticsearchClient.index(
      {
        id: sid,
        index: this.aliasName,
        body: sessionValueToStore,
        if_seq_no: metadata.sequenceNumber,
        if_primary_term: metadata.primaryTerm,
        refresh: false,
        require_alias: true,
      },
      { ignore: ignore404 ? [404, 409] : [409], meta: true }
    );

    return { body, statusCode };
  }

  /**
   * Fetches session values from session index in batches of 10,000.
   */
  private async *getSessionValuesInBatches() {
    const now = Date.now();
    const providersSessionConfig = this.options.config.authc.sortedProviders.map((provider) => {
      return {
        boolQuery: {
          bool: {
            must: [
              { term: { 'provider.type': provider.type } },
              { term: { 'provider.name': provider.name } },
            ],
          },
        },
        ...this.options.config.session.getExpirationTimeouts(provider),
      };
    });

    // Always try to delete sessions with expired lifespan (even if it's not configured right now).
    const deleteQueries: object[] = [{ range: { lifespanExpiration: { lte: now } } }];

    // If session belongs to a not configured provider we should also remove it.
    deleteQueries.push({
      bool: {
        must_not: {
          bool: {
            should: providersSessionConfig.map(({ boolQuery }) => boolQuery),
            minimum_should_match: 1,
          },
        },
      },
    });

    for (const { boolQuery, lifespan, idleTimeout } of providersSessionConfig) {
      // If lifespan is configured we should remove any sessions that were created without one.
      if (lifespan) {
        deleteQueries.push({
          bool: { ...boolQuery.bool, must_not: { exists: { field: 'lifespanExpiration' } } },
        });
      }

      // This timeout is intentionally larger than the timeout used in `Session` to update idle
      // timeout in the session index (idleTimeout * 2) to be sure that the session value is
      // definitely expired and may be safely cleaned up.
      const idleIndexCleanupTimeout = idleTimeout ? idleTimeout.asMilliseconds() * 3 : null;
      deleteQueries.push({
        bool: {
          ...boolQuery.bool,
          // If idle timeout is configured we should delete all sessions without specified idle timeout
          // or if that session hasn't been updated for a while meaning that session is expired. Otherwise
          // just delete all expired sessions that were previously created with the idle timeout.
          should: idleIndexCleanupTimeout
            ? [
                { range: { idleTimeoutExpiration: { lte: now - idleIndexCleanupTimeout } } },
                { bool: { must_not: { exists: { field: 'idleTimeoutExpiration' } } } },
              ]
            : [{ range: { idleTimeoutExpiration: { lte: now } } }],
          minimum_should_match: 1,
        },
      });
    }

    let response = await this.options.elasticsearchClient.openPointInTime(
      {
        index: this.aliasName,
        keep_alive: SESSION_INDEX_CLEANUP_KEEP_ALIVE,
        allow_partial_search_results: true,
      },
      { ignore: [404], meta: true }
    );

    if (response.statusCode === 404) {
      await this.ensureSessionIndexExists();
      response = await this.options.elasticsearchClient.openPointInTime(
        {
          index: this.aliasName,
          keep_alive: SESSION_INDEX_CLEANUP_KEEP_ALIVE,
          allow_partial_search_results: true,
        },
        { meta: true }
      );
    } else if (response.statusCode === 503) {
      throw new errors.ResponseError(response);
    }

    const openPitResponse = response.body;
    let pitId = openPitResponse.id;
    try {
      let searchAfter: SortResults | undefined;
      for (let i = 0; i < SESSION_INDEX_CLEANUP_BATCH_LIMIT; i++) {
        const searchResponse = await this.options.elasticsearchClient.search<SessionIndexValue>({
          pit: { id: pitId, keep_alive: SESSION_INDEX_CLEANUP_KEEP_ALIVE },
          _source_includes: 'usernameHash,provider',
          query: { bool: { should: deleteQueries } },
          search_after: searchAfter,
          size: SESSION_INDEX_CLEANUP_BATCH_SIZE,
          sort: '_shard_doc',
          track_total_hits: false, // for performance
        });
        pitId = searchResponse.pit_id ?? pitId;
        const { hits } = searchResponse.hits;
        if (hits.length > 0) {
          yield hits;
          searchAfter = hits[hits.length - 1].sort;
        }
        if (hits.length < SESSION_INDEX_CLEANUP_BATCH_SIZE) {
          break;
        }
      }
    } finally {
      await this.options.elasticsearchClient.closePointInTime({
        id: pitId,
      });
    }
  }

  private async getSessionsOutsideConcurrentSessionLimit(): Promise<SessionIndexValueDescriptor[]> {
    const maxConcurrentSessions = this.options.config.session.concurrentSessions?.maxSessions;
    if (maxConcurrentSessions == null) {
      return [];
    }

    // 1. We need to figure out what users have sessions that exceed the concurrent session limit. For that, we group
    // existing sessions by username and authentication provider.
    const aggResponse = await this.options.elasticsearchClient.search<
      unknown,
      Record<AggregateName, AggregationsMultiTermsAggregate>
    >({
      index: this.aliasName,

      // Exclude unauthenticated sessions and sessions of the anonymous users that shouldn't be affected by the
      // concurrent user sessions limit.
      query: {
        bool: {
          filter: [
            { exists: { field: 'usernameHash' } },
            {
              bool: {
                must_not: [{ term: { 'provider.type': AnonymousAuthenticationProvider.type } }],
              },
            },
          ],
        },
      },

      aggs: {
        sessions_grouped_by_user: {
          multi_terms: {
            // If we have more than 10_000 users that all exceeded the limit (highly unlikely), then the rest of the
            // sessions will be cleaned up during the next run. It doesn't expose Kibana to any security risks since the
            // concurrent sessions limits is enforced on fetch. The `size` is limited by `search.max_buckets` setting
            // which is 65,536 by default, but we don't want to load Elasticsearch too much (response size for 10000
            // buckets is around 1mb).
            size: SESSION_INDEX_CLEANUP_BATCH_SIZE,
            terms: [
              { field: 'usernameHash' },
              { field: 'provider.type' },
              { field: 'provider.name' },
            ],
            // Return only those groups that exceed the limit.
            min_doc_count: maxConcurrentSessions + 1,
          },
        },
      },

      // Improve performance by not tracking total hits, not returning hits themselves (size=0), and fetching only buckets keys.
      size: 0,
      filter_path: [
        'aggregations.sessions_grouped_by_user.sum_other_doc_count',
        'aggregations.sessions_grouped_by_user.buckets.key',
        'aggregations.sessions_grouped_by_user.buckets.doc_count',
      ],
      track_total_hits: false,
    });

    // The reason we check if buckets is an array is to narrow down the type of the response since ES can return buckets as
    // either an array OR a dictionary (aggregation has keys configured for the different buckets, that's not the case here).
    const sessionsGroupedByUser = aggResponse.aggregations?.sessions_grouped_by_user;
    const sessionBuckets = sessionsGroupedByUser?.buckets ?? [];
    if (sessionBuckets.length === 0 || !Array.isArray(sessionBuckets)) {
      return [];
    }

    // Log a warning if we didn't fetch buckets for all users that exceeded the limit.
    const ungroupedSessions = sessionsGroupedByUser?.sum_other_doc_count ?? 0;
    if (ungroupedSessions > 0) {
      this.options.logger.warn(
        `Unable to check if remaining ${ungroupedSessions} sessions exceed the concurrent session limit. Sessions will be checked during the next cleanup job run.`
      );
    }

    // 2. Once we know what users within what authentication providers exceed the concurrent sessions limit, we can
    // fetch specific sessions documents that are outside the limit.
    const { sessionGroups, sessionQueries, skippedSessions } = sessionBuckets.reduce(
      (result, sessionGroup) => {
        // The keys are arrays of values ordered the same ways as expression in the terms parameter of the aggregation.
        const [usernameHash, providerType, providerName] = sessionGroup.key as string[];

        // Record a number of session documents that won't be included in the batch during this run.
        if (sessionGroup.doc_count > SESSION_INDEX_CLEANUP_BATCH_SIZE) {
          result.skippedSessions += sessionGroup.doc_count - SESSION_INDEX_CLEANUP_BATCH_SIZE;
        }

        result.sessionGroups.push({
          usernameHash,
          provider: { type: providerType, name: providerName },
        });

        result.sessionQueries.push(
          {},
          {
            query: {
              bool: {
                must: [
                  { term: { usernameHash } },
                  { term: { 'provider.type': providerType } },
                  { term: { 'provider.name': providerName } },
                ],
              },
            },

            // Sort sessions by creation date in descending order to get the most recent session that's also outside the
            // limit. Refer to comment in `isWithinConcurrentSessionLimit` for the explanation and example.
            sort: [{ createdAt: { order: 'desc' } }],

            // We only need to fetch sessions that exceed the limit.
            from: maxConcurrentSessions,
            size: SESSION_INDEX_CLEANUP_BATCH_SIZE - maxConcurrentSessions,

            // Improve performance by not tracking total hits and not fetching _source since we already have all necessary
            // data returned within aggregation buckets (`usernameHash` and `provider`).
            _source: false,
            track_total_hits: false,
          }
        );

        return result;
      },
      { sessionGroups: [], sessionQueries: [], skippedSessions: 0 } as {
        sessionGroups: Array<Pick<SessionIndexValue, 'usernameHash' | 'provider'>>;
        sessionQueries: MsearchRequestItem[];
        skippedSessions: number;
      }
    );

    // Log a warning if we didn't fetch all sessions that exceeded the limit.
    if (skippedSessions > 0) {
      this.options.logger.warn(
        `Unable to fetch ${skippedSessions} sessions that exceed the concurrent session limit. Sessions will be fetched and invalidated during the next cleanup job run.`
      );
    }

    const { responses } = await this.options.elasticsearchClient.msearch({
      index: this.aliasName,
      searches: sessionQueries,
      filter_path: ['responses.status', 'responses.hits.hits._id'],
    });

    const sessionValueDescriptors = responses.flatMap<SessionIndexValueDescriptor>(
      (response, index) => {
        if ('error' in response) {
          this.options.logger.error(
            `Failed to fetch sessions that exceed the concurrent session limit: ${
              getDetailedErrorMessage(response.error) ??
              response.error.reason ??
              response.error.type
            }.`
          );
          return [];
        }

        return (
          response.hits?.hits?.map((hit) => ({ sid: hit._id!, ...sessionGroups[index] })) ?? []
        );
      }
    );

    this.options.logger.debug(
      `Preparing to delete ${sessionValueDescriptors.length} sessions of ${sessionBuckets.length} unique users due to exceeded concurrent sessions limit.`
    );

    return sessionValueDescriptors;
  }

  /**
   * Performs a bulk delete operation on the Kibana session index.
   * @param deleteOperations Bulk delete operations.
   * @returns Returns `true` if the bulk delete affected any session document.
   */
  private async bulkDeleteSessions(
    deleteOperations: Array<Required<Pick<BulkOperationContainer, 'delete'>>>
  ) {
    if (deleteOperations.length === 0) {
      return false;
    }

    const bulkResponse = await this.options.elasticsearchClient.bulk(
      {
        index: this.aliasName,
        operations: deleteOperations,
        refresh: false,
        // delete operations do not respect `require_alias`, but we include it here for consistency.
        require_alias: true,
      },
      { ignore: [409, 404] }
    );

    if (!bulkResponse.errors) {
      this.options.logger.debug(
        `Cleaned up ${bulkResponse.items.length} invalid or expired sessions.`
      );
      return true;
    }

    const errorCount = bulkResponse.items.reduce(
      (count, item) => (item.delete!.error ? count + 1 : count),
      0
    );
    if (errorCount < bulkResponse.items.length) {
      this.options.logger.warn(
        `Failed to clean up ${errorCount} of ${bulkResponse.items.length} invalid or expired sessions. The remaining sessions were cleaned up successfully.`
      );
      return true;
    }

    this.options.logger.error(
      `Failed to clean up ${bulkResponse.items.length} invalid or expired sessions.`
    );

    return false;
  }

  /**
   * Refreshes Kibana session index. This is used as a part of the session index cleanup job only and hence doesn't
   * throw even if the operation fails.
   */
  private async refreshSessionIndex() {
    try {
      await this.options.elasticsearchClient.indices.refresh({ index: this.aliasName });
      this.options.logger.debug(`Refreshed session index.`);
    } catch (err) {
      this.options.logger.error(`Failed to refresh session index: ${err.message}`);
    }
  }
}
