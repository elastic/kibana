/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoredInvestigationAttachment } from '../../common/investigation_attachments';
import type { InvestigationAttachmentStorage } from './attachment_doc_service';

/**
 * Waits before each retry of a search that found no available shard. A hidden index created by
 * the first write of a fresh cluster has unassigned shards for a moment; reads in that window
 * retry briefly, then fail.
 */
export const TRANSIENT_SEARCH_RETRY_DELAYS_MS = [200, 400, 800] as const;

interface ElasticsearchErrorCause {
  type?: string;
  root_cause?: ElasticsearchErrorCause[];
  caused_by?: ElasticsearchErrorCause;
  failed_shards?: Array<{ reason?: ElasticsearchErrorCause }>;
}

interface ElasticsearchErrorLike {
  statusCode?: number;
  body?: { error?: ElasticsearchErrorCause };
  meta?: { statusCode?: number; body?: { error?: ElasticsearchErrorCause } };
}

const statusCodeOf = (error: unknown): number | undefined => {
  const candidate = error as ElasticsearchErrorLike | undefined;
  return candidate?.statusCode ?? candidate?.meta?.statusCode;
};

const causeOf = (error: unknown): ElasticsearchErrorCause | undefined => {
  const candidate = error as ElasticsearchErrorLike | undefined;
  return candidate?.body?.error ?? candidate?.meta?.body?.error;
};

/** The error's own type and the types of its root causes, nested causes, and failed shards. */
const errorTypes = (cause: ElasticsearchErrorCause | undefined): string[] => {
  if (!cause) {
    return [];
  }
  return [
    ...(cause.type ? [cause.type] : []),
    ...(cause.root_cause ?? []).flatMap(errorTypes),
    ...errorTypes(cause.caused_by),
    ...(cause.failed_shards ?? []).flatMap(({ reason }) => errorTypes(reason)),
  ];
};

/** The searched index does not exist (yet): an empty result, not a failure. */
export const isIndexNotFoundError = (error: unknown): boolean => {
  const cause = causeOf(error);
  if (cause?.type === 'index_not_found_exception') {
    return true;
  }
  if (cause?.type === 'search_phase_execution_exception') {
    const rootCauses = cause.root_cause ?? [];
    return (
      rootCauses.length > 0 && rootCauses.every(({ type }) => type === 'index_not_found_exception')
    );
  }
  return statusCodeOf(error) === 404;
};

/** No shard of the searched index could answer, as while a new index is allocated. */
export const isShardUnavailableError = (error: unknown): boolean => {
  const cause = causeOf(error);
  if (errorTypes(cause).includes('no_shard_available_action_exception')) {
    return true;
  }
  return cause?.type === 'search_phase_execution_exception' && statusCodeOf(error) === 503;
};

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Wraps an investigation index search for a fresh cluster: a missing index reads as no hits, and
 * a search no shard could answer is retried after each of {@link TRANSIENT_SEARCH_RETRY_DELAYS_MS}
 * before its error is rethrown. Other errors are rethrown at once.
 */
export const withTransientSearchRetry =
  <TStored extends StoredInvestigationAttachment>(
    search: InvestigationAttachmentStorage<TStored>['search']
  ): InvestigationAttachmentStorage<TStored>['search'] =>
  async (...args) => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await search(...args);
      } catch (error) {
        if (isIndexNotFoundError(error)) {
          return { hits: { hits: [] } };
        }
        const delay = TRANSIENT_SEARCH_RETRY_DELAYS_MS[attempt];
        if (delay === undefined || !isShardUnavailableError(error)) {
          throw error;
        }
        await wait(delay);
      }
    }
  };
